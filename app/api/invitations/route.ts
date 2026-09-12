import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { invitations } from "../../../db/schema";
import { jsonError, normalizeFirstName, normalizePhone, now, randomToken, requireAdmin, routeError, sha256, withoutTokenHash } from "../_lib";

export async function GET(request: Request) {
  const authError = requireAdmin(request);
  if (authError) return authError;
  try {
    const eventId = new URL(request.url).searchParams.get("eventId")?.trim();
    if (!eventId) return jsonError("eventId is required");
    const db = getDb();
    const rows = await db.select().from(invitations).where(eq(invitations.eventId, eventId)).orderBy(desc(invitations.createdAt));
    return Response.json({ invitations: rows.map(withoutTokenHash) });
  } catch (error) {
    return jsonError(routeError(error), 500);
  }
}

export async function POST(request: Request) {
  const authError = requireAdmin(request);
  if (authError) return authError;
  try {
    const payload = await request.json() as { eventId?: string; name?: string; phone?: string; parentGuestId?: string };
    const name = normalizeFirstName(payload.name ?? "");
    const phone = normalizePhone(payload.phone ?? "");
    if (!payload.eventId || !name || !phone) return jsonError("eventId, name and phone are required");
    const token = randomToken();
    const timestamp = now();
    const db = getDb();
    const [invitation] = await db.insert(invitations).values({
      id: crypto.randomUUID(),
      eventId: payload.eventId,
      parentGuestId: payload.parentGuestId ?? null,
      invitedName: name,
      invitedPhoneE164: phone,
      tokenHash: await sha256(token),
      status: "sent",
      createdAt: timestamp,
      updatedAt: timestamp,
    }).returning();
    const url = new URL(request.url);
    return Response.json({ invitation: withoutTokenHash(invitation), inviteUrl: `${url.origin}/rsvp/${invitation.id}` }, { status: 201 });
  } catch (error) {
    return jsonError(routeError(error), 500);
  }
}
