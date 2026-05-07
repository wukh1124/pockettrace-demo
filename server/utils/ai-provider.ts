// server/utils/ai-provider.ts
// OpenAI 兼容 API Provider 工具函式
import { createError } from 'h3';
import { useRuntimeConfig } from '#imports';

// 直接匯入 config（ESM 靜態匯入）
import { nvidiaConfig } from '../../configs/nvidia.config';
import { openrouterConfig } from '../../configs/openrouter.config';
import { demoConfig } from '../../configs/demo.config';

// 檢查是否為 Demo 模式
export function isDemoProvider(): boolean {
  const appConfig = useRuntimeConfig();
  return (appConfig.aiProvider || 'demo') === 'demo' || appConfig.isDemoMode === true;
}

// Provider Config 型別定義（與 vertex.config.ts 格式一致）
interface ModelInfo {
  name: string;
  input: number;
  outputText: number;
  maxInput: number;
  description: string;
}

interface ModelUsage {
  chat: string[];
  summarize: string[];
  analyze: string[];
  search: string[];
  trip: string[];
  image: string[];
  video: string[];
  agent: string[];
}

interface ModelGuard {
  totalDailyBudget: number;
  userMonthlyLimit: number;
  defaultMaxOutputTokens: number;
  defaultMaxInputTokens: number;
  historyCompression: {
    strategy: string;
    triggerThreshold: number;
    archiveCount: number;
    summaryMaxLength: number;
    model: string;
    forceTruncateAfter: number;
  };
}

interface ProviderConfig {
  provider: string;
  baseUrlEnv: string;
  apiKeyEnv: string;
  defaultModelEnv: string;
  modelsInfo: Record<string, ModelInfo>;
  modelUsage: ModelUsage;
  modelGuard: ModelGuard;
  openrouterHeaders?: Record<string, string>;
}

// 動態載入 Provider 配置
function loadProviderConfig(): ProviderConfig {
  const appConfig = useRuntimeConfig();
  
  // 優先檢查是否為 Demo 模式
  if (isDemoProvider()) {
    return demoConfig as unknown as ProviderConfig;
  }

  const provider = (appConfig.aiProvider || 'nvidia') as string;

  if (provider === 'openrouter') {
    return openrouterConfig as unknown as ProviderConfig;
  } else {
    // 預設為 nvidia
    return nvidiaConfig as unknown as ProviderConfig;
  }
}

// 取得當前 Provider 配置
export function getProviderConfig(): ProviderConfig {
  return loadProviderConfig();
}

// 根據用途取得模型名稱
export function getModelForUsage(usageType: keyof ModelUsage): string {
  const config = getProviderConfig();
  const models = config.modelUsage[usageType];
  if (models && models.length > 0) {
    return models[0];
  }
  // 回退到預設模型
  const appConfig = useRuntimeConfig();
  return (appConfig as any)[config.defaultModelEnv] || Object.keys(config.modelsInfo)[0];
}

// 取得 API Base URL 和 API Key
function getProviderCredentials() {
  const config = getProviderConfig();
  const appConfig = useRuntimeConfig();
  
  const baseUrl = (appConfig as any)[config.baseUrlEnv];
  const apiKey = (appConfig as any)[config.apiKeyEnv];
  
  if (!baseUrl) {
    throw createError({ statusCode: 500, message: `${config.baseUrlEnv} not configured` });
  }
  if (!apiKey) {
    throw createError({ statusCode: 500, message: `${config.apiKeyEnv} not configured` });
  }
  
  return { baseUrl, apiKey };
}

// 解析 SSE 串流（OpenAI 兼容格式）
// 格式：data: {...}\n\n 或 data: [DONE]\n\n
export function parseSSEResponse(response: Response): ReadableStream {
  const decoder = new TextDecoder();
  
  return new ReadableStream({
    async start(controller) {
      const reader = response.body?.getReader();
      if (!reader) {
        controller.close();
        return;
      }
      
      let buffer = '';
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            // 處理最後剩餘的 buffer
            if (buffer.trim()) {
              processSSEBuffer(buffer, controller);
            }
            break;
          }
          
          buffer += decoder.decode(value, { stream: true });
          
          // 以 \n\n 分隔多個 SSE 事件
          const parts = buffer.split('\n\n');
          // 最後一部分可能不完整，保留到下次
          buffer = parts.pop() || '';
          
          for (const part of parts) {
            processSSEBuffer(part, controller);
          }
        }
      } catch (err: any) {
        controller.enqueue(new TextEncoder().encode(`\n[ERROR]: ${err.message || '串流處理錯誤'}`));
      } finally {
        controller.close();
      }
    }
  });
}

// 處理單個 SSE 事件
function processSSEBuffer(buffer: string, controller: ReadableStreamDefaultController) {
  const lines = buffer.split('\n');
  
  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;
    
    const data = line.slice(6).trim(); // 移除 'data: ' 前綴
    
    if (data === '[DONE]') {
      return; // 串流結束
    }
    
    try {
      const json = JSON.parse(data);
      // OpenAI 格式：choices[0].delta.content
      const content = json.choices?.[0]?.delta?.content;
      if (content) {
        controller.enqueue(new TextEncoder().encode(content));
      }
    } catch (e) {
      // 忽略無法解析的資料
    }
  }
}

// 呼叫 OpenAI 兼容 API（非串流）
export async function callOpenAICompatibleAPI(options: {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  responseFormat?: { type: string };
  systemInstruction?: string;
}) {
  const { baseUrl, apiKey } = getProviderCredentials();
  const config = getProviderConfig();
  
  // 準備請求 body
  const body: any = {
    model: options.model,
    messages: options.systemInstruction 
      ? [{ role: 'system', content: options.systemInstruction }, ...options.messages]
      : options.messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens,
    stream: options.stream ?? false,
  };
  
  if (options.responseFormat) {
    body.response_format = options.responseFormat;
  }
  
  // 準備 headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };
  
  // OpenRouter 特殊 headers
  if (config.provider === 'openrouter' && config.openrouterHeaders) {
    Object.assign(headers, config.openrouterHeaders);
  }
  
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API 請求失敗 (${response.status}): ${errorText}`);
    }
    
    return response;
  } catch (err: any) {
    // 連線失敗時回傳友善錯誤訊息
    throw createError({ 
      statusCode: 503, 
      message: '服務未開放，請稍後再試或聯絡管理員' 
    });
  }
}

// 計算 Token 用量成本（若 API 有回傳 usage）
export function calculateTokenCost(
  modelName: string,
  promptTokens: number,
  completionTokens: number
): { inputCost: number; outputCost: number } {
  const config = getProviderConfig();
  const modelInfo = config.modelsInfo[modelName as keyof typeof config.modelsInfo];
  
  if (!modelInfo) {
    return { inputCost: 0, outputCost: 0 };
  }
  
  const inputCost = (promptTokens / 1_000_000) * modelInfo.input;
  const outputCost = (completionTokens / 1_000_000) * modelInfo.outputText;
  
  return { inputCost, outputCost };
}

// ================= Token 估算函式 =================
// 1 個英文字元約等於 0.3 個 token, 1 個中文字元約等於 0.6 個 token
export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  let englishChars = 0;
  let chineseChars = 0;

  for (const char of text) {
    if (/[\u4e00-\u9fff]/.test(char)) {
      chineseChars++;
    } else if (char.trim() !== '') {
      englishChars++;
    }
  }

  return Math.ceil(englishChars * 0.3 + chineseChars * 0.6);
}

export function estimateMessagesTokens(messages: Array<{ role: string; content: string }>): number {
  return messages.reduce((total, msg) => total + estimateTokenCount(msg.content), 0);
}
// ===========================================================

// ================= Demo 模式專用工具 =================

/**
 * 在 Demo 模式下模擬記錄 Token 使用量
 * 讓統計頁面有數據可以展示
 */
export async function logDemoUsage(options: {
  userId: string;
  sessionId?: string | null;
  usageType: keyof ModelUsage;
}) {
  const { userId, sessionId, usageType } = options;
  const db = (await import('../db/index')).useDB();
  const { aiTokenUsage, chatSessions } = await import('../db/schema');
  const { nanoid } = await import('nanoid');
  const { eq } = await import('drizzle-orm');

  const modelName = getModelForUsage(usageType);
  
  // 檢查 sessionId 是否真的存在於資料庫中，避免外鍵約束錯誤
  let validSessionId: string | null = null;
  if (sessionId) {
    const sessionExists = await db
      .select({ id: chatSessions.id })
      .from(chatSessions)
      .where(eq(chatSessions.id, sessionId))
      .limit(1);
    
    if (sessionExists.length > 0) {
      validSessionId = sessionId;
    }
  }
  
  // 隨機產生一些 Token 數量
  const promptTokens = Math.floor(Math.random() * 500) + 100;
  const completionTokens = Math.floor(Math.random() * 1000) + 200;
  const totalTokens = promptTokens + completionTokens;
  
  const { inputCost, outputCost } = calculateTokenCost(modelName, promptTokens, completionTokens);

  await db.insert(aiTokenUsage).values({
    id: nanoid(),
    userId,
    sessionId: validSessionId, // 使用驗證過的 ID 或 null
    model: `demo-${modelName}`,
    promptTokens,
    completionTokens,
    totalTokens,
    inputCost,
    outputCost,
    createdAt: new Date()
  });
}

/**
 * 取得指定用途的 Demo 預設標題或內容
 */
export function getDemoMockContent(type: 'chat_title' | 'note_summary' | 'cover_url'): string {
  const mocks = {
    chat_title: 'Demo 對話會話',
    note_summary: '這是一篇 Demo 模式下的筆記摘要。重點包含：系統功能展示、UI 效果體驗以及 AI 模擬回覆。',
    cover_url: 'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?auto=format&fit=crop&q=80&w=1200', // 一張通用的漂亮旅遊圖
  };
  return mocks[type] || 'Demo Content';
}
