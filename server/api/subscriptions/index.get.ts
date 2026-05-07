import { defineEventHandler } from 'h3';
import { useDB } from '../../db/index';
import { subscriptions } from '../../db/schema';
import { requireAuth } from '../../utils/session';
import { eq, asc } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event);
  const userId = session.user.id;
  const db = useDB();

  const items = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .orderBy(asc(subscriptions.nextBillingDate), asc(subscriptions.createdAt));

  return items;
});
