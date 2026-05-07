import { defineEventHandler } from 'h3';
import { useDB } from '../../../db/index';
import { chatSessions } from '../../../db/schema';
import { requireAuth } from '../../../utils/session';
import { eq, desc } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event);
  const userId = session.user.id;
  const db = useDB();

  const sessions = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.userId, userId))
    .orderBy(desc(chatSessions.updatedAt));

  return sessions;
});
