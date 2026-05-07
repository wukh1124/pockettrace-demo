import { defineEventHandler, getRouterParam } from 'h3';
import { useDB } from '../../db/index';
import { apps } from '../../db/schema';
import { requireAuth } from '../../utils/session';
import { eq, and } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event);
  const userId = session.user.id;
  const id = getRouterParam(event, 'id');
  const db = useDB();

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing App ID' });
  }

  const result = await db
    .delete(apps)
    .where(and(eq(apps.id, id), eq(apps.userId, userId)))
    .returning();

  if (!result || result.length === 0) {
    throw createError({ statusCode: 404, message: 'App not found or unauthorized' });
  }

  return { success: true, deletedId: id };
});
