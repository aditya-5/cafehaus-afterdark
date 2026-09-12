import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { drinks } from "../../../../../db/schema";
import { jsonError, now, requireAdmin, routeError } from "../../../_lib";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  try {
    const { id } = await context.params;
    const payload = await request.json() as { available?: boolean };
    if (typeof payload.available !== "boolean") return jsonError("available is required");

    const db = getDb();
    const [drink] = await db.update(drinks).set({ available: payload.available, updatedAt: now() }).where(eq(drinks.id, id)).returning();
    if (!drink) return jsonError("Drink not found.", 404);
    return Response.json({ drink });
  } catch (error) {
    return jsonError(routeError(error), 500);
  }
}

