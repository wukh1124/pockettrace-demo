import { defineEventHandler, readBody } from 'h3';
import { useDB } from '../../db/index';
import { notes } from '../../db/schema';
import { requireAuth } from '../../utils/session';
import { eq, and } from 'drizzle-orm';

/**
 * PATCH /api/notes/:id
 * 更新筆記（部分更新）
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

  // 先確認筆記存在且屬於該使用者
  const existing = await db
    .select({ id: notes.id })
    .from(notes)
    .where(and(eq(notes.id, noteId), eq(notes.ownerId, userId)))
    .limit(1);

  if (existing.length === 0) {
    throw createError({
      statusCode: 404,
      statusMessage: '找不到該筆記',
    });
  }

  const body = await readBody(event);

  // 只更新有傳入的欄位
  const updateData: Record<string, any> = {
    updatedAt: new Date(),
  };

  if (body.title !== undefined) updateData.title = body.title;
  if (body.content !== undefined) updateData.content = body.content;
  if (body.tags !== undefined) updateData.tags = body.tags;
  if (body.isArchived !== undefined) updateData.isArchived = body.isArchived;
  if (body.isPinned !== undefined) updateData.isPinned = body.isPinned;
  if (body.isPublic !== undefined) updateData.isPublic = body.isPublic;
  if (body.shareEnabled !== undefined) updateData.shareEnabled = body.shareEnabled;
  if (body.shareToken !== undefined) updateData.shareToken = body.shareToken;
  if (body.publishedAt !== undefined) {
    updateData.publishedAt = body.publishedAt ? new Date(body.publishedAt) : null;
  }
  if (body.shareExpiresAt !== undefined) {
    updateData.shareExpiresAt = body.shareExpiresAt ? new Date(body.shareExpiresAt) : null;
  }

  await db
    .update(notes)
    .set(updateData)
    .where(and(eq(notes.id, noteId), eq(notes.ownerId, userId)));

  return {
    id: noteId,
    message: '筆記已更新',
  };
});
