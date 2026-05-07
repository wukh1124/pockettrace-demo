import { defineEventHandler, readBody } from 'h3';
import { useDB } from '../../db/index';
import { subscriptions } from '../../db/schema';
import { requireAuth } from '../../utils/session';
import { v4 as uuidv4 } from 'uuid';

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event);
  const userId = session.user.id;
  const db = useDB();
  const body = await readBody(event);

  if (!body.name || body.price === undefined) {
    throw createError({ statusCode: 400, message: 'Name and Price are required' });
  }

  const nextBillingDateMs = body.nextBillingDate 
    ? new Date(body.nextBillingDate).getTime() 
    : new Date().getTime();

  const newSub = {
    id: uuidv4(),
    userId,
    name: body.name,
    price: Number(body.price),
    currency: body.currency || 'HKD',
    cycle: body.cycle || 'monthly',
    nextBillingDate: new Date(nextBillingDateMs),
    url: body.url || null,
    color: body.color || null,
    notes: body.notes || null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(subscriptions).values(newSub);

  return newSub;
});
