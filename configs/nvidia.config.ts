// configs/nvidia.config.ts
// NVIDIA NIM 配置（OpenAI 兼容 API）
// 價格單位：USD / 每 100 萬 tokens
// 參考來源：https://build.nvidia.com/ 及各模型定價頁面

export const nvidiaConfig = {
  // Provider 識別
  provider: 'nvidia',
  baseUrlEnv: 'aiNvidiaBaseUrl',
  apiKeyEnv: 'aiNvidiaApiKey',
  defaultModelEnv: 'aiNvidiaModel',

  // 模型資訊
  modelsInfo: {
    'deepseek-ai/deepseek-v4-flash': {
      name: 'DeepSeek V4 Flash (NVIDIA NIM)',
      input: 0.14,         // USD / 1M tokens (來源: DeepSeek 官方)
      outputText: 0.28,    // USD / 1M tokens (來源: DeepSeek 官方)
      maxInput: 1048576,   // 1M tokens context window
      description: '高速推理模型，適合日常對話、程式編寫、快速任務處理',
    },
    'moonshotai/kimi-k2-instruct': {
      name: 'Kimi K2 Instruct (NVIDIA NIM)',
      input: 0.50,         // USD / 1M tokens (來源: AI Cost Index)
      outputText: 2.00,    // USD / 1M tokens (來源: AI Cost Index)
      maxInput: 262144,    // 262K tokens context window
      description: '擅長長文本理解、複雜推理、多輪對話',
    },
    'z-ai/glm4.7': {
      name: 'GLM-4.7 (NVIDIA NIM)',
      input: 0.40,         // USD / 1M tokens (來源: AIComp $0.39)
      outputText: 1.50,    // USD / 1M tokens (來源: AIComp $1.75)
      maxInput: 131072,    // 128K+ tokens context window
      description: '通用大模型，支援中英文混合任務、程式生成',
    },
    'z-ai/glm5': {
      name: 'GLM-5 (NVIDIA NIM)',
      input: 0.72,         // USD / 1M tokens (來源: LLMReference)
      outputText: 2.30,    // USD / 1M tokens (來源: LLMReference)
      maxInput: 204800,    // 200K tokens context window (NVIDIA NIM 頁面)
      description: '新一代通用模型，更強的推理與生成能力',
    },
    'meta/llama-3.2-90b-vision-instruct': {
      name: 'Llama 3.2 90B Vision (NVIDIA NIM)',
      input: 0.15,         // USD / 1M tokens (來源: Bitdeer AI 最低價)
      outputText: 0.45,    // USD / 1M tokens (來源: Bitdeer AI 最低價)
      maxInput: 131072,    // 128K tokens context window
      description: '大型多模態模型，支援圖像理解與視覺問答',
    },
    'meta/llama-3.2-11b-vision-instruct': {
      name: 'Llama 3.2 11B Vision (NVIDIA NIM)',
      input: 0.05,         // USD / 1M tokens (來源: OpenRouter 最低價)
      outputText: 0.05,    // USD / 1M tokens (來源: OpenRouter 最低價)
      maxInput: 131072,    // 128K tokens context window
      description: '輕量多模態模型，支援圖像理解，效能與成本平衡',
    },
    'minimaxai/minimax-m2.5': {
      name: 'MiniMax M2.5 (NVIDIA NIM)',
      input: 0.15,         // USD / 1M tokens (來源: PricePerToken.com)
      outputText: 1.150,    // USD / 1M tokens (來源: PricePerToken.com)
      maxInput: 197000,    // ~197K tokens context window
      description: '大型語言模型，擅長軟體工程、代理工具調用、複雜辦公任務',
    },
    'minimaxai/minimax-m2.7': {
      name: 'MiniMax M2.7 (NVIDIA NIM)',
      input: 0.30,         // USD / 1M tokens (來源: PricePerToken.com)
      outputText: 1.20,    // USD / 1M tokens (來源: PricePerToken.com)
      maxInput: 205000,    // ~205K tokens context window
      description: '大型語言模型，擅長軟體工程、代理工具調用、複雜辦公任務',
    },
  },

  // 不同情況下可使用的模型列表
  modelUsage: {
    chat: [
      'deepseek-ai/deepseek-v4-flash',
      'minimaxai/minimax-m2.5',
      'minimaxai/minimax-m2.7',
      'moonshotai/kimi-k2-instruct',
      'z-ai/glm4.7',
      'z-ai/glm5',
      'meta/llama-3.2-90b-vision-instruct',
      'meta/llama-3.2-11b-vision-instruct'
    ],
    summarize: [
      'deepseek-ai/deepseek-v4-flash',
      'moonshotai/kimi-k2-instruct',
    ],
    analyze: [
      'deepseek-ai/deepseek-v4-flash',
      'z-ai/glm5',
      'meta/llama-3.2-90b-vision-instruct',
    ],
    search: [
      'deepseek-ai/deepseek-v4-flash',
      'moonshotai/kimi-k2-instruct',
    ],
    trip: [
      'meta/llama-3.2-11b-vision-instruct',
      'meta/llama-3.2-90b-vision-instruct',
    ],
    image: [],
    video: [],
    agent: [
      'deepseek-ai/deepseek-v4-flash',
      'moonshotai/kimi-k2-instruct',
      'z-ai/glm5',
    ],
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
      model: 'deepseek-ai/deepseek-v4-flash', // 指定用來做壓縮的模型
      forceTruncateAfter: 50       // 保險機制：若達到 50 條則不摘要直接刪除
    }
  },
} as const;
