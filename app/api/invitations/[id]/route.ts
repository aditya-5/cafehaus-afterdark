import { eq, sql } from "drizzle-orm";
import { getDb } from "../../../../db";
import { invitations } from "../../../../db/schema";
import { jsonError, normalizePhone, now, requireAdmin, routeError, withoutTokenHash } from "../../_lib";
import { rescindInvitationAndGuestState } from "../../_invitations";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const authError = requireAdmin(request);
  if (authError) return authError;

  try {
    const { id } = await context.params;
    const payload = await request.json() as { action?: "rescind" | "update_contact"; phone?: string };
    if (!payload.action || !["rescind", "update_contact"].includes(payload.action)) return jsonError("action must be rescind or update_contact");

    const db = getDb();
    const [existing] = await db.select().from(invitations).where(eq(invitations.id, id)).limit(1);
    if (!existing) return jsonError("Invitation not found.", 404);

    const timestamp = now();
    if (payload.action === "rescind") {
      await rescindInvitationAndGuestState(db, id, timestamp);
    } else {
      if (existing.status === "rescinded") return jsonError("A rescinded invitation cannot be edited.", 409);
      const phone = normalizePhone(payload.phone ?? "");
      if (!phone) return jsonError("Enter a valid international mobile number.");
      await db.execute(sql`
        WITH updated_guest AS (
          UPDATE guests
          SET phone_e164 = ${phone}, updated_at = ${timestamp}
          WHERE id = ${existing.guestId}
          RETURNING id
        )
        UPDATE invitations
        SET invited_phone_e164 = ${phone}, updated_at = ${timestamp}
        WHERE id = ${id}
      `);
    }
    const [invitation] = await db.select().from(invitations).where(eq(invitations.id, id)).limit(1);
    return Response.json({ invitation: withoutTokenHash(invitation) });
  } catch (error) {
    return jsonError(routeError(error), 500);
  }
}
