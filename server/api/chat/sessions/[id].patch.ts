import { defineEventHandler, createError, getRouterParam, readBody } from 'h3';
import { useDB } from '../../../db/index';
import { chatSessions } from '../../../db/schema';
import { requireAuth } from '../../../utils/session';
import { eq, and } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const sessionAuth = await requireAuth(event);
  const userId = sessionAuth.user.id;
  const id = getRouterParam(event, 'id');
  
  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing session ID' });
  }

  // Demo 模式會話 ID 不存在於資料庫中
  if (id.startsWith('demo-')) {
    return { success: true };
  }

  const body = await readBody(event);
  
  const updateData: any = {
    updatedAt: new Date()
  };
  
  if (body.title !== undefined) updateData.title = body.title;
  if (body.model !== undefined) updateData.model = body.model;

  if (Object.keys(updateData).length <= 1) { // 只有 updatedAt
    throw createError({ statusCode: 400, message: 'Nothing to update' });
  }

  const db = useDB();

  await db.update(chatSessions)
    .set(updateData)
    .where(
      and(
        eq(chatSessions.id, id),
        eq(chatSessions.userId, userId)
      )
    );

  return { success: true };
});
