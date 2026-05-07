import { defineEventHandler, readBody, createError } from 'h3';
import { useDB } from '../../../db/index';
import { chatMessages, chatSessions, aiTokenUsage } from '../../../db/schema';
import { requireAuth } from '../../../utils/session';
import { eq, and, asc } from 'drizzle-orm';
import { getProviderConfig, getModelForUsage, calculateTokenCost, estimateTokenCount, isDemoProvider, logDemoUsage, getDemoMockContent } from '../../../utils/ai-provider';
import { useRuntimeConfig } from '#imports';
import { nanoid } from 'nanoid';

export default defineEventHandler(async (event) => {
  const sessionAuth = await requireAuth(event);
  const userId = sessionAuth.user.id;
  const body = await readBody(event);
  const { sessionId } = body;

  if (!sessionId) {
    throw createError({ statusCode: 400, message: 'Missing sessionId' });
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

  // Fetch first few messages for context
  const messages = await db.select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(asc(chatMessages.createdAt))
    .limit(4);

  if (messages.length === 0) {
    return { title: targetSessionArray[0].title };
  }

  const contextText = messages.map(m => `${m.role}: ${m.content}`).join('\n');

  const config = getProviderConfig();
  const modelName = getModelForUsage('summarize');

  // Demo 模式：直接回傳預設標題，並模擬記錄用量
  if (isDemoProvider()) {
    const demoTitle = getDemoMockContent('chat_title');
    
    // 模擬用量記錄
    await logDemoUsage({
      userId,
      sessionId,
      usageType: 'summarize'
    });

    await db.update(chatSessions)
      .set({ title: demoTitle, updatedAt: new Date() })
      .where(eq(chatSessions.id, sessionId));
      
    return { title: demoTitle };
  }

  try {
    const appConfig = useRuntimeConfig();
    const baseUrl = (appConfig as any)[config.baseUrlEnv];
    const apiKey = (appConfig as any)[config.apiKeyEnv];
    
    if (!baseUrl || !apiKey) {
      return { title: targetSessionArray[0].title };
    }

    const prompt = `請根據以下對話內容，產生一個簡短的繁體中文對話標題（不超過 10 個字，直接輸出標題即可，不要包含引號、"標題："或任何解釋性文字）。\n\n對話內容：\n${contextText}`;

    // 準備請求 body（OpenAI 兼容格式）
    const body: any = {
      model: modelName,
      messages: [
        { role: 'user', content: prompt }
      ],
      max_tokens: 50,
      temperature: 0.7,
      stream: false,
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
      // API 失敗時返回原標題
      return { title: targetSessionArray[0].title };
    }

    const data = await response.json();
    let newTitle = data.choices?.[0]?.message?.content || '';
    newTitle = newTitle.trim();

    // Clean up title if it contains quotes
    newTitle = newTitle.replace(/^"|"$/g, '').replace(/^'|'$/g, '');

    // Record token usage - 優先使用 API 回傳，否則手動估算
    let promptTokens = 0;
    let completionTokens = 0;
    let totalTokens = 0;

    if (data.usage && data.usage.prompt_tokens !== undefined) {
      promptTokens = data.usage.prompt_tokens || 0;
      completionTokens = data.usage.completion_tokens || 0;
      totalTokens = data.usage.total_tokens || 0;
    } else {
      // 手動估算
      promptTokens = estimateTokenCount(prompt);
      completionTokens = estimateTokenCount(newTitle || '');
      totalTokens = promptTokens + completionTokens;
    }

    const { inputCost, outputCost } = calculateTokenCost(modelName, promptTokens, completionTokens);

    await db.insert(aiTokenUsage).values({
      id: nanoid(),
      userId,
      sessionId,
      model: modelName,
      promptTokens,
      completionTokens,
      totalTokens,
      inputCost,
      outputCost,
      createdAt: new Date()
    });

    if (newTitle) {
      await db.update(chatSessions)
        .set({ title: newTitle, updatedAt: new Date() })
        .where(eq(chatSessions.id, sessionId));
      
      return { title: newTitle };
    }

    return { title: targetSessionArray[0].title };
  } catch (err: any) {
    console.error("Summarize error:", err);
    // API 連線失敗時返回原標題
    return { title: targetSessionArray[0].title };
  }
});
