import { defineEventHandler, createError, getRouterParam, readBody } from 'h3';
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

  const body = await readBody(event);
  if (!body.content) {
    throw createError({ statusCode: 400, message: 'Missing content' });
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

  await db.update(chatMessages)
    .set({ 
      content: body.content,
      // 如果需要，可以在這裡標註為 "已編輯"
    })
    .where(eq(chatMessages.id, id));

  return { success: true };
});
