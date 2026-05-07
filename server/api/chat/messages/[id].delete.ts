import { defineEventHandler, createError, getRouterParam } from 'h3';
import { useDB } from '../../../db/index';
import { chatMessages, chatSessions } from '../../../db/schema';
import { requireAuth } from '../../../utils/session';
import { eq, and } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const sessionAuth = await requireAuth(event);
  const userId = sessionAuth.user.id;
  const id = getRouterParam(event, 'id');
  
  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing message ID' });
  }

  const db = useDB();

  // 驗證訊息所屬的會話是否屬於該用戶
  const messageData = await db.select({
    sessionId: chatMessages.sessionId
  })
  .from(chatMessages)
  .innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
  .where(
    and(
      eq(chatMessages.id, id),
      eq(chatSessions.userId, userId)
    )
  )
  .limit(1);

  if (!messageData.length) {
    throw createError({ statusCode: 404, message: 'Message not found or access denied' });
  }

  await db.delete(chatMessages).where(eq(chatMessages.id, id));

  return { success: true };
});
