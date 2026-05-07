import { defineEventHandler, createError, getRouterParam } from 'h3';
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

  const db = useDB();

  await db.delete(chatSessions).where(
    and(
      eq(chatSessions.id, id),
      eq(chatSessions.userId, userId)
    )
  );

  return { success: true };
});
