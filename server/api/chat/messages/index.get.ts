import { defineEventHandler, getQuery, createError } from 'h3';
import { useDB } from '../../../db/index';
import { chatMessages, chatSessions } from '../../../db/schema';
import { requireAuth } from '../../../utils/session';
import { eq, and, asc } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const sessionAuth = await requireAuth(event);
  const userId = sessionAuth.user.id;
  const query = getQuery(event);
  const sessionId = String(query.sessionId || '');

  if (!sessionId) {
    throw createError({ statusCode: 400, message: 'Missing sessionId' });
  }

  const db = useDB();

  const targetSession = await db.select().from(chatSessions).where(
    and(
      eq(chatSessions.id, sessionId),
      eq(chatSessions.userId, userId)
    )
  ).limit(1);

  if (!targetSession.length) {
    throw createError({ statusCode: 404, message: 'Session not found' });
  }

  const messages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(asc(chatMessages.createdAt));

  return messages;
});
