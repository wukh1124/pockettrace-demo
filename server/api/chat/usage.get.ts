import { defineEventHandler, createError } from 'h3';
import { useDB } from '../../db/index';
import { aiTokenUsage } from '../../db/schema';
import { requireAuth } from '../../utils/session';
import { eq, sql } from 'drizzle-orm';
import { useRuntimeConfig } from '#imports';

// Demo 模式的預設統計數據
const DEMO_USAGE_STATS = {
  byModel: [
    {
      model: 'demo-model',
      totalPromptTokens: 5000,
      totalCompletionTokens: 3000,
      totalTokens: 8000,
      totalCost: 0.15,
      count: 25
    },
    {
      model: 'demo-model-v2.5',
      totalPromptTokens: 12000,
      totalCompletionTokens: 8000,
      totalTokens: 20000,
      totalCost: 0.35,
      count: 40
    }
  ],
  total: {
    totalPromptTokens: 17000,
    totalCompletionTokens: 11000,
    totalTokens: 28000,
    totalCost: 0.50,
    count: 65
  }
};

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  
  // Demo 模式：回傳預設統計數據，不查詢資料庫
  if (config.isDemoMode) {
    console.log('[Demo Mode] 回傳預設統計數據');
    return DEMO_USAGE_STATS;
  }

  const sessionAuth = await requireAuth(event);
  const userId = sessionAuth.user.id;

  const db = useDB();

  try {
    // 按模型分組統計 Token 用量
    const stats = await db.select({
      model: aiTokenUsage.model,
      totalPromptTokens: sql<number>`sum(${aiTokenUsage.promptTokens})`,
      totalCompletionTokens: sql<number>`sum(${aiTokenUsage.completionTokens})`,
      totalTokens: sql<number>`sum(${aiTokenUsage.totalTokens})`,
      totalCost: sql<number>`sum(${aiTokenUsage.inputCost} + ${aiTokenUsage.outputCost})`,
      count: sql<number>`count(*)`
    })
    .from(aiTokenUsage)
    .where(eq(aiTokenUsage.userId, userId))
    .groupBy(aiTokenUsage.model);

    // 總計
    const total = await db.select({
      totalPromptTokens: sql<number>`sum(${aiTokenUsage.promptTokens})`,
      totalCompletionTokens: sql<number>`sum(${aiTokenUsage.completionTokens})`,
      totalTokens: sql<number>`sum(${aiTokenUsage.totalTokens})`,
      totalCost: sql<number>`sum(${aiTokenUsage.inputCost} + ${aiTokenUsage.outputCost})`,
      count: sql<number>`count(*)`
    })
    .from(aiTokenUsage)
    .where(eq(aiTokenUsage.userId, userId));

    return {
      byModel: stats,
      total: total[0] || {
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
        totalTokens: 0,
        totalCost: 0,
        count: 0
      }
    };
  } catch (e: any) {
    console.error('Failed to fetch usage stats', e);
    throw createError({ statusCode: 500, message: 'Internal Server Error' });
  }
});
