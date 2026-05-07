import { defineEventHandler } from 'h3';
import { useDB } from '../../db/index';
import { notes } from '../../db/schema';
import { requireAuth } from '../../utils/session';
import { eq, and } from 'drizzle-orm';

/**
 * DELETE /api/notes/:id
 * 刪除筆記
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

  // 確認筆記存在且屬於該使用者
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

  await db
    .delete(notes)
    .where(and(eq(notes.id, noteId), eq(notes.ownerId, userId)));

  return {
    id: noteId,
    message: '筆記已刪除',
  };
});
