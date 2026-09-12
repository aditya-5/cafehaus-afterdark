import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { orders } from "../../../../../db/schema";
import { jsonError, now, requireAdmin, routeError } from "../../../_lib";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const authError = requireAdmin(request);
  if (authError) return authError;
  try {
    const { id } = await context.params;
    const payload = await request.json() as { status?: "queued" | "making" | "ready" | "archived" };
    if (!payload.status) return jsonError("status is required");
    const timestamp = now();
    const values = payload.status === "making" ? { status: payload.status, makingAt: timestamp } : payload.status === "ready" ? { status: payload.status, readyAt: timestamp } : payload.status === "archived" ? { status: payload.status, archivedAt: timestamp } : { status: payload.status };
    const db = getDb();
    const result = await db.update(orders).set(values).where(eq(orders.id, id)).returning();
    if (!result[0]) return jsonError("Order not found.", 404);
    return Response.json({ order: result[0] });
  } catch (error) {
    return jsonError(routeError(error), 500);
  }
}
