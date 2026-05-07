import { defineEventHandler, readBody } from 'h3';
import { useDB } from '../../db/index';
import { trips } from '../../db/schema';
import { requireAuth } from '../../utils/session';
import { nanoid } from 'nanoid';

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event);
  const userId = session.user.id;
  const body = await readBody(event);
  const id = nanoid();
  const now = new Date();

  const db = useDB();
  
  const tripData = {
    id,
    userId,
    name: body.name || '未命名旅程',
    summary: body.summary || null,
    destination: body.destination || null,
    startDate: body.startDate ? new Date(body.startDate) : null,
    endDate: body.endDate ? new Date(body.endDate) : null,
    status: body.status || 'planning',
    coverImage: body.coverImage || null,
    itinerary: body.itinerary ? JSON.stringify(body.itinerary) : null,
    flights: body.flights ? JSON.stringify(body.flights) : null,
    isPublic: body.isPublic ?? false,
    shareToken: null,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(trips).values(tripData);

  return {
    id: tripData.id,
    userId: tripData.userId,
    name: tripData.name,
    summary: tripData.summary,
    destination: tripData.destination,
    startDate: tripData.startDate?.getTime() || null,
    endDate: tripData.endDate?.getTime() || null,
    status: tripData.status,
    coverImage: tripData.coverImage,
    itinerary: body.itinerary || null,
    flights: body.flights || null,
    isPublic: tripData.isPublic,
    shareToken: tripData.shareToken,
    createdAt: tripData.createdAt.getTime(),
    updatedAt: tripData.updatedAt.getTime(),
  };
});
