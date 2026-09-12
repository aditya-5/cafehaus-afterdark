import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { guests, invitations, orders } from "../../../../db/schema";
import { jsonError, now, routeError, sha256 } from "../../_lib";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const payload = await request.json() as { token?: string; action?: "cancel" | "edit"; customizations?: Record<string, string> };
    const token = payload.token ?? new URL(request.url).searchParams.get("token") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    const db = getDb();
    const [invitation] = await db.select().from(invitations).where(eq(invitations.tokenHash, await sha256(token))).limit(1);
    if (!invitation || invitation.status === "rescinded" || !invitation.guestId) return jsonError("A valid invitation token is required.", 401);
    const [order] = await db.select().from(orders).where(and(eq(orders.id, id), eq(orders.guestId, invitation.guestId))).limit(1);
    if (!order) return jsonError("Order not found.", 404);
    if (order.status !== "queued") return jsonError("Orders can only be changed while queued.", 409);
    const timestamp = now();
    if (payload.action === "cancel") {
      await db.update(orders).set({ status: "cancelled", cancelledAt: timestamp }).where(eq(orders.id, order.id));
      const [guest] = await db.select({ tokenBalance: guests.tokenBalance }).from(guests).where(eq(guests.id, invitation.guestId)).limit(1);
      if (guest) await db.update(guests).set({ tokenBalance: guest.tokenBalance + 1, updatedAt: timestamp }).where(eq(guests.id, invitation.guestId));
      return Response.json({ cancelled: true, tokensRefunded: 1 });
    }
    if (payload.action === "edit") {
      await db.update(orders).set({ customizationsJson: JSON.stringify(payload.customizations ?? {}) }).where(eq(orders.id, order.id));
      return Response.json({ updated: true });
    }
    return jsonError("action must be cancel or edit");
  } catch (error) {
    return jsonError(routeError(error), 500);
  }
}
