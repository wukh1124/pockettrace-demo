import { defineEventHandler, readBody, getRouterParam } from 'h3';
import { useDB } from '../../db/index';
import { subscriptions } from '../../db/schema';
import { requireAuth } from '../../utils/session';
import { eq, and } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event);
  const userId = session.user.id;
  const id = getRouterParam(event, 'id');
  const db = useDB();
  const body = await readBody(event);

  if (!id) {
    throw createError({ statusCode: 400, message: 'Missing Subscription ID' });
  }

  const updateData: any = {
    updatedAt: new Date()
  };

  if (body.name !== undefined) updateData.name = body.name;
  if (body.price !== undefined) updateData.price = Number(body.price);
  if (body.currency !== undefined) updateData.currency = body.currency;
  if (body.cycle !== undefined) updateData.cycle = body.cycle;
  if (body.nextBillingDate !== undefined) updateData.nextBillingDate = new Date(body.nextBillingDate);
  if (body.url !== undefined) updateData.url = body.url;
  if (body.color !== undefined) updateData.color = body.color;
  if (body.notes !== undefined) updateData.notes = body.notes;

  const result = await db
    .update(subscriptions)
    .set(updateData)
    .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, userId)))
    .returning();

  if (!result || result.length === 0) {
    throw createError({ statusCode: 404, message: 'Subscription not found or unauthorized' });
  }

  return result[0];
});
