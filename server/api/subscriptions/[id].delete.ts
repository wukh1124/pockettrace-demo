import { defineEventHandler, getRouterParam } from 'h3';
import { useDB } from '../../db/index';
import { subscriptions } from '../../db/schema';
import { requireAuth } from '../../utils/session';
import { eq, and } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event);
  const userId = session.user.id;
  const id = getRouterParam(event, 'id');
  const db = useDB();

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing Subscription ID' });
  }

  const result = await db
    .delete(subscriptions)
    .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, userId)))
    .returning();

  if (!result || result.length === 0) {
    throw createError({ statusCode: 404, message: 'Subscription not found or unauthorized' });
  }

  return { success: true, deletedId: id };
});
