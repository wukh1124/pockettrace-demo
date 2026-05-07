import { defineEventHandler, readBody } from 'h3';
import { useDB } from '../../db/index';
import { notes } from '../../db/schema';
import { requireAuth } from '../../utils/session';
import { nanoid } from 'nanoid';

/**
 * POST /api/notes
 * 建立新筆記
 */
export default defineEventHandler(async (event) => {
  const session = await requireAuth(event);
  const userId = session.user.id;

  const body = await readBody(event);

  const id = nanoid();
  const now = new Date();

  const db = useDB();

  await db.insert(notes).values({
    id,
    ownerId: userId,
    title: body.title || '未命名',
    content: body.content || '',
    tags: body.tags || [],
    isPinned: body.isPinned ?? false,
    isPublic: body.isPublic ?? false,
    publishedAt: body.publishedAt ? new Date(body.publishedAt) : now,
    shareEnabled: body.shareEnabled ?? false,
    shareToken: body.shareToken || null,
    shareExpiresAt: body.shareExpiresAt ? new Date(body.shareExpiresAt) : null,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id,
    message: '筆記已建立',
  };
});
