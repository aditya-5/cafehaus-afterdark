import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { events } from "../../../../../db/schema";
import { jsonError, now, requireAdmin, routeError } from "../../../_lib";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const authError = requireAdmin(request);
  if (authError) return authError;
  try {
    const { id } = await context.params;
    const payload = await request.json() as {
      status?: "scheduled" | "live" | "ended";
      orderingEnabled?: boolean;
      serviceMode?: "closed" | "open" | "paused" | "last_orders";
      serviceMessage?: string | null;
      oatMilkAvailable?: boolean;
      decafAvailable?: boolean;
      rsvpDeadline?: string | null;
    };
    const hasUpdate = payload.status
      || typeof payload.orderingEnabled === "boolean"
      || payload.serviceMode
      || payload.serviceMessage !== undefined
      || typeof payload.oatMilkAvailable === "boolean"
      || typeof payload.decafAvailable === "boolean"
      || payload.rsvpDeadline !== undefined;
    if (!hasUpdate) return jsonError("At least one event setting is required");
    if (payload.serviceMessage && payload.serviceMessage.trim().length > 160) return jsonError("Service message must be 160 characters or fewer");
    if (payload.rsvpDeadline && Number.isNaN(new Date(payload.rsvpDeadline).getTime())) return jsonError("rsvpDeadline must be a valid date");

    const serviceMode = payload.status === "ended" ? "closed" : payload.serviceMode;
    const orderingEnabled = serviceMode
      ? serviceMode === "open" || serviceMode === "last_orders"
      : payload.status === "ended"
        ? false
        : payload.orderingEnabled;
    const status = payload.status
      ?? (serviceMode && serviceMode !== "closed" ? "live" : undefined)
      ?? (payload.orderingEnabled === true ? "live" : undefined);
    const db = getDb();
    const [event] = await db.update(events).set({
      ...(status ? { status } : {}),
      ...(typeof orderingEnabled === "boolean" ? { orderingEnabled } : {}),
      ...(serviceMode ? { serviceMode } : {}),
      ...(payload.serviceMessage !== undefined ? { serviceMessage: payload.serviceMessage?.trim() || null } : {}),
      ...(typeof payload.oatMilkAvailable === "boolean" ? { oatMilkAvailable: payload.oatMilkAvailable } : {}),
      ...(typeof payload.decafAvailable === "boolean" ? { decafAvailable: payload.decafAvailable } : {}),
      ...(payload.rsvpDeadline !== undefined ? { rsvpDeadline: payload.rsvpDeadline } : {}),
      updatedAt: now(),
    }).where(eq(events.id, id)).returning();
    if (!event) return jsonError("Event not found.", 404);
    return Response.json({ event });
  } catch (error) {
    return jsonError(routeError(error), 500);
  }
}
