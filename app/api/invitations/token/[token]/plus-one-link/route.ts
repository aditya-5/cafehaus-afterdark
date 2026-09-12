import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../../../../db";
import { invitations } from "../../../../../../db/schema";
import { invitationAccessCondition, jsonError, routeError } from "../../../../_lib";

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const db = getDb();
    const [parentInvitation] = await db.select().from(invitations).where(await invitationAccessCondition(token)).limit(1);
    if (!parentInvitation || parentInvitation.status === "rescinded" || !parentInvitation.guestId) {
      return jsonError("A valid invitation token is required.", 401);
    }

    const childInvitations = await db.select().from(invitations).where(eq(invitations.parentGuestId, parentInvitation.guestId)).orderBy(desc(invitations.createdAt));
    const childInvitation = childInvitations.find((invitation) => invitation.status !== "rescinded");
    if (!childInvitation) return jsonError("No active plus-one invitation was found.", 404);

    return Response.json({ inviteUrl: `${new URL(request.url).origin}/rsvp/${childInvitation.id}` });
  } catch (error) {
    return jsonError(routeError(error), 500);
  }
}
