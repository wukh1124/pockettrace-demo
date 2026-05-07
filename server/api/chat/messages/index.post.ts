import { defineEventHandler, readBody, createError, setResponseHeader } from 'h3';
import { useDB } from '../../../db/index';
import { chatMessages, chatSessions, aiTokenUsage, userSettings } from '../../../db/schema';
import { requireAuth } from '../../../utils/session';
import { eq, and, asc, gt, inArray, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { getProviderConfig, getModelForUsage, calculateTokenCost, estimateTokenCount, estimateMessagesTokens, isDemoProvider, logDemoUsage } from '../../../utils/ai-provider';
import { useRuntimeConfig } from '#imports';

// Demo 模式的預設回覆
const DEMO_RESPONSE = "這是 Demo 模式的示範回覆\n\n我是您的 AI 助手，目前處於示範模式，無法呼叫真實的 AI API。您可以隨意輸入訊息來體驗聊天功能！\n\n試試看問我一些問題，例如：\n- 今天天氣如何？\n- 推薦一些旅遊景點\n- 如何學好程式設計？";

export default defineEventHandler(async (event) => {
  const sessionAuth = await requireAuth(event);
  const userId = sessionAuth.user.id;

  // 先讀取 body（統一處理，避免重複宣告）
  const body = await readBody(event);
  const { sessionId, content, images } = body;

  // Demo 模式：直接回傳預設回覆，不呼叫真實 AI API
  if (isDemoProvider()) {
    setResponseHeader(event, 'Content-Type', 'text/event-stream');
    setResponseHeader(event, 'Cache-Control', 'no-cache');
    setResponseHeader(event, 'Connection', 'keep-alive');

    // Demo 模式下不儲存到資料庫，避免 Foreign Key 報錯
    // 但我們記錄模擬用量到 aiTokenUsage
    await logDemoUsage({
      userId,
      sessionId,
      usageType: 'chat'
    });
    // 因為 sessionId 可能是 mock 的 (demo-session-xxx)

    const encoder = new TextEncoder();
    return new ReadableStream({
      start(controller) {
        // 將回覆分段發送（純文字流，前端不解析 SSE data: 格式）
        const chunks = DEMO_RESPONSE.split('');
        let index = 0;

        const sendChunk = () => {
          if (index < chunks.length) {
            // 直接發送文字內容，不加 data: 前綴
            controller.enqueue(encoder.encode(chunks[index]));
            index++;
            setTimeout(sendChunk, 15); // 稍微加慢一點點，更有 AI 感覺
          } else {
            // 結束串流
            controller.close();
          }
        };

        sendChunk();
      }
    });
  }

  // 非 demo 模式：繼續原本的處理邏輯
  if (!sessionId || (!content && (!images || images.length === 0))) {
    throw createError({ statusCode: 400, message: 'Missing sessionId, content or images' });
  }

  const db = useDB();

  // Validate session ownership
  const targetSessionArray = await db.select().from(chatSessions).where(
    and(
      eq(chatSessions.id, sessionId),
      eq(chatSessions.userId, userId)
    )
  ).limit(1);

  if (!targetSessionArray.length) {
    throw createError({ statusCode: 404, message: 'Session not found' });
  }

  const targetSession = targetSessionArray[0];

  const appConfig = useRuntimeConfig();
  const config = getProviderConfig();
  let modelName = targetSession.model || getModelForUsage('chat');

  // ================= Budget Validation Guard =================
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const dailyQuery = await db.select({ total: sql<number>`sum(${aiTokenUsage.inputCost} + ${aiTokenUsage.outputCost})` })
    .from(aiTokenUsage)
    .where(gt(aiTokenUsage.createdAt, startOfDay));
  const dailyCost = dailyQuery[0]?.total || 0;
  if (dailyCost >= config.modelGuard.totalDailyBudget) {
    throw createError({ statusCode: 403, message: '全站每日 AI 花費額度已達上限' });
  }

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const monthlyQuery = await db.select({ total: sql<number>`sum(${aiTokenUsage.inputCost} + ${aiTokenUsage.outputCost})` })
    .from(aiTokenUsage)
    .where(and(eq(aiTokenUsage.userId, userId), gt(aiTokenUsage.createdAt, startOfMonth)));
  const userMonthlyCost = monthlyQuery[0]?.total || 0;
  if (userMonthlyCost >= config.modelGuard.userMonthlyLimit) {
    throw createError({ statusCode: 403, message: '您的本月 AI 花費額度已達上限' });
  }
  // ==========================================================

  const settingsItems = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);
  const userChatSettings = settingsItems.length > 0 ? settingsItems[0] : { chatTone: 'normal' };

  let systemInstructionText = "你是一個有用、友善的 AI 助手。請用繁體中文回答。";
  if (userChatSettings.chatTone === 'professional') {
    systemInstructionText = "你是一個專業、嚴肅的AI助手。你的回答應該客觀、精確，避免多餘的寒暄。請用繁體中文回答。";
  } else if (userChatSettings.chatTone === 'concise') {
    systemInstructionText = "你精簡地回答問題，直接切入重點，不需要冗長的解釋。請用繁體中文回答。";
  } else if (userChatSettings.chatTone === 'lively') {
    systemInstructionText = "你是一個活潑、有趣且充滿活力的AI助手，用幽默、輕鬆帶emoji的方式與人對話。請用繁體中文回答。";
  }

  const now = new Date();
  await db.update(chatSessions).set({ updatedAt: now }).where(eq(chatSessions.id, sessionId));

  // Insert user message
  const userMessageId = nanoid();
  const userMessage = {
    id: userMessageId,
    sessionId,
    role: 'user' as const,
    content,
    images: images || null,
    model: modelName,
    createdAt: now,
  };
  await db.insert(chatMessages).values(userMessage);

  // Fetch history for context
  const historyItems = await db.select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(asc(chatMessages.createdAt));

  let currentHistory = [...historyItems];
  const compConfig = config.modelGuard.historyCompression;

  if (currentHistory.length > compConfig.forceTruncateAfter) {
    const toDrop = currentHistory.length - compConfig.forceTruncateAfter;
    const idsToDelete = currentHistory.slice(0, toDrop).map(m => m.id);
    await db.delete(chatMessages).where(inArray(chatMessages.id, idsToDelete));
    currentHistory = currentHistory.slice(toDrop);
  }

  // 準備 OpenAI 兼容 API 的 messages 格式
  const messages: Array<{ role: string; content: string }> = [];
  
  // 加入系統提示
  messages.push({ role: 'system', content: systemInstructionText });
  
  // 加入歷史對話
  currentHistory.forEach(msg => {
    messages.push({
      role: msg.role === 'ai' ? 'assistant' : msg.role,
      content: msg.content
    });
  });

  // 取得 API 憑證
  const baseUrl = (appConfig as any)[config.baseUrlEnv];
  const apiKey = (appConfig as any)[config.apiKeyEnv];
  
  if (!baseUrl || !apiKey) {
    throw createError({ statusCode: 500, message: 'AI Provider API 未正確配置' });
  }

  // Streaming Response Header
  setResponseHeader(event, 'Content-Type', 'text/event-stream');
  setResponseHeader(event, 'Cache-Control', 'no-cache');
  setResponseHeader(event, 'Connection', 'keep-alive');

  const encoder = new TextEncoder();
  
  return new ReadableStream({
    async start(controller) {
      try {
        // 準備請求 body
        const body: any = {
          model: modelName,
          messages: messages,
          max_tokens: Math.min(config.modelGuard.defaultMaxOutputTokens, 8192),
          stream: true,
          temperature: 0.7,
        };

        // 準備 headers
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        };

        // OpenRouter 特殊 headers
        if (config.provider === 'openrouter' && config.openrouterHeaders) {
          Object.assign(headers, config.openrouterHeaders);
        }

        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API 請求失敗 (${response.status}): ${errorText}`);
        }

        if (!response.body) {
          throw new Error('API 回應沒有 body');
        }

        // 解析 SSE 串流
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = '';
        let usage: any = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              // 串流結束
              break;
            }

            try {
              const json = JSON.parse(data);
              const content = json.choices?.[0]?.delta?.content;
              if (content) {
                fullText += content;
                controller.enqueue(encoder.encode(content));
              }
              
              // 部分 Provider 會在最後一個 chunk 回傳 usage
              if (json.usage) {
                usage = json.usage;
              }
            } catch (e) {
              // 忽略無法解析的資料
            }
          }
        }

        // After stream finished, save to DB
        const aiMessageId = nanoid();
        await db.insert(chatMessages).values({
          id: aiMessageId,
          sessionId,
          role: 'ai',
          content: fullText || '模型沒有回傳內容',
          model: modelName,
          createdAt: new Date()
        });

        // Record usage - 優先使用 API 回傳的 usage，否則手動估算
        let promptTokens = 0;
        let completionTokens = 0;

        if (usage && usage.prompt_tokens !== undefined) {
          // API 有回傳 usage
          promptTokens = usage.prompt_tokens || 0;
          completionTokens = usage.completion_tokens || 0;
        } else {
          // 手動估算 token 用量
          promptTokens = estimateMessagesTokens(messages);
          completionTokens = estimateTokenCount(fullText || '');
        }

        const totalTokens = promptTokens + completionTokens;
        const { inputCost, outputCost } = calculateTokenCost(modelName, promptTokens, completionTokens);

        await db.insert(aiTokenUsage).values({
          id: nanoid(), userId, sessionId, model: modelName,
          promptTokens, completionTokens, totalTokens,
          inputCost, outputCost, createdAt: new Date()
        });

        controller.close();
      } catch (err: any) {
        console.error("Stream error:", err);
        // API 連線失敗時回傳友善訊息
        const errorMsg = (err.message || '').includes('fetch') || (err.message || '').includes('Failed')
          ? '\n[服務未開放，請稍後再試]'
          : `\n[ERROR]: ${err.message || '未知錯誤'}`;
        controller.enqueue(encoder.encode(errorMsg));
        controller.close();
      }
    }
  });
});
