import { defineEventHandler, readBody, getRouterParam } from 'h3';
import { useDB } from '../../db/index';
import { apps } from '../../db/schema';
import { requireAuth } from '../../utils/session';
import { eq, and } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event);
  const userId = session.user.id;
  const id = getRouterParam(event, 'id');
  const db = useDB();
  const body = await readBody(event);

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing App ID' });
  }

  const updateData: any = {
    updatedAt: new Date()
  };

  if (body.name !== undefined) updateData.name = body.name;
  if (body.url !== undefined) updateData.url = body.url;
  if (body.icon !== undefined) updateData.icon = body.icon;
  if (body.orderIndex !== undefined) updateData.orderIndex = body.orderIndex;

  const result = await db
    .update(apps)
    .set(updateData)
    .where(and(eq(apps.id, id), eq(apps.userId, userId)))
    .returning();

  if (!result || result.length === 0) {
    throw createError({ statusCode: 404, message: 'App not found or unauthorized' });
  }

  return result[0];
});
