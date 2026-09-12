import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { events, guests, invitations } from "../../../../../db/schema";
import { jsonError, normalizePhone, now, randomToken, routeError, sha256 } from "../../../_lib";

type RouteContext = { params: Promise<{ token: string }> };

function titleCaseName(value: string) {
  return value.trim().split(/\s+/)[0]?.replace(/(^|[-'])\p{L}/gu, (letter) => letter.toUpperCase()) ?? "";
}

async function findInvitation(token: string) {
  const db = getDb();
  const [invitation] = await db.select().from(invitations).where(eq(invitations.tokenHash, await sha256(token))).limit(1);
  if (!invitation) return { db, invitation: null, event: null, guest: null };
  const [event] = await db.select().from(events).where(eq(events.id, invitation.eventId)).limit(1);
  const guest = invitation.guestId ? (await db.select().from(guests).where(eq(guests.id, invitation.guestId)).limit(1))[0] : null;
  return { db, invitation, event, guest };
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const result = await findInvitation(token);
    if (!result.invitation || !result.event) return jsonError("Invitation not found.", 404);
    if (result.invitation.status === "rescinded") return jsonError("This invitation has been rescinded.", 410);
    if (result.invitation.status !== "rsvped") {
      await result.db.update(invitations).set({ status: "opened", openedAt: now(), updatedAt: now() }).where(eq(invitations.id, result.invitation.id));
    }
    const guestRows = await result.db.select({ firstName: guests.firstName, rsvpResponse: guests.rsvpResponse }).from(guests).where(eq(guests.eventId, result.event.id));
    return Response.json({ event: result.event, invitation: result.invitation, guest: result.guest, guests: guestRows });
  } catch (error) {
    return jsonError(routeError(error), 500);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const result = await findInvitation(token);
    if (!result.invitation || !result.event) return jsonError("Invitation not found.", 404);
    if (result.invitation.status === "rescinded") return jsonError("This invitation has been rescinded.", 410);
    const payload = await request.json() as { firstName?: string; phone?: string; response?: "yes" | "maybe" | "no"; plusOne?: { firstName?: string; phone?: string } | null };
    const firstName = titleCaseName(payload.firstName ?? "");
    const phone = normalizePhone(payload.phone ?? "");
    const response = payload.response;
    if (!firstName || !/^\S+$/.test(firstName) || !phone || !response) return jsonError("firstName, phone and response are required");
    if (!["yes", "maybe", "no"].includes(response)) return jsonError("response must be yes, maybe or no");
    const timestamp = now();
    let guest = result.guest;
    if (guest) {
      await result.db.update(guests).set({ firstName, phoneE164: phone, rsvpResponse: response, updatedAt: timestamp }).where(eq(guests.id, guest.id));
      guest = { ...guest, firstName, phoneE164: phone, rsvpResponse: response };
    } else {
      const existing = (await result.db.select().from(guests).where(and(eq(guests.eventId, result.event.id), eq(guests.phoneE164, phone))).limit(1))[0];
      if (existing) {
        guest = existing;
        await result.db.update(guests).set({ firstName, rsvpResponse: response, updatedAt: timestamp }).where(eq(guests.id, existing.id));
      } else {
        const guestId = crypto.randomUUID();
        await result.db.insert(guests).values({ id: guestId, eventId: result.event.id, firstName, phoneE164: phone, rsvpResponse: response, tokenBalance: 2, tokenRequestStatus: "none", createdAt: timestamp, updatedAt: timestamp });
        guest = { id: guestId, eventId: result.event.id, firstName, phoneE164: phone, rsvpResponse: response, tokenBalance: 2, tokenRequestStatus: "none", createdAt: timestamp, updatedAt: timestamp };
      }
    }
    await result.db.update(invitations).set({ guestId: guest.id, invitedName: firstName, invitedPhoneE164: phone, status: "rsvped", rsvpedAt: timestamp, updatedAt: timestamp }).where(eq(invitations.id, result.invitation.id));

    let plusOneInviteUrl: string | undefined;
    const plusOne = payload.plusOne;
    if (response !== "no" && plusOne?.firstName && plusOne.phone) {
      const plusOneName = titleCaseName(plusOne.firstName);
      const plusOnePhone = normalizePhone(plusOne.phone);
      if (!/^\S+$/.test(plusOneName) || !plusOnePhone) return jsonError("plusOne must include a one-word firstName and phone");
      const childGuest = (await result.db.select().from(guests).where(and(eq(guests.eventId, result.event.id), eq(guests.phoneE164, plusOnePhone))).limit(1))[0];
      const childGuestId = childGuest?.id ?? crypto.randomUUID();
      if (!childGuest) await result.db.insert(guests).values({ id: childGuestId, eventId: result.event.id, firstName: plusOneName, phoneE164: plusOnePhone, rsvpResponse: "yes", tokenBalance: 2, tokenRequestStatus: "none", createdAt: timestamp, updatedAt: timestamp });
      const childToken = randomToken();
      await result.db.insert(invitations).values({ id: crypto.randomUUID(), eventId: result.event.id, guestId: childGuestId, parentGuestId: guest.id, invitedName: plusOneName, invitedPhoneE164: plusOnePhone, tokenHash: await sha256(childToken), status: "rsvped", rsvpedAt: timestamp, createdAt: timestamp, updatedAt: timestamp });
      plusOneInviteUrl = `${new URL(request.url).origin}/rsvp/${childToken}`;
    }
    return Response.json({ guest, plusOneInviteUrl });
  } catch (error) {
    return jsonError(routeError(error), 500);
  }
}
