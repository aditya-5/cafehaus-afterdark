import { eq } from "drizzle-orm";
import { getDb } from "../../../../../../db";
import { guests, invitations } from "../../../../../../db/schema";
import { jsonError, now, routeError, sha256 } from "../../../../_lib";

export async function POST(_request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const db = getDb();
    const [invitation] = await db.select().from(invitations).where(eq(invitations.tokenHash, await sha256(token))).limit(1);
    if (!invitation || invitation.status === "rescinded" || !invitation.guestId) return jsonError("A valid invitation token is required.", 401);
    await db.update(guests).set({ tokenRequestStatus: "requested", updatedAt: now() }).where(eq(guests.id, invitation.guestId));
    return Response.json({ requested: true });
  } catch (error) {
    return jsonError(routeError(error), 500);
  }
}
