import { defineEventHandler, readBody, createError } from 'h3';
import { requireAuth } from '../../utils/session';
import { getProviderConfig, getModelForUsage, calculateTokenCost, estimateTokenCount, estimateMessagesTokens, isDemoProvider, logDemoUsage } from '../../utils/ai-provider';
import { useRuntimeConfig } from '#imports';
import { useDB } from '../../db/index';
import { aiTokenUsage, aiLogs } from '../../db/schema';
import { nanoid } from 'nanoid';

// Demo 模式的預設行程資料
const DEMO_TRIP_DATA = {
  name: '東京五日自由行（Demo 示範）',
  destination: '日本東京',
  startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 一週後
  endDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 12 天後
  flights: [
    {
      airline: '長榮航空',
      flightNumber: 'BR192',
      departureTime: '08:30',
      arrivalTime: '12:45',
      departureAirport: '台北桃園國際機場 (TPE)',
      arrivalAirport: '東京成田國際機場 (NRT)'
    },
    {
      airline: '長榮航空',
      flightNumber: 'BR191',
      departureTime: '14:30',
      arrivalTime: '17:20',
      departureAirport: '東京成田國際機場 (NRT)',
      arrivalAirport: '台北桃園國際機場 (TPE)'
    }
  ],
  itinerary: [
    {
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: [
        {
          timeSlot: 'afternoon',
          timeString: '14:00',
          activity: '抵達東京成田機場',
          location: '成田國際機場',
          notes: '辦理入境手續，領取行李'
        },
        {
          timeSlot: 'evening',
          timeString: '18:00',
          activity: '前往飯店check-in',
          location: '新宿區飯店',
          notes: '搭乘成田特快 N\'EX 到新宿站'
        }
      ]
    },
    {
      date: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: [
        {
          timeSlot: 'morning',
          timeString: '09:00',
          activity: '參觀淺草寺',
          location: '淺草寺',
          notes: '東京最古老的寺廟，記得抽籤'
        },
        {
          timeSlot: 'afternoon',
          timeString: '14:00',
          activity: '逛逛晴空塔',
          location: '東京晴空塔',
          notes: '世界最高的電波塔，展望台景觀絕佳'
        }
      ]
    }
  ]
};

export default defineEventHandler(async (event) => {
  const sessionAuth = await requireAuth(event);
  const userId = sessionAuth.user.id;
  const body = await readBody(event);
  const userPrompt = body.prompt;

  if (!userPrompt) {
    throw createError({ statusCode: 400, message: 'Prompt is required' });
  }

  // Demo 模式：直接回傳預設行程，不呼叫真實 AI API
  if (isDemoProvider()) {
    console.log('[Demo Mode] 回傳預設行程資料');
    
    // 模擬用量記錄
    await logDemoUsage({
      userId,
      usageType: 'trip'
    });

    return DEMO_TRIP_DATA;
  }

  const appConfig = useRuntimeConfig();
  const config = getProviderConfig();
  const modelName = getModelForUsage('trip');

  // 取得 API 憑證
  const baseUrl = (appConfig as any)[config.baseUrlEnv];
  const apiKey = (appConfig as any)[config.apiKeyEnv];
  
  if (!baseUrl || !apiKey) {
    throw createError({ statusCode: 500, message: 'AI Provider API 未正確配置' });
  }

  const systemInstructionText = `
你是一位專業的旅遊規劃助理。請根據使用者的需求，規劃一份完整的旅遊計畫，並且務必直接回傳一個有效的 JSON 格式資料，不要包含其他文字或 Markdown 語法。

JSON Schema 如下：
{
  "name": "旅程名稱 字串",
  "destination": "目的地 字串",
  "startDate": "開始日期 (YYYY-MM-DD)",
  "endDate": "結束日期 (YYYY-MM-DD)",
  "flights": [
    {
      "airline": "航空公司名稱",
      "flightNumber": "航班代號 (例如 BR192)",
      "departureTime": "出發時間 (HH:mm)",
      "arrivalTime": "抵達時間 (HH:mm)",
      "departureAirport": "出發機場名稱或代碼",
      "arrivalAirport": "抵達機場名稱或代碼"
    }
  ],
  "itinerary": [
    {
      "date": "該天日期 (YYYY-MM-DD)",
      "items": [
        {
          "timeSlot": "morning" | "afternoon" | "evening",
          "timeString": "時間 (HH:mm)",
          "activity": "活動名稱",
          "location": "地點名稱",
          "notes": "額外備註或小提醒 (可選)"
        }
      ]
    }
  ]
}

注意：
- timeSlot 只能是 'morning', 'afternoon', 或 'evening'。每天的活動請按時段分佈。
- 若使用者沒有提供具體的日期或時間，請自行安排合理的假設日期或時間，以符合邏輯。
`;

  const startTime = Date.now();
  let aiLogId = nanoid();

  try {
    // 準備請求 body（OpenAI 兼容格式）
    const body: any = {
      model: modelName,
      messages: [
        { role: 'system', content: systemInstructionText },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' }, // OpenAI JSON 模式
      temperature: 0.7,
      max_tokens: 8192,
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

    const data = await response.json();
    const latencyMs = Date.now() - startTime;
    
    // OpenAI 格式：data.choices[0].message.content
    let rawJson = data.choices?.[0]?.message?.content || '{}';
    
    // Remove markdown if AI misbehaves
    rawJson = rawJson.replace(/```json\n?/g, '').replace(/```/g, '').trim();

    const parsedData = JSON.parse(rawJson);

    const db = useDB();

    // 1. Record Detailed Log
    await db.insert(aiLogs).values({
      id: aiLogId,
      userId,
      type: 'trip_generation',
      model: modelName,
      prompt: userPrompt,
      systemInstruction: systemInstructionText,
      response: rawJson,
      latencyMs,
      createdAt: new Date()
    });

    // 2. Record token usage - 優先使用 API 回傳，否則手動估算
    let promptTokens = 0;
    let completionTokens = 0;
    let totalTokens = 0;

    if (data.usage && data.usage.prompt_tokens !== undefined) {
      // API 有回傳 usage
      promptTokens = data.usage.prompt_tokens || 0;
      completionTokens = data.usage.completion_tokens || 0;
      totalTokens = data.usage.total_tokens || 0;
    } else {
      // 手動估算 token 用量
      const messages = [
        { role: 'system', content: systemInstructionText },
        { role: 'user', content: userPrompt }
      ];
      promptTokens = estimateMessagesTokens(messages);
      completionTokens = estimateTokenCount(rawJson || '');
      totalTokens = promptTokens + completionTokens;
    }

    const { inputCost, outputCost } = calculateTokenCost(modelName, promptTokens, completionTokens);
    
    await db.insert(aiTokenUsage).values({
      id: nanoid(), 
      userId, 
      sessionId: null, 
      model: modelName,
      promptTokens, 
      completionTokens, 
      totalTokens,
      inputCost, 
      outputCost, 
      createdAt: new Date()
    });

    return parsedData;
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    console.error('AI API Error:', error);
    
    // API 連線失敗時回傳友善錯誤訊息
    const errorMsg = (error.message || '').includes('fetch') || (error.message || '').includes('Failed')
      ? '服務未開放，請稍後再試或聯絡管理員'
      : '生成行程失敗: ' + (error.message || '未知錯誤');
    
    // Log error to DB too
    try {
      const db = useDB();
      await db.insert(aiLogs).values({
        id: aiLogId,
        userId,
        type: 'trip_generation',
        model: modelName,
        prompt: userPrompt,
        systemInstruction: systemInstructionText,
        error: error.message || 'Unknown Error',
        latencyMs,
        createdAt: new Date()
      });
    } catch (e) {
      console.error('Failed to log AI error:', e);
    }

    throw createError({
      statusCode: 500,
      message: errorMsg
    });
  }
});
