import { sql } from "drizzle-orm";
import type { getDb } from "../../db";

type Database = ReturnType<typeof getDb>;

export async function rescindInvitationAndGuestState(db: Database, invitationId: string, timestamp: string) {
  await db.execute(sql`
    WITH RECURSIVE affected_invitations AS (
      SELECT id, guest_id, status
      FROM invitations
      WHERE id = ${invitationId}

      UNION

      SELECT child.id, child.guest_id, child.status
      FROM invitations child
      JOIN affected_invitations parent ON child.parent_guest_id = parent.guest_id
      WHERE parent.status <> 'rescinded'
    ),
    reset_guests AS (
      UPDATE guests AS guest
      SET rsvp_response = 'no', token_balance = 0, token_request_status = 'none', updated_at = ${timestamp}
      WHERE guest.id IN (SELECT guest_id FROM affected_invitations WHERE guest_id IS NOT NULL)
        AND NOT EXISTS (
          SELECT 1
          FROM invitations other_invitation
          WHERE other_invitation.guest_id = guest.id
            AND other_invitation.id NOT IN (SELECT id FROM affected_invitations)
            AND other_invitation.status <> 'rescinded'
        )
      RETURNING guest.id
    ),
    cancelled_orders AS (
      UPDATE orders
      SET status = 'cancelled', cancelled_at = ${timestamp}
      WHERE guest_id IN (SELECT id FROM reset_guests)
        AND status IN ('queued', 'making', 'ready')
      RETURNING id
    )
    UPDATE invitations
    SET status = 'rescinded', guest_id = NULL, rsvped_at = NULL, rescinded_at = ${timestamp}, updated_at = ${timestamp}
    WHERE id IN (SELECT id FROM affected_invitations)
  `);
}
