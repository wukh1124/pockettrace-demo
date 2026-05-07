import { defineEventHandler, readBody } from 'h3';
import { useDB } from '../../db/index';
import { userSettings } from '../../db/schema';
import { requireAuth } from '../../utils/session';

export default defineEventHandler(async (event) => {
  const sessionAuth = await requireAuth(event);
  const userId = sessionAuth.user.id;
  const body = await readBody(event);
  const db = useDB();

  await db.insert(userSettings).values({
    userId,
    model: body.model || '',
    chatTone: body.chatTone || 'normal',
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: userSettings.userId,
    set: {
      model: body.model || '',
      chatTone: body.chatTone || 'normal',
      updatedAt: new Date(),
    }
  });

  return { success: true };
});
