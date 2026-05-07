import { defineEventHandler, getRouterParam, createError } from 'h3';
import { useDB } from '../../db/index';
import { trips } from '../../db/schema';
import { requireAuth } from '../../utils/session';
import { eq, and } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event);
  const userId = session.user.id;
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({ statusCode: 400, message: 'ID is required' });
  }

  const db = useDB();

  const existing = await db.select().from(trips).where(and(eq(trips.id, id), eq(trips.userId, userId)));
  if (!existing || existing.length === 0) {
    throw createError({ statusCode: 404, message: 'Trip not found' });
  }

  await db.delete(trips).where(eq(trips.id, id));

  return { success: true, message: 'Trip deleted' };
});
