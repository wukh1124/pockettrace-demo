import { defineEventHandler, createError } from 'h3';
import { useDB } from '../../db/index';
import { user } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { useRuntimeConfig } from '#imports';
import { nanoid } from 'nanoid';

/**
 * Vercel Cron Job: 清理 Demo 使用者及其相關資料
 * 
 * 安全機制：
 * 1. 檢查 Vercel 自動帶入的 Authorization Bearer Token (CRON_SECRET)
 * 2. 檢查特定的 x-vercel-cron header
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const authHeader = getHeader(event, 'authorization');
  const cronHeader = getHeader(event, 'x-vercel-cron');

  // 1. 安全驗證
  // 在 Vercel 環境中，建議設定 CRON_SECRET 環境變數
  if (process.env.NODE_ENV === 'production') {
    const expectedToken = `Bearer ${process.env.CRON_SECRET}`;
    
    // 如果沒有設定 CRON_SECRET 或是 header 不符合，則拒絕請求
    if (!authHeader || authHeader !== expectedToken) {
      // 如果不是來自 Vercel Cron 的標頭，拋出 401
      if (cronHeader !== '1') {
        throw createError({
          statusCode: 401,
          statusMessage: 'Unauthorized: Invalid Cron Secret',
        });
      }
    }
  }

  const demoEmail = config.demoUserEmail as string;
  if (!demoEmail) {
    return {
      status: 'skipped',
      message: 'Demo user email not configured',
    };
  }

  const db = useDB();

  try {
    // 1. 先找出 Demo 使用者的 ID
    const demoUsers = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, demoEmail))
      .limit(1);

    if (demoUsers.length === 0) {
      return {
        status: 'success',
        message: 'No demo user found, nothing to clean up.',
      };
    }

    const demoId = demoUsers[0].id;
    console.log(`[Cron] 開始清理 Demo 用戶 (${demoId}) 的業務資料...`);

    // 2. 逐表清理 (不刪除 user 和 account)
    // 我們從 schema 導入所有需要的表
    const { 
      notes, trips, apps, subscriptions, 
      chatSessions, chatMessages, aiTokenUsage, aiLogs, 
      verification 
    } = await import('../../db/schema');

    // 執行刪除
    await Promise.all([
      db.delete(notes).where(eq(notes.ownerId, demoId)),
      db.delete(subscriptions).where(eq(subscriptions.userId, demoId)),
      db.delete(trips).where(eq(trips.userId, demoId)),
      db.delete(apps).where(eq(apps.userId, demoId)),
      db.delete(aiTokenUsage).where(eq(aiTokenUsage.userId, demoId)),
      db.delete(aiLogs).where(eq(aiLogs.userId, demoId)),
      db.delete(chatSessions).where(eq(chatSessions.userId, demoId)),
      db.delete(verification).where(eq(verification.identifier, demoEmail)),
    ]);

    // 3. 自動植入展示數據 (各一條精選範例)
    console.log(`[Cron] 正在植入 Demo 展示數據...`);

    await db.batch([
      // 範例應用
      db.insert(apps).values({
        id: nanoid(),
        userId: demoId,
        name: 'PocketTrace GitHub',
        url: 'https://github.com',
        icon: 'https://cdn.simpleicons.org/github?viewbox=auto&size=36',
        orderIndex: 0,
      }),
      // 範例筆記
      db.insert(notes).values({
        id: nanoid(),
        ownerId: demoId,
        title: '✨ 歡迎體驗 PocketTrace',
        content: '# 這是你的第一個數位指揮中心\n\n在這裡，你可以：\n- 📝 **記錄想法**：支援 Markdown 與圖片。\n- ✈️ **規劃旅程**：整合 AI 智能排程。\n- 💰 **追蹤訂閱**：管理你的數位開銷。\n- 🤖 **AI 對話**：與 Gemini 隨時交流。\n\n*這是一條 Demo 範例筆記，每天都會重置喔！*',
        tags: JSON.stringify(['Tutorial', 'Demo']),
        isPinned: true,
      }),
      // 範例訂閱
      db.insert(subscriptions).values({
        id: nanoid(),
        userId: demoId,
        name: 'ChatGPT Plus',
        price: 20.0,
        currency: 'USD',
        cycle: 'monthly',
        nextBillingDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15天後
        color: '#10a37f',
        url: 'https://chat.openai.com',
        notes: 'AI 生產力工具',
      }),
      // 範例行程
      db.insert(trips).values({
        id: nanoid(),
        userId: demoId,
        name: '🇯🇵 東京 5 天 4 夜探險',
        destination: 'Tokyo, Japan',
        summary: '體驗潮流、美食與傳統文化的完美融合',
        startDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        status: 'planning',
        coverImage: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&q=80&w=1000',
        isPublic: true,
      })
    ]);

    console.log(`[Cron] 成功清空並重新植入展示數據。`);
    
    return {
      status: 'success',
      message: `Successfully reset demo user (${demoEmail}). Data cleared and example records inserted.`,
    };


  } catch (error: any) {
    console.error(`[Cron] 清理失敗:`, error);
    throw createError({
      statusCode: 500,
      statusMessage: `Cleanup failed: ${error.message}`,
    });
  }
});
