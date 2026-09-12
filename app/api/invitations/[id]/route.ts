import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { invitations } from "../../../../db/schema";
import { jsonError, now, requireAdmin, routeError, withoutTokenHash } from "../../_lib";
import { rescindInvitationAndGuestState } from "../../_invitations";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  try {
    const { id } = await context.params;
    const payload = await request.json() as { action?: "rescind" };
    if (payload.action !== "rescind") return jsonError("action must be rescind");

    const db = getDb();
    const [existing] = await db.select().from(invitations).where(eq(invitations.id, id)).limit(1);
    if (!existing) return jsonError("Invitation not found.", 404);

    const timestamp = now();
    await rescindInvitationAndGuestState(db, id, timestamp);
    const [invitation] = await db.select().from(invitations).where(eq(invitations.id, id)).limit(1);
    return Response.json({ invitation: withoutTokenHash(invitation) });
  } catch (error) {
    return jsonError(routeError(error), 500);
  }
}
