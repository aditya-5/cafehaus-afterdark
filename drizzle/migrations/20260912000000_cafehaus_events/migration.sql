CREATE TABLE IF NOT EXISTS events (
  id text PRIMARY KEY NOT NULL,
  slug text NOT NULL,
  title text NOT NULL,
  status text DEFAULT 'scheduled' NOT NULL,
  ordering_enabled boolean DEFAULT false NOT NULL,
  starts_at text NOT NULL,
  ends_at text,
  address text NOT NULL,
  album_url text,
  playlist_url text,
  created_at text DEFAULT CURRENT_TIMESTAMP::text NOT NULL,
  updated_at text DEFAULT CURRENT_TIMESTAMP::text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS events_slug_unique ON events (slug);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS guests (
  id text PRIMARY KEY NOT NULL,
  event_id text NOT NULL REFERENCES events(id),
  first_name text NOT NULL,
  phone_e164 text NOT NULL,
  rsvp_response text DEFAULT 'maybe' NOT NULL,
  token_balance integer DEFAULT 2 NOT NULL,
  token_request_status text DEFAULT 'none' NOT NULL,
  created_at text DEFAULT CURRENT_TIMESTAMP::text NOT NULL,
  updated_at text DEFAULT CURRENT_TIMESTAMP::text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS guests_event_phone_unique ON guests (event_id, phone_e164);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS guests_event_idx ON guests (event_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS invitations (
  id text PRIMARY KEY NOT NULL,
  event_id text NOT NULL REFERENCES events(id),
  guest_id text REFERENCES guests(id),
  parent_guest_id text REFERENCES guests(id),
  invited_name text NOT NULL,
  invited_phone_e164 text NOT NULL,
  token_hash text NOT NULL,
  status text DEFAULT 'sent' NOT NULL,
  expires_at text,
  opened_at text,
  rsvped_at text,
  rescinded_at text,
  created_at text DEFAULT CURRENT_TIMESTAMP::text NOT NULL,
  updated_at text DEFAULT CURRENT_TIMESTAMP::text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS invitations_token_hash_unique ON invitations (token_hash);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS invitations_event_idx ON invitations (event_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS invitations_phone_idx ON invitations (invited_phone_e164);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS drinks (
  id text PRIMARY KEY NOT NULL,
  event_id text NOT NULL REFERENCES events(id),
  name text NOT NULL,
  category text NOT NULL,
  description text DEFAULT '' NOT NULL,
  prep_minutes integer DEFAULT 3 NOT NULL,
  caffeine text DEFAULT 'Caffeinated' NOT NULL,
  recipe_json text DEFAULT '[]' NOT NULL,
  available boolean DEFAULT true NOT NULL,
  created_at text DEFAULT CURRENT_TIMESTAMP::text NOT NULL,
  updated_at text DEFAULT CURRENT_TIMESTAMP::text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS drinks_event_idx ON drinks (event_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS orders (
  id text PRIMARY KEY NOT NULL,
  event_id text NOT NULL REFERENCES events(id),
  guest_id text NOT NULL REFERENCES guests(id),
  drink_id text NOT NULL REFERENCES drinks(id),
  order_number text NOT NULL,
  customizations_json text DEFAULT '{}' NOT NULL,
  status text DEFAULT 'queued' NOT NULL,
  created_at text DEFAULT CURRENT_TIMESTAMP::text NOT NULL,
  making_at text,
  ready_at text,
  archived_at text,
  cancelled_at text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS orders_event_idx ON orders (event_id, status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS orders_guest_idx ON orders (guest_id, created_at);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS orders_event_number_unique ON orders (event_id, order_number);
