// server/api/ai/config.get.ts
// 提供當前 AI Provider 配置和模型列表給前端
import { getProviderConfig, isDemoProvider } from '../../utils/ai-provider';
import { defineEventHandler } from 'h3';
import { useRuntimeConfig } from '#imports';

export default defineEventHandler(async (event) => {
  const config = getProviderConfig();
  const appConfig = useRuntimeConfig();
  
  // 取得當前 Provider 名稱
  const currentProvider = (appConfig.aiProvider || 'nvidia') as string;
  
  // 檢查是否為 Demo 模式
  const isDemoMode = isDemoProvider() || appConfig.isDemoMode === true;

  // 準備模型列表（從 config 的 modelUsage.chat 取得）
  const chatModelIds = config.modelUsage?.chat || [];
  const aiModels = chatModelIds.map(id => {
    const info = (config.modelsInfo as any)[id];
    return {
      id,
      name: info?.name || id,
      description: info?.description || '',
      input: info?.input || 0,
      outputText: info?.outputText || 0,
    };
  });

  return {
    currentProvider,
    isDemoMode, // 告知前端是否為 Demo 模式
    providerInfo: {
      provider: config.provider,
      baseUrlEnv: config.baseUrlEnv,
      hasApiKey: !!((appConfig as any)[config.apiKeyEnv]),
    },
    aiModels,
    modelUsage: config.modelUsage,
    modelGuard: config.modelGuard,
  };
});
