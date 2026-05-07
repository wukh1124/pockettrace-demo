import { defineEventHandler, getQuery } from 'h3';
import { useDB } from '../../db/index';
import { notes } from '../../db/schema';
import { requireAuth } from '../../utils/session';
import { eq, and, or, like, desc, asc, sql } from 'drizzle-orm';

/**
 * GET /api/notes
 * 取得當前使用者的筆記列表（帶分頁、排序、篩選）
 */
export default defineEventHandler(async (event) => {
  const session = await requireAuth(event);
  const userId = session.user.id;

  const query = getQuery(event);
  const page = Math.max(1, Number(query.page) || 1);
  const perPage = Math.min(100, Math.max(1, Number(query.perPage) || 10));
  const sortParam = String(query.sort || '-updated');
  const filterParam = String(query.filter || '');

  const db = useDB();

  // --- 排序解析 ---
  const sortDesc = sortParam.startsWith('-');
  const sortField = sortParam.replace(/^[+-]/, '');
  const sortFn = sortDesc ? desc : asc;

  let orderColumn: any;
  switch (sortField) {
    case 'created':
      orderColumn = notes.createdAt;
      break;
    case 'published_at':
      orderColumn = notes.publishedAt;
      break;
    case 'updated':
    default:
      orderColumn = notes.updatedAt;
      break;
  }

  // --- 篩選條件構建 ---
  const conditions: any[] = [eq(notes.ownerId, userId)];
  
  let includeArchived = false;

  if (filterParam) {
    // 解析前端傳來的簡易篩選語法
    // 支援：title ~ "xxx" || content ~ "xxx"、tags ~ "xxx"、updated >= "xxx"、updated <= "xxx"
    const filterParts = filterParam.split('&&').map((p: string) => p.trim());

    for (const part of filterParts) {
      // 搜尋：(title ~ "xxx" || content ~ "xxx")
      const searchMatch = part.match(/\(?\s*title\s*~\s*"([^"]+)"\s*\|\|\s*content\s*~\s*"([^"]+)"\s*\)?/);
      if (searchMatch) {
        const searchTerm = searchMatch[1];
        conditions.push(
          or(
            like(notes.title, `%${searchTerm}%`),
            like(notes.content, `%${searchTerm}%`)
          )
        );
        continue;
      }

      // 標籤篩選：tags ~ "xxx"
      const tagMatch = part.match(/tags\s*~\s*"([^"]+)"/);
      if (tagMatch) {
        const tagValue = tagMatch[1];
        // tags 是 JSON 欄位，用 LIKE 做模糊比對
        conditions.push(like(notes.tags, `%"${tagValue}"%`));
        continue;
      }

      // 日期篩選：updated >= "xxx" 或 updated <= "xxx"
      const dateGteMatch = part.match(/updated\s*>=\s*"([^"]+)"/);
      if (dateGteMatch) {
        const dateStr = dateGteMatch[1];
        const dateMs = new Date(dateStr).getTime();
        if (!isNaN(dateMs)) {
          conditions.push(sql`${notes.updatedAt} >= ${dateMs}`);
        }
        continue;
      }

      const dateLteMatch = part.match(/updated\s*<=\s*"([^"]+)"/);
      if (dateLteMatch) {
        const dateStr = dateLteMatch[1];
        const dateMs = new Date(dateStr).getTime();
        if (!isNaN(dateMs)) {
          conditions.push(sql`${notes.updatedAt} <= ${dateMs}`);
        }
        continue;
      }

      const isArchivedMatch = part.match(/isArchived\s*==\s*(true|false)/);
      if (isArchivedMatch) {
         includeArchived = true;
         conditions.push(eq(notes.isArchived, isArchivedMatch[1] === 'true'));
         continue;
      }
    }
  }

  if (!includeArchived) {
    // 預設不顯示已封存的筆記
    conditions.push(or(eq(notes.isArchived, false), sql`${notes.isArchived} IS NULL`));
  }

  const whereClause = and(...conditions);

  // --- 計算總數 ---
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(notes)
    .where(whereClause);

  const totalItems = Number(countResult[0]?.count || 0);
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const offset = (page - 1) * perPage;

  // --- 查詢筆記 ---
  const items = await db
    .select()
    .from(notes)
    .where(whereClause)
    .orderBy(sortFn(orderColumn))
    .limit(perPage)
    .offset(offset);

  // --- 格式化回傳（與前端 hydrateNotes 期待的格式對齊） ---
  const formattedItems = items.map((item) => ({
    id: item.id,
    title: item.title,
    content: item.content,
    tags: item.tags,
    isPinned: item.isPinned,
    isPublic: item.isPublic,
    isArchived: item.isArchived,
    publishedAt: item.publishedAt?.toISOString() ?? null,
    shareEnabled: item.shareEnabled,
    shareToken: item.shareToken,
    shareExpiresAt: item.shareExpiresAt?.toISOString() ?? null,
    createdAt: item.createdAt?.toISOString() ?? null,
    updatedAt: item.updatedAt?.toISOString() ?? null,
  }));

  return {
    page,
    perPage,
    totalItems,
    totalPages,
    items: formattedItems,
  };
});
