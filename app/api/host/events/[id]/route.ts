import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { events } from "../../../../../db/schema";
import { jsonError, now, requireAdmin, routeError } from "../../../_lib";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const authError = requireAdmin(request);
  if (authError) return authError;
  try {
    const { id } = await context.params;
    const payload = await request.json() as { status?: "scheduled" | "live" | "ended"; orderingEnabled?: boolean };
    if (!payload.status && typeof payload.orderingEnabled !== "boolean") return jsonError("status or orderingEnabled is required");
    const status = payload.status ?? (payload.orderingEnabled === true ? "live" : undefined);
    const db = getDb();
    const [event] = await db.update(events).set({ ...(status ? { status } : {}), ...(typeof payload.orderingEnabled === "boolean" ? { orderingEnabled: payload.orderingEnabled } : {}), updatedAt: now() }).where(eq(events.id, id)).returning();
    if (!event) return jsonError("Event not found.", 404);
    return Response.json({ event });
  } catch (error) {
    return jsonError(routeError(error), 500);
  }
}
