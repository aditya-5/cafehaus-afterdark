import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { guests } from "../../../../db/schema";
import { jsonError, now, requireAdmin, routeError } from "../../_lib";

export async function POST(request: Request) {
  const authError = requireAdmin(request);
  if (authError) return authError;
  try {
    const payload = await request.json() as { eventId?: string; guestId?: string; action?: "add_one" | "add_all" | "reset_all" | "fulfill_request" };
    if (!payload.eventId || !payload.action) return jsonError("eventId and action are required");
    const db = getDb();
    const timestamp = now();
    if (payload.action === "add_one" || payload.action === "fulfill_request") {
      if (!payload.guestId) return jsonError("guestId is required for this action");
      const [guest] = await db.select().from(guests).where(and(eq(guests.id, payload.guestId), eq(guests.eventId, payload.eventId))).limit(1);
      if (!guest) return jsonError("Guest not found.", 404);
      await db.update(guests).set({ tokenBalance: guest.tokenBalance + 1, tokenRequestStatus: payload.action === "fulfill_request" ? "fulfilled" : guest.tokenRequestStatus, updatedAt: timestamp }).where(eq(guests.id, guest.id));
      return Response.json({ guestId: guest.id, tokenBalance: guest.tokenBalance + 1 });
    }
    const rows = await db.select().from(guests).where(eq(guests.eventId, payload.eventId));
    for (const guest of rows) {
      await db.update(guests).set({ tokenBalance: payload.action === "reset_all" ? 2 : guest.tokenBalance + 1, tokenRequestStatus: payload.action === "reset_all" ? "fulfilled" : guest.tokenRequestStatus, updatedAt: timestamp }).where(eq(guests.id, guest.id));
    }
    return Response.json({ updatedGuests: rows.length, action: payload.action });
  } catch (error) {
    return jsonError(routeError(error), 500);
  }
}
