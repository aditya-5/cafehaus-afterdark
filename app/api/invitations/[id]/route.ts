import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { invitations } from "../../../../db/schema";
import { jsonError, now, randomToken, requireAdmin, routeError, sha256, withoutTokenHash } from "../../_lib";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  try {
    const { id } = await context.params;
    const payload = await request.json() as { action?: "rescind" | "reissue" };
    if (!payload.action || !["rescind", "reissue"].includes(payload.action)) return jsonError("action must be rescind or reissue");

    const db = getDb();
    const [existing] = await db.select().from(invitations).where(eq(invitations.id, id)).limit(1);
    if (!existing) return jsonError("Invitation not found.", 404);

    const timestamp = now();
    if (payload.action === "rescind") {
      const [invitation] = await db.update(invitations).set({ status: "rescinded", rescindedAt: timestamp, updatedAt: timestamp }).where(eq(invitations.id, id)).returning();
      return Response.json({ invitation: withoutTokenHash(invitation) });
    }

    const token = randomToken();
    const [invitation] = await db.update(invitations).set({
      tokenHash: await sha256(token),
      status: "sent",
      openedAt: null,
      rescindedAt: null,
      updatedAt: timestamp,
    }).where(eq(invitations.id, id)).returning();
    return Response.json({ invitation: withoutTokenHash(invitation), inviteUrl: `${new URL(request.url).origin}/rsvp/${token}` });
  } catch (error) {
    return jsonError(routeError(error), 500);
  }
}
