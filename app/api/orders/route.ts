import { and, asc, count, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { drinks, events, guests, invitations, orders } from "../../../db/schema";
import { jsonError, now, routeError, sha256 } from "../_lib";

async function resolveGuest(token: string) {
  const db = getDb();
  const [invitation] = await db.select().from(invitations).where(eq(invitations.tokenHash, await sha256(token))).limit(1);
  if (!invitation || invitation.status === "rescinded" || !invitation.guestId) return null;
  const [guest] = await db.select().from(guests).where(eq(guests.id, invitation.guestId)).limit(1);
  const [event] = await db.select().from(events).where(eq(events.id, invitation.eventId)).limit(1);
  return guest && event ? { db, guest, event } : null;
}

function tokenFromRequest(request: Request, payload?: { token?: string }) {
  return payload?.token ?? new URL(request.url).searchParams.get("token") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
}

export async function GET(request: Request) {
  try {
    const token = tokenFromRequest(request);
    const resolved = await resolveGuest(token);
    if (!resolved) return jsonError("A valid invitation token is required.", 401);
    const rows = await resolved.db.select().from(orders).where(eq(orders.guestId, resolved.guest.id)).orderBy(asc(orders.createdAt));
    return Response.json({ event: resolved.event, guest: resolved.guest, orders: rows });
  } catch (error) {
    return jsonError(routeError(error), 500);
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as { token?: string; drinkId?: string; customizations?: Record<string, string> };
    const resolved = await resolveGuest(tokenFromRequest(request, payload));
    if (!resolved) return jsonError("A valid invitation token is required.", 401);
    if (resolved.event.status === "ended" || !resolved.event.orderingEnabled) return jsonError("Ordering is closed for this event.", 409);
    if (resolved.guest.tokenBalance < 1) return jsonError("No coffee tokens remain.", 409);
    if (!payload.drinkId) return jsonError("drinkId is required");
    const [drink] = await resolved.db.select().from(drinks).where(and(eq(drinks.id, payload.drinkId), eq(drinks.eventId, resolved.event.id))).limit(1);
    if (!drink || !drink.available) return jsonError("That drink is unavailable.", 409);
    const [{ value: existingCount }] = await resolved.db.select({ value: count() }).from(orders).where(eq(orders.eventId, resolved.event.id));
    const orderNumber = `A${String(Number(existingCount ?? 0) + 1).padStart(2, "0")}`;
    const timestamp = now();
    const [order] = await resolved.db.insert(orders).values({ id: crypto.randomUUID(), eventId: resolved.event.id, guestId: resolved.guest.id, drinkId: drink.id, orderNumber, customizationsJson: JSON.stringify(payload.customizations ?? {}), status: "queued", createdAt: timestamp }).returning();
    await resolved.db.update(guests).set({ tokenBalance: resolved.guest.tokenBalance - 1, updatedAt: timestamp }).where(eq(guests.id, resolved.guest.id));
    return Response.json({ order, tokensRemaining: resolved.guest.tokenBalance - 1 }, { status: 201 });
  } catch (error) {
    return jsonError(routeError(error), 500);
  }
}
