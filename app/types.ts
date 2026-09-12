export type RsvpResponse = "yes" | "maybe" | "no";
export type EventStatus = "scheduled" | "live" | "ended";
export type OrderStatus = "queued" | "making" | "ready" | "archived" | "cancelled";

export type EventRecord = {
  id: string;
  slug: string;
  title: string;
  status: EventStatus;
  orderingEnabled: boolean;
  startsAt: string;
  endsAt: string | null;
  address: string;
  albumUrl: string | null;
  playlistUrl: string | null;
};

export type GuestRecord = {
  id: string;
  eventId: string;
  firstName: string;
  phoneE164: string;
  rsvpResponse: RsvpResponse;
  tokenBalance: number;
  tokenRequestStatus: "none" | "requested" | "fulfilled";
  createdAt: string;
  updatedAt: string;
};

export type InvitationRecord = {
  id: string;
  eventId: string;
  guestId: string | null;
  parentGuestId: string | null;
  invitedName: string;
  invitedPhoneE164: string;
  status: "sent" | "delivered" | "opened" | "rsvped" | "rescinded";
  openedAt: string | null;
  rsvpedAt: string | null;
  rescindedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminInvitationRecord = InvitationRecord & {
  rsvpResponse: RsvpResponse | null;
  parentGuestName: string | null;
};

export type DrinkRecord = {
  id: string;
  eventId: string;
  name: string;
  category: string;
  description: string;
  prepMinutes: number;
  caffeine: string;
  recipeJson: string;
  available: boolean;
};

export type OrderView = {
  id: string;
  eventId: string;
  guestId: string;
  drinkId: string;
  orderNumber: string;
  customizationsJson: string;
  customizations: Record<string, string>;
  status: OrderStatus;
  createdAt: string;
  makingAt: string | null;
  readyAt: string | null;
  archivedAt: string | null;
  cancelledAt: string | null;
  guestName: string;
  drinkName: string;
  prepMinutes: number;
};

export type PlusOneRecord = {
  firstName: string;
  phone: string;
  response: RsvpResponse;
  invitationId: string;
  status: InvitationRecord["status"];
};

export type GuestSnapshot = {
  event: EventRecord;
  invitation: InvitationRecord;
  guest: GuestRecord | null;
  guests: Array<{ firstName: string; rsvpResponse: RsvpResponse }>;
  drinks: DrinkRecord[];
  orders: OrderView[];
  plusOne: PlusOneRecord | null;
};

export type AdminSnapshot = {
  event: EventRecord;
  guests: GuestRecord[];
  invitations: AdminInvitationRecord[];
  drinks: DrinkRecord[];
  orders: OrderView[];
};
