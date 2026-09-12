import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { drinks, events, guests, invitations, orders } from "../../../db/schema";
import { getEventOrderViews } from "../../../db/read-models";
import { invitationAccessCondition, jsonError, now, routeError } from "../_lib";

async function resolveGuest(token: string) {
  const db = getDb();
  const [invitation] = await db.select().from(invitations).where(await invitationAccessCondition(token)).limit(1);
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
    const globalOrders = await getEventOrderViews(resolved.db, resolved.event.id);
    return Response.json({
      event: resolved.event,
      guest: resolved.guest,
      orders: globalOrders.filter((order) => order.guestId === resolved.guest.id),
      globalOrders,
    });
  } catch (error) {
    return jsonError(routeError(error), 500);
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as { token?: string; drinkId?: string; customizations?: Record<string, string> };
    const resolved = await resolveGuest(tokenFromRequest(request, payload));
    if (!resolved) return jsonError("A valid invitation token is required.", 401);
    if (resolved.event.status === "ended" || !resolved.event.orderingEnabled || !["open", "last_orders"].includes(resolved.event.serviceMode)) return jsonError("Ordering is closed for this event.", 409);
    if (resolved.guest.rsvpResponse !== "yes") return jsonError("Only accepted guests can place orders.", 409);
    if (resolved.guest.tokenBalance < 1) return jsonError("No coffee tokens remain.", 409);
    if (!payload.drinkId) return jsonError("drinkId is required");
    const [drink] = await resolved.db.select().from(drinks).where(and(eq(drinks.id, payload.drinkId), eq(drinks.eventId, resolved.event.id))).limit(1);
    if (!drink || !drink.available) return jsonError("That drink is unavailable.", 409);
    const customizations = Object.fromEntries(Object.entries(payload.customizations ?? {}).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
    if (customizations.milk === "Oat milk" && !resolved.event.oatMilkAvailable) return jsonError("Oat milk is unavailable tonight.", 409);
    if (customizations.caffeine === "Decaf" && !resolved.event.decafAvailable) return jsonError("Decaf is unavailable tonight.", 409);
    const timestamp = now();
    const orderId = crypto.randomUUID();
    const placement = await resolved.db.execute(sql`
      WITH allocated_event AS (
        UPDATE events
        SET next_order_number = next_order_number + 1, updated_at = ${timestamp}
        WHERE id = ${resolved.event.id}
          AND status <> 'ended'
          AND ordering_enabled = true
          AND service_mode IN ('open', 'last_orders')
          AND (${customizations.milk !== "Oat milk"} OR oat_milk_available = true)
          AND (${customizations.caffeine !== "Decaf"} OR decaf_available = true)
        RETURNING next_order_number
      ),
      debited_guest AS (
        UPDATE guests
        SET token_balance = token_balance - 1, updated_at = ${timestamp}
        WHERE id = ${resolved.guest.id}
          AND event_id = ${resolved.event.id}
          AND rsvp_response = 'yes'
          AND token_balance > 0
          AND EXISTS (SELECT 1 FROM allocated_event)
        RETURNING token_balance
      ),
      inserted_order AS (
        INSERT INTO orders (id, event_id, guest_id, drink_id, order_number, customizations_json, status, created_at)
        SELECT
          ${orderId},
          ${resolved.event.id},
          ${resolved.guest.id},
          ${drink.id},
          'A' || LPAD(allocated_event.next_order_number::text, 2, '0'),
          ${JSON.stringify(customizations)},
          'queued',
          ${timestamp}
        FROM allocated_event
        CROSS JOIN debited_guest
        RETURNING id
      )
      SELECT inserted_order.id, debited_guest.token_balance
      FROM inserted_order
      CROSS JOIN debited_guest
    `);
    const placed = placement.rows[0] as { id: string; token_balance: number } | undefined;
    if (!placed) {
      const [latestGuest] = await resolved.db.select().from(guests).where(eq(guests.id, resolved.guest.id)).limit(1);
      const [latestEvent] = await resolved.db.select().from(events).where(eq(events.id, resolved.event.id)).limit(1);
      if (!latestGuest || latestGuest.tokenBalance < 1) return jsonError("No coffee tokens remain.", 409);
      if (!latestEvent?.orderingEnabled || !["open", "last_orders"].includes(latestEvent.serviceMode)) return jsonError("Ordering is closed for this event.", 409);
      return jsonError("The order could not be placed. Please try once more.", 409);
    }
    const [order] = await resolved.db.select().from(orders).where(eq(orders.id, placed.id)).limit(1);
    return Response.json({ order, tokensRemaining: Number(placed.token_balance) }, { status: 201 });
  } catch (error) {
    return jsonError(routeError(error), 500);
  }
}
