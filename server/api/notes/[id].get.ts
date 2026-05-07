import { defineEventHandler } from 'h3';
import { useDB } from '../../db/index';
import { notes } from '../../db/schema';
import { requireAuth } from '../../utils/session';
import { eq, and } from 'drizzle-orm';

/**
 * GET /api/notes/:id
 * 取得單一筆記（限定擁有者）
 */
export default defineEventHandler(async (event) => {
  const session = await requireAuth(event);
  const userId = session.user.id;
  const noteId = event.context.params?.id;

  if (!noteId) {
    throw createError({
      statusCode: 400,
      statusMessage: '缺少筆記 ID',
    });
  }

  const db = useDB();

  const result = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, noteId), eq(notes.ownerId, userId)))
    .limit(1);

  if (result.length === 0) {
    throw createError({
      statusCode: 404,
      statusMessage: '找不到該筆記',
    });
  }

  const item = result[0];

  return {
    id: item.id,
    title: item.title,
    content: item.content,
    tags: item.tags,
    isPinned: item.isPinned,
    isPublic: item.isPublic,
    isArchived: item.isArchived,
    publishedAt: item.publishedAt?.toISOString() ?? null,
    shareEnabled: item.shareEnabled,
    shareToken: item.shareToken,
    shareExpiresAt: item.shareExpiresAt?.toISOString() ?? null,
    createdAt: item.createdAt?.toISOString() ?? null,
    updatedAt: item.updatedAt?.toISOString() ?? null,
  };
});
