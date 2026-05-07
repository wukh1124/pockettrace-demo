import { defineEventHandler } from 'h3';
import { useDB } from '../../db/index';
import { trips } from '../../db/schema';
import { requireAuth } from '../../utils/session';
import { eq, desc } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event);
  const userId = session.user.id;

  const db = useDB();

  const items = await db
    .select()
    .from(trips)
    .where(eq(trips.userId, userId))
    .orderBy(desc(trips.createdAt));

  const now = Date.now();

  const formattedItems = items.map((item) => {
    let currentStatus = item.status;
    const startDate = item.startDate ? new Date(item.startDate).getTime() : null;
    const endDate = item.endDate ? new Date(item.endDate).getTime() : null;

    if (startDate && endDate) {
      if (now > endDate) {
        currentStatus = 'completed';
      } else if (now >= startDate && now <= endDate) {
        currentStatus = 'confirmed';
      } else if (now < startDate) {
        currentStatus = 'planning';
      }
    }

    return {
      id: item.id,
      userId: item.userId,
      name: item.name,
      summary: item.summary,
      destination: item.destination,
      startDate: startDate,
      endDate: endDate,
      status: currentStatus,
      coverImage: item.coverImage,
      flights: item.flights ? JSON.parse(String(item.flights)) : null,
      itinerary: item.itinerary ? JSON.parse(String(item.itinerary)) : null,
      isPublic: item.isPublic,
      shareToken: item.shareToken,
      createdAt: item.createdAt ? new Date(item.createdAt).getTime() : null,
      updatedAt: item.updatedAt ? new Date(item.updatedAt).getTime() : null,
    };
  });

  return formattedItems;
});
