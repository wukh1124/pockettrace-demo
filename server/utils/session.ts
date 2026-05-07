import { H3Event, createError } from 'h3';
import { auth } from './auth';
import { useRuntimeConfig } from '#imports';
import { useDB } from '../db/index';
import { user, account } from '../db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// Demo 模式快取：避免每次查詢資料庫
let demoUserCache: any = null;

/**
 * 取得 Demo 使用者資訊（從快取或資料庫）
 * 如果不存在，自動建立 demo 使用者
 */
async function getDemoUser() {
  if (demoUserCache) {
    return demoUserCache;
  }

  const config = useRuntimeConfig();
  const demoEmail = config.demoUserEmail as string;
  const demoPassword = config.demoUserPassword as string;
  const db = useDB();

  // 檢查 demo 使用者是否已存在
  let demoUsers = await db
    .select()
    .from(user)
    .where(eq(user.email, demoEmail))
    .limit(1);

  // 如果不存在，自動建立
  if (demoUsers.length === 0) {
    console.log(`[Demo Mode] 建立 Demo 使用者: ${demoEmail}`);
    
    try {
      // 使用 Better Auth API 建立使用者
      const signUpResult = await auth.api.signUpEmail({
        body: {
          email: demoEmail,
          password: demoPassword,
          name: 'Demo User',
        },
      } as any);

      if (signUpResult?.user) {
        demoUsers = [signUpResult.user];
        console.log(`[Demo Mode] Demo 使用者建立成功`);
      }
    } catch (error: any) {
      console.error('[Demo Mode] 建立 Demo 使用者失敗:', error.message);
    }
  }

  if (demoUsers.length > 0) {
    demoUserCache = demoUsers[0];
    return demoUserCache;
  }

  return null;
}

/**
 * 從請求的 headers 中解析 Better Auth session，
 * 回傳當前登入使用者資訊，若未登入則回傳 null。
 * Demo 模式：直接回傳 demo 使用者 session，跳過 cookie 驗證。
 */
export async function getServerSession(event: H3Event) {
  const config = useRuntimeConfig();
  
  // Demo 模式：直接回傳 demo 使用者 session
  if (config.isDemoMode) {
    const demoUser = await getDemoUser();
    if (demoUser) {
      return {
        user: demoUser,
        session: {
          id: 'demo-session',
          userId: demoUser.id,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 一年後過期
        }
      };
    }
  }

  // 一般模式：透過 cookie 驗證
  const session = await auth.api.getSession({
    headers: event.headers,
  });
  return session;
}

/**
 * 要求使用者必須已登入，否則拋出 401 錯誤。
 * 回傳 session 物件（包含 user 與 session 資訊）。
 * Demo 模式：直接回傳 demo 使用者 session，不拋 401。
 */
export async function requireAuth(event: H3Event) {
  const config = useRuntimeConfig();
  
  // Demo 模式：直接回傳 demo 使用者 session
  if (config.isDemoMode) {
    const demoUser = await getDemoUser();
    if (demoUser) {
      return {
        user: demoUser,
        session: {
          id: 'demo-session',
          userId: demoUser.id,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        }
      };
    }
  }

  // 一般模式：檢查 session
  const session = await getServerSession(event);
  if (!session?.user) {
    throw createError({
      statusCode: 401,
      statusMessage: '請先登入',
    });
  }
  return session;
}
