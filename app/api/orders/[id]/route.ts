import { and, eq, sql } from "drizzle-orm";
import { getDb } from "../../../../db";
import { events, invitations, orders } from "../../../../db/schema";
import { invitationAccessCondition, jsonError, now, routeError } from "../../_lib";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const payload = await request.json() as { token?: string; action?: "cancel" | "edit"; customizations?: Record<string, string> };
    const token = payload.token ?? new URL(request.url).searchParams.get("token") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    const db = getDb();
    const [invitation] = await db.select().from(invitations).where(await invitationAccessCondition(token)).limit(1);
    if (!invitation || invitation.status === "rescinded" || !invitation.guestId) return jsonError("A valid invitation token is required.", 401);
    const [order] = await db.select().from(orders).where(and(eq(orders.id, id), eq(orders.guestId, invitation.guestId))).limit(1);
    if (!order) return jsonError("Order not found.", 404);
    if (order.status !== "queued") return jsonError("Orders can only be changed while queued.", 409);
    const timestamp = now();
    if (payload.action === "cancel") {
      const cancellation = await db.execute(sql`
        WITH cancelled_order AS (
          UPDATE orders
          SET status = 'cancelled', cancelled_at = ${timestamp}
          WHERE id = ${order.id}
            AND guest_id = ${invitation.guestId}
            AND status = 'queued'
          RETURNING guest_id
        ),
        refunded_guest AS (
          UPDATE guests
          SET token_balance = token_balance + 1, updated_at = ${timestamp}
          WHERE id IN (SELECT guest_id FROM cancelled_order)
          RETURNING token_balance
        )
        SELECT token_balance FROM refunded_guest
      `);
      if (!cancellation.rows.length) return jsonError("This order has already moved and cannot be cancelled.", 409);
      return Response.json({ cancelled: true, tokensRefunded: 1, tokenBalance: Number((cancellation.rows[0] as { token_balance: number }).token_balance) });
    }
    if (payload.action === "edit") {
      const customizations = Object.fromEntries(Object.entries(payload.customizations ?? {}).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
      const [event] = await db.select().from(events).where(eq(events.id, invitation.eventId)).limit(1);
      if (customizations.milk === "Oat milk" && !event?.oatMilkAvailable) return jsonError("Oat milk is unavailable tonight.", 409);
      if (customizations.caffeine === "Decaf" && !event?.decafAvailable) return jsonError("Decaf is unavailable tonight.", 409);
      await db.update(orders).set({ customizationsJson: JSON.stringify(customizations) }).where(eq(orders.id, order.id));
      return Response.json({ updated: true });
    }
    return jsonError("action must be cancel or edit");
  } catch (error) {
    return jsonError(routeError(error), 500);
  }
}
