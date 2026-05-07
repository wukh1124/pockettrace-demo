import { getServerSession } from "~~/server/utils/session";
import { useDB } from "~~/server/db";

import { notes, trips, subscriptions, aiTokenUsage } from "~~/server/db/schema";
import { desc, asc, gte, and, lte, eq, or, sql } from "drizzle-orm";


export default defineEventHandler(async (event) => {
  const session = await getServerSession(event);
  if (!session) {
    throw createError({ statusCode: 401, message: "未授權" });
  }

  const userId = session.user.id;
  const db = useDB();
  const now = new Date();
  
  console.log(`[Dashboard Debug] User: ${userId}, Now: ${now.toISOString()}`);

  const fourteenDaysLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  // 1. 最近筆記 (最新 3 篇)
  const recentNotes = await db
    .select()
    .from(notes)
    .where(
      and(
        eq(notes.ownerId, userId), 
        or(eq(notes.isArchived, false), sql`${notes.isArchived} IS NULL`)
      )
    )
    .orderBy(desc(notes.updatedAt))
    .limit(3);

  console.log(`[Dashboard Debug] Found ${recentNotes.length} notes`);

  // 2. 下一個旅程 (即將出發的一個)
  const nextTrip = await db
    .select()
    .from(trips)
    .where(
      and(
        eq(trips.userId, userId), 
        gte(trips.startDate, now)
      )
    )
    .orderBy(asc(trips.startDate))
    .limit(1);

  console.log(`[Dashboard Debug] Found next trip: ${nextTrip[0]?.name || 'None'}`);

  // 3. 快到期的訂閱 (未來 14 天內)
  const expiringSubscriptions = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        gte(subscriptions.nextBillingDate, now),
        lte(subscriptions.nextBillingDate, fourteenDaysLater)
      )
    )
    .orderBy(asc(subscriptions.nextBillingDate));


  console.log(`[Dashboard Debug] Found ${expiringSubscriptions.length} expiring subs`);



  // 4. 今日 AI 統計摘要
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const todayStats = await db
    .select({
      totalTokens: sql<number>`sum(${aiTokenUsage.totalTokens})`,
      totalCost: sql<number>`sum(${aiTokenUsage.inputCost} + ${aiTokenUsage.outputCost})`,
    })
    .from(aiTokenUsage)
    .where(and(eq(aiTokenUsage.userId, userId), gte(aiTokenUsage.createdAt, startOfToday)));


  return {
    recentNotes,
    upcomingTrip: nextTrip[0] || null,
    expiringSubscriptions,
    aiSummary: {
      totalTokens: todayStats[0]?.totalTokens || 0,
      totalCost: todayStats[0]?.totalCost || 0,
    },
  };
});
