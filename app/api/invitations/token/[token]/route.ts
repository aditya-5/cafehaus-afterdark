import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { getEventOrderViews } from "../../../../../db/read-models";
import { drinks, events, guests, invitations } from "../../../../../db/schema";
import { jsonError, normalizePhone, now, randomToken, routeError, sha256, withoutTokenHash } from "../../../_lib";

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

async function getPlusOne(db: ReturnType<typeof getDb>, guestId: string | undefined) {
  if (!guestId) return null;
  const childInvites = await db.select().from(invitations).where(eq(invitations.parentGuestId, guestId)).orderBy(desc(invitations.createdAt));
  const childInvite = childInvites.find((invitation) => invitation.status !== "rescinded");
  if (!childInvite?.guestId) return null;
  const [childGuest] = await db.select().from(guests).where(eq(guests.id, childInvite.guestId)).limit(1);
  if (!childGuest) return null;
  return { firstName: childGuest.firstName, phone: childGuest.phoneE164, response: childGuest.rsvpResponse, invitationId: childInvite.id, status: childInvite.status };
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

    const [guestRows, drinkRows, orderRows, plusOne] = await Promise.all([
      result.db.select({ firstName: guests.firstName, rsvpResponse: guests.rsvpResponse }).from(guests).where(eq(guests.eventId, result.event.id)).orderBy(asc(guests.firstName)),
      result.db.select().from(drinks).where(eq(drinks.eventId, result.event.id)).orderBy(asc(drinks.category), asc(drinks.name)),
      getEventOrderViews(result.db, result.event.id),
      getPlusOne(result.db, result.guest?.id),
    ]);

    return Response.json({ event: result.event, invitation: withoutTokenHash(result.invitation), guest: result.guest, guests: guestRows, drinks: drinkRows, orders: orderRows, plusOne });
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
        await result.db.update(guests).set({ firstName, rsvpResponse: response, updatedAt: timestamp }).where(eq(guests.id, existing.id));
        guest = { ...existing, firstName, rsvpResponse: response };
      } else {
        const guestId = crypto.randomUUID();
        await result.db.insert(guests).values({ id: guestId, eventId: result.event.id, firstName, phoneE164: phone, rsvpResponse: response, tokenBalance: 2, tokenRequestStatus: "none", createdAt: timestamp, updatedAt: timestamp });
        guest = { id: guestId, eventId: result.event.id, firstName, phoneE164: phone, rsvpResponse: response, tokenBalance: 2, tokenRequestStatus: "none", createdAt: timestamp, updatedAt: timestamp };
      }
    }

    await result.db.update(invitations).set({ guestId: guest.id, invitedName: firstName, invitedPhoneE164: phone, status: "rsvped", rsvpedAt: timestamp, updatedAt: timestamp }).where(eq(invitations.id, result.invitation.id));

    const childInvites = await result.db.select().from(invitations).where(eq(invitations.parentGuestId, guest.id)).orderBy(desc(invitations.createdAt));
    const activeChildInvite = childInvites.find((invitation) => invitation.status !== "rescinded");
    let plusOneInviteUrl: string | undefined;

    if (response !== "no" && payload.plusOne?.firstName && payload.plusOne.phone) {
      const plusOneName = titleCaseName(payload.plusOne.firstName);
      const plusOnePhone = normalizePhone(payload.plusOne.phone);
      if (!/^\S+$/.test(plusOneName) || !plusOnePhone) return jsonError("plusOne must include a one-word firstName and phone");
      if (plusOnePhone === phone) return jsonError("Your guest needs their own phone number.");

      const existingByPhone = (await result.db.select().from(guests).where(and(eq(guests.eventId, result.event.id), eq(guests.phoneE164, plusOnePhone))).limit(1))[0];
      const activeChildGuest = activeChildInvite?.guestId ? (await result.db.select().from(guests).where(eq(guests.id, activeChildInvite.guestId)).limit(1))[0] : null;
      const childGuest = existingByPhone ?? activeChildGuest;
      const childGuestId = childGuest?.id ?? crypto.randomUUID();

      if (childGuest) {
        await result.db.update(guests).set({ firstName: plusOneName, phoneE164: plusOnePhone, rsvpResponse: "yes", updatedAt: timestamp }).where(eq(guests.id, childGuest.id));
      } else {
        await result.db.insert(guests).values({ id: childGuestId, eventId: result.event.id, firstName: plusOneName, phoneE164: plusOnePhone, rsvpResponse: "yes", tokenBalance: 2, tokenRequestStatus: "none", createdAt: timestamp, updatedAt: timestamp });
      }

      if (activeChildGuest && activeChildGuest.id !== childGuestId) {
        await result.db.update(guests).set({ rsvpResponse: "no", updatedAt: timestamp }).where(eq(guests.id, activeChildGuest.id));
      }

      if (activeChildInvite) {
        await result.db.update(invitations).set({ guestId: childGuestId, invitedName: plusOneName, invitedPhoneE164: plusOnePhone, status: "rsvped", rsvpedAt: timestamp, updatedAt: timestamp }).where(eq(invitations.id, activeChildInvite.id));
      } else {
        const childToken = randomToken();
        await result.db.insert(invitations).values({ id: crypto.randomUUID(), eventId: result.event.id, guestId: childGuestId, parentGuestId: guest.id, invitedName: plusOneName, invitedPhoneE164: plusOnePhone, tokenHash: await sha256(childToken), status: "rsvped", rsvpedAt: timestamp, createdAt: timestamp, updatedAt: timestamp });
        plusOneInviteUrl = `${new URL(request.url).origin}/rsvp/${childToken}`;
      }
    } else {
      for (const childInvite of childInvites.filter((invitation) => invitation.status !== "rescinded")) {
        await result.db.update(invitations).set({ status: "rescinded", rescindedAt: timestamp, updatedAt: timestamp }).where(eq(invitations.id, childInvite.id));
        if (childInvite.guestId) await result.db.update(guests).set({ rsvpResponse: "no", updatedAt: timestamp }).where(eq(guests.id, childInvite.guestId));
      }
    }

    return Response.json({ guest, plusOne: await getPlusOne(result.db, guest.id), plusOneInviteUrl });
  } catch (error) {
    return jsonError(routeError(error), 500);
  }
}
