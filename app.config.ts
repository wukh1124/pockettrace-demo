// app.config.ts
// 全域應用程式配置
// AI Provider 配置改由 server/utils/ai-provider.ts 動態載入
export default defineAppConfig({
  // AI Provider 設定（透過環境變數 NUXT_AI_PROVIDER 切換）
  // 可選值：'nvidia' | 'openrouter'
  aiProvider: process.env.NUXT_AI_PROVIDER || 'nvidia',
  
  // 其他全域設定可放此處
})
