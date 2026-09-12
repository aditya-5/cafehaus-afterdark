import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { events } from "../../../db/schema";
import { jsonError, now, requireAdmin, routeError } from "../_lib";

export async function GET(request: Request) {
  try {
    const slug = new URL(request.url).searchParams.get("slug")?.trim();
    if (!slug) return jsonError("slug is required");
    const db = getDb();
    const [event] = await db.select({
      id: events.id,
      slug: events.slug,
      title: events.title,
      status: events.status,
      startsAt: events.startsAt,
      endsAt: events.endsAt,
    }).from(events).where(eq(events.slug, slug)).limit(1);
    if (!event) return jsonError("Event not found.", 404);
    return Response.json({ event });
  } catch (error) {
    return jsonError(routeError(error), 500);
  }
}

export async function POST(request: Request) {
  const authError = requireAdmin(request);
  if (authError) return authError;
  try {
    const payload = await request.json() as Partial<typeof events.$inferInsert>;
    if (!payload.id || !payload.slug || !payload.title || !payload.startsAt || !payload.address) return jsonError("id, slug, title, startsAt and address are required");
    const db = getDb();
    const [event] = await db.insert(events).values({
      id: payload.id,
      slug: payload.slug,
      title: payload.title,
      startsAt: payload.startsAt,
      endsAt: payload.endsAt ?? null,
      address: payload.address,
      albumUrl: payload.albumUrl ?? null,
      playlistUrl: payload.playlistUrl ?? null,
      status: payload.status ?? "scheduled",
      orderingEnabled: payload.orderingEnabled ?? false,
      createdAt: payload.createdAt ?? now(),
      updatedAt: now(),
    }).returning();
    return Response.json({ event }, { status: 201 });
  } catch (error) {
    return jsonError(routeError(error), 500);
  }
}
