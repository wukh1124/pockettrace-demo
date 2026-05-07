// configs/demo.config.ts
// Demo 模式專用配置（模擬模型）
// 這些模型不會產生實際費用，僅供介面展示與體驗

export const demoConfig = {
  // Provider 識別
  provider: 'demo',
  baseUrlEnv: 'aiDemoBaseUrl',
  apiKeyEnv: 'aiDemoApiKey',
  defaultModelEnv: 'aiDemoModel',

  // 模擬模型資訊
  modelsInfo: {
    'demo-gpt-4o': {
      name: 'GPT-4o (Demo)',
      input: 0,
      outputText: 0,
      maxInput: 128000,
      description: 'Demo 模式模擬模型',
    },
    'demo-claude-3.5-sonnet': {
      name: 'Claude 3.5 Sonnet (Demo)',
      input: 0,
      outputText: 0,
      maxInput: 200000,
      description: 'Demo 模式模擬模型',
    },
  },

  // 不同情況下可使用的模型列表
  modelUsage: {
    chat: [
      'demo-gpt-4o',
      'demo-claude-3.5-sonnet'
    ],
    summarize: [
      'demo-gpt-4o'
    ],
    analyze: [
      'demo-gpt-4o'
    ],
    search: [
      'demo-gpt-4o'
    ],
    trip: [
      'demo-gpt-4o'
    ],
    image: [],
    video: [],
    agent: [
      'demo-gpt-4o'
    ],
  },

  // 模型守衛
  modelGuard: {
    totalDailyBudget: 999.0,      // Demo 模式不限制
    userMonthlyLimit: 999.0,
    defaultMaxOutputTokens: 4096,
    defaultMaxInputTokens: 20000,

    // 聊天歷史訊息壓縮設定
    historyCompression: {
      strategy: 'summarize',
      triggerThreshold: 20,
      archiveCount: 15,
      summaryMaxLength: 100,
      model: 'demo-gpt-4o',
      forceTruncateAfter: 50
    }
  },
} as const;
