import { sql } from "drizzle-orm";
import { boolean, index, integer, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP::text`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP::text`),
};

export const events = pgTable("events", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  status: text("status", { enum: ["scheduled", "live", "ended"] }).notNull().default("scheduled"),
  orderingEnabled: boolean("ordering_enabled").notNull().default(false),
  serviceMode: text("service_mode", { enum: ["closed", "open", "paused", "last_orders"] }).notNull().default("closed"),
  serviceMessage: text("service_message"),
  oatMilkAvailable: boolean("oat_milk_available").notNull().default(true),
  decafAvailable: boolean("decaf_available").notNull().default(true),
  rsvpDeadline: text("rsvp_deadline"),
  mapsUrl: text("maps_url"),
  nextOrderNumber: integer("next_order_number").notNull().default(0),
  startsAt: text("starts_at").notNull(),
  endsAt: text("ends_at"),
  address: text("address").notNull(),
  albumUrl: text("album_url"),
  playlistUrl: text("playlist_url"),
  ...timestamps,
}, (table) => ({ slugIdx: uniqueIndex("events_slug_unique").on(table.slug) }));

export const guests = pgTable("guests", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull().references(() => events.id),
  firstName: text("first_name").notNull(),
  phoneE164: text("phone_e164").notNull(),
  rsvpResponse: text("rsvp_response", { enum: ["yes", "maybe", "no"] }).notNull().default("maybe"),
  tokenBalance: integer("token_balance").notNull().default(2),
  tokenRequestStatus: text("token_request_status", { enum: ["none", "requested", "fulfilled"] }).notNull().default("none"),
  ...timestamps,
}, (table) => ({ eventPhoneIdx: uniqueIndex("guests_event_phone_unique").on(table.eventId, table.phoneE164), eventIdx: index("guests_event_idx").on(table.eventId) }));

export const invitations = pgTable("invitations", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull().references(() => events.id),
  guestId: text("guest_id").references(() => guests.id),
  parentGuestId: text("parent_guest_id").references(() => guests.id),
  invitedName: text("invited_name").notNull(),
  invitedPhoneE164: text("invited_phone_e164").notNull(),
  tokenHash: text("token_hash").notNull(),
  status: text("status", { enum: ["sent", "delivered", "opened", "rsvped", "rescinded"] }).notNull().default("sent"),
  expiresAt: text("expires_at"),
  openedAt: text("opened_at"),
  rsvpedAt: text("rsvped_at"),
  rescindedAt: text("rescinded_at"),
  ...timestamps,
}, (table) => ({ tokenIdx: uniqueIndex("invitations_token_hash_unique").on(table.tokenHash), eventIdx: index("invitations_event_idx").on(table.eventId), phoneIdx: index("invitations_phone_idx").on(table.invitedPhoneE164) }));

export const drinks = pgTable("drinks", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull().references(() => events.id),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull().default(""),
  prepMinutes: integer("prep_minutes").notNull().default(3),
  caffeine: text("caffeine").notNull().default("Caffeinated"),
  recipeJson: text("recipe_json").notNull().default("[]"),
  available: boolean("available").notNull().default(true),
  ...timestamps,
}, (table) => ({ eventIdx: index("drinks_event_idx").on(table.eventId) }));

export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  eventId: text("event_id").notNull().references(() => events.id),
  guestId: text("guest_id").notNull().references(() => guests.id),
  drinkId: text("drink_id").notNull().references(() => drinks.id),
  orderNumber: text("order_number").notNull(),
  customizationsJson: text("customizations_json").notNull().default("{}"),
  status: text("status", { enum: ["queued", "making", "ready", "archived", "cancelled"] }).notNull().default("queued"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  makingAt: text("making_at"),
  readyAt: text("ready_at"),
  archivedAt: text("archived_at"),
  cancelledAt: text("cancelled_at"),
}, (table) => ({ eventIdx: index("orders_event_idx").on(table.eventId, table.status), guestIdx: index("orders_guest_idx").on(table.guestId, table.createdAt), orderNumberIdx: uniqueIndex("orders_event_number_unique").on(table.eventId, table.orderNumber) }));

export const schema = { events, guests, invitations, drinks, orders };
