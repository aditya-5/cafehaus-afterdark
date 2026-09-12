import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { getEventOrderViews } from "../../../../db/read-models";
import { drinks, events, guests, invitations } from "../../../../db/schema";
import { jsonError, requireAdmin, routeError, withoutTokenHash } from "../../_lib";

export async function GET(request: Request) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  try {
    const eventId = new URL(request.url).searchParams.get("eventId")?.trim();
    if (!eventId) return jsonError("eventId is required");

    const db = getDb();
    const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
    if (!event) return jsonError("Event not found.", 404);

    const [guestRows, invitationRows, drinkRows, orderRows] = await Promise.all([
      db.select().from(guests).where(eq(guests.eventId, eventId)).orderBy(asc(guests.firstName)),
      db.select().from(invitations).where(eq(invitations.eventId, eventId)).orderBy(desc(invitations.createdAt)),
      db.select().from(drinks).where(eq(drinks.eventId, eventId)).orderBy(asc(drinks.category), asc(drinks.name)),
      getEventOrderViews(db, eventId),
    ]);

    return Response.json({
      event,
      guests: guestRows,
      invitations: invitationRows.map(withoutTokenHash),
      drinks: drinkRows,
      orders: orderRows,
    });
  } catch (error) {
    return jsonError(routeError(error), 500);
  }
}
