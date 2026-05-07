import { defineEventHandler, readBody } from 'h3';
import { useDB } from '../../db/index';
import { apps } from '../../db/schema';
import { requireAuth } from '../../utils/session';
import { v4 as uuidv4 } from 'uuid';

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event);
  const userId = session.user.id;
  const db = useDB();
  const body = await readBody(event);

  if (!body.name || !body.url) {
    throw createError({ statusCode: 400, message: 'Name and URL are required' });
  }

  const newApp = {
    id: uuidv4(),
    userId,
    name: body.name,
    url: body.url,
    icon: body.icon || null,
    orderIndex: body.orderIndex || 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(apps).values(newApp);

  return newApp;
});
