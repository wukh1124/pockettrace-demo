import { defineEventHandler } from 'h3';
import { useDB } from '../../db/index';
import { userSettings } from '../../db/schema';
import { requireAuth } from '../../utils/session';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const sessionAuth = await requireAuth(event);
  const userId = sessionAuth.user.id;
  const db = useDB();

  const settingsItems = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);

  if (settingsItems.length > 0) {
    return {
      model: settingsItems[0].model || '',
      chatTone: settingsItems[0].chatTone || 'normal'
    };
  }

  return {
    model: '',
    chatTone: 'normal'
  };
});
