// configs/openrouter.config.ts
// OpenRouter 配置（OpenAI 兼容 API）
// 價格單位：USD / 每 100 萬 tokens
// 參考來源：https://openrouter.ai/models/minimax/minimax-m2.5

export const openrouterConfig = {
  // Provider 識別
  provider: 'openrouter',
  baseUrlEnv: 'aiOpenrouterBaseUrl',
  apiKeyEnv: 'aiOpenrouterApiKey',
  defaultModelEnv: 'aiOpenrouterModel',

  // 模型資訊
  modelsInfo: {
    'minimax/minimax-m2.5:free': {
      name: 'MiniMax M2.5 (OpenRouter Free)',
      input: 0,               // USD / 1M tokens (免費版)
      outputText: 0,          // USD / 1M tokens (免費版)
      maxInput: 196608,       // Context window (196K)
      description: '免費版 MiniMax M2.5，支援複雜辦公任務與軟體工程',
    },
    'minimax/minimax-m2.5': {
      name: 'MiniMax M2.5 (OpenRouter)',
      input: 0.118,          // USD / 1M tokens (加權平均)
      outputText: 1.35,       // USD / 1M tokens (加權平均)
      maxInput: 196608,       // Context window (196K)
      description: 'MiniMax M2.5，SOTA 大型語言模型，擅長複雜辦公任務',
    },
    // 可在此加入更多 OpenRouter 模型
  },

  // 不同情況下可使用的模型列表
  modelUsage: {
    chat: ['minimax/minimax-m2.5:free', 'minimax/minimax-m2.5'],
    summarize: ['minimax/minimax-m2.5:free'],
    analyze: ['minimax/minimax-m2.5:free'],
    search: ['minimax/minimax-m2.5:free'],
    trip: ['minimax/minimax-m2.5:free'],
    image: [], // OpenRouter 不支援圖片生成
    video: ['minimax/minimax-m2.5:free'],
    agent: ['minimax/minimax-m2.5:free'],
  },

  // 模型守衛, 用作成本控制
  modelGuard: {
    totalDailyBudget: 50.0,      // 每天總額
    userMonthlyLimit: 5.0,        // 每個用戶每月總額
    // 1 個英文字元等於 0.3 個 token, 1 個中文字元等於 0.6 個 token
    defaultMaxOutputTokens: 8192, // 限制最大輸出 tokens
    defaultMaxInputTokens: 20000,  // 限制最大輸入 tokens

    // 聊天歷史訊息壓縮設定
    historyCompression: {
      strategy: 'summarize',      // 策略名稱：摘要壓縮
      triggerThreshold: 20,        // 觸發閾值：超過 20 條訊息時啟動
      archiveCount: 15,            // 封存數量：將前 15 條丟去壓縮
      summaryMaxLength: 100,       // 摘要限制：產出的摘要字數上限
      model: 'minimax/minimax-m2.5:free', // 指定用來做壓縮的模型
      forceTruncateAfter: 50       // 保險機制：若達到 50 條則不摘要直接刪除
    }
  },

  // OpenRouter 特殊設定（App Attribution）
  openrouterHeaders: {
    'HTTP-Referer': process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    'X-OpenRouter-App': process.env.NUXT_PUBLIC_SITE_NAME || 'Nuxt_AI_Core',
  },
} as const;
