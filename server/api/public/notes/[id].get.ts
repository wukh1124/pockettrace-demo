import { defineEventHandler } from 'h3';
import { useDB } from '../../../db/index';
import { notes } from '../../../db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/public/notes/:id (實際為 shareToken)
 * 使用 shareToken 取得已分享的筆記內容。
 * 必須滿足：shareEnabled = true 且分享未過期。
 */
export default defineEventHandler(async (event) => {
  try {
    const shareToken = event.context.params?.id;

    if (!shareToken) {
      throw createError({
        statusCode: 400,
        statusMessage: '缺少分享權杖',
      });
    }

    const db = useDB();

    const result = await db
      .select()
      .from(notes)
      .where(eq(notes.shareToken, shareToken))
      .limit(1);

    if (result.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: '找不到該分享連結',
      });
    }

    const item = result[0];

    // 檢查分享是否啟用
    if (!item.shareEnabled) {
      throw createError({
        statusCode: 403,
        statusMessage: '此筆記未開啟分享',
      });
    }

    // 檢查分享是否已過期
    if (item.shareExpiresAt && new Date(item.shareExpiresAt) < new Date()) {
      throw createError({
        statusCode: 403,
        statusMessage: '此分享連結已過期',
      });
    }

    return {
      id: item.id,
      title: item.title,
      content: item.content,
      tags: item.tags,
      share_enabled: item.shareEnabled,
      published_at: item.publishedAt?.toISOString() ?? item.updatedAt?.toISOString() ?? null,
      created: item.createdAt?.toISOString() ?? null,
      updated: item.updatedAt?.toISOString() ?? null,
    };
  } catch (error: any) {
    console.error('公開筆記 API 錯誤:', error);
    if (error.statusCode) {
      throw error;
    }
    throw createError({
      statusCode: 500,
      statusMessage: '伺服器錯誤，請稍後再試',
    });
  }
});
