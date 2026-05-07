import { defineEventHandler, readBody, getRouterParam, createError } from 'h3';
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

  // Validate existence and ownership
  const existing = await db.select().from(trips).where(and(eq(trips.id, id), eq(trips.userId, userId)));
  if (!existing || existing.length === 0) {
    throw createError({ statusCode: 404, message: 'Trip not found' });
  }

  const body = await readBody(event);
  const now = new Date();

  const updateData: any = { updatedAt: now };
  if (body.name !== undefined) updateData.name = body.name;
  if (body.summary !== undefined) updateData.summary = body.summary;
  if (body.destination !== undefined) updateData.destination = body.destination;
  if (body.startDate !== undefined) updateData.startDate = body.startDate ? new Date(body.startDate) : null;
  if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null;
  if (body.status !== undefined) updateData.status = body.status;
  if (body.coverImage !== undefined) updateData.coverImage = body.coverImage;
  if (body.itinerary !== undefined) updateData.itinerary = body.itinerary ? JSON.stringify(body.itinerary) : null;
  if (body.flights !== undefined) updateData.flights = body.flights ? JSON.stringify(body.flights) : null;
  if (body.isPublic !== undefined) updateData.isPublic = body.isPublic;

  await db.update(trips).set(updateData).where(eq(trips.id, id));

  const updatedResult = await db.select().from(trips).where(eq(trips.id, id));
  const item = updatedResult[0];

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
