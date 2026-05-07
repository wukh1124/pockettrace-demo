import { defineEventHandler, getRouterParam, createError } from 'h3';
import { useDB } from '../../db/index';
import { trips } from '../../db/schema';
import { requireAuth } from '../../utils/session';
import { eq, and } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event);
  const userId = session.user.id;
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({ statusCode: 400, message: 'ID is required' });
  }

  const db = useDB();

  const result = await db.select().from(trips).where(and(eq(trips.id, id), eq(trips.userId, userId)));

  if (!result || result.length === 0) {
    throw createError({ statusCode: 404, message: 'Trip not found' });
  }

  const item = result[0];
  
  return {
    id: item.id,
    userId: item.userId,
    name: item.name,
    summary: item.summary,
    destination: item.destination,
    startDate: item.startDate ? new Date(item.startDate).getTime() : null,
    endDate: item.endDate ? new Date(item.endDate).getTime() : null,
    status: item.status,
    coverImage: item.coverImage,
    flights: item.flights ? JSON.parse(String(item.flights)) : null,
    itinerary: item.itinerary ? JSON.parse(String(item.itinerary)) : null,
    isPublic: item.isPublic,
    shareToken: item.shareToken,
    createdAt: item.createdAt ? new Date(item.createdAt).getTime() : null,
    updatedAt: item.updatedAt ? new Date(item.updatedAt).getTime() : null,
  };
});
