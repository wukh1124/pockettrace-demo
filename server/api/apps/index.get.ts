import { defineEventHandler } from 'h3';
import { useDB } from '../../db/index';
import { apps } from '../../db/schema';
import { requireAuth } from '../../utils/session';
import { eq, asc } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event);
  const userId = session.user.id;
  const db = useDB();

  const items = await db
    .select()
    .from(apps)
    .where(eq(apps.userId, userId))
    .orderBy(asc(apps.orderIndex), asc(apps.createdAt));

  return items;
});
