import { defineEventHandler, readBody } from 'h3';
import { useDB } from '../../../db/index';
import { chatSessions } from '../../../db/schema';
import { requireAuth } from '../../../utils/session';
import { isDemoProvider } from '../../../utils/ai-provider';
import { nanoid } from 'nanoid';

export default defineEventHandler(async (event) => {
  // Demo 模式：直接返回 mock session，不存資料庫
  if (isDemoProvider()) {
    return {
      id: 'demo-session-' + Date.now(),
      title: 'Demo 對話',
      model: 'demo-model',
      userId: 'demo-user-id',
      createdAt: new Date().toISOString()
    };
  }

  const sessionAuth = await requireAuth(event);
  const userId = sessionAuth.user.id;
  const body = await readBody(event);
  const db = useDB();

  const newSession = {
    id: nanoid(),
    userId,
    title: body.title || '新對話',
    model: body.model || 'gemini-2.5-flash',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(chatSessions).values(newSession);

  return newSession;
});
