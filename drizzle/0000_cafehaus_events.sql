CREATE TABLE `events` (
  `id` text PRIMARY KEY NOT NULL,
  `slug` text NOT NULL,
  `title` text NOT NULL,
  `status` text DEFAULT 'scheduled' NOT NULL,
  `ordering_enabled` integer DEFAULT false NOT NULL,
  `starts_at` text NOT NULL,
  `ends_at` text,
  `address` text NOT NULL,
  `album_url` text,
  `playlist_url` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `events_slug_unique` ON `events` (`slug`);
--> statement-breakpoint
CREATE TABLE `guests` (
  `id` text PRIMARY KEY NOT NULL,
  `event_id` text NOT NULL REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action,
  `first_name` text NOT NULL,
  `phone_e164` text NOT NULL,
  `rsvp_response` text DEFAULT 'maybe' NOT NULL,
  `token_balance` integer DEFAULT 2 NOT NULL,
  `token_request_status` text DEFAULT 'none' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `guests_event_phone_unique` ON `guests` (`event_id`,`phone_e164`);
--> statement-breakpoint
CREATE INDEX `guests_event_idx` ON `guests` (`event_id`);
--> statement-breakpoint
CREATE TABLE `invitations` (
  `id` text PRIMARY KEY NOT NULL,
  `event_id` text NOT NULL REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action,
  `guest_id` text REFERENCES `guests`(`id`) ON UPDATE no action ON DELETE no action,
  `parent_guest_id` text REFERENCES `guests`(`id`) ON UPDATE no action ON DELETE no action,
  `invited_name` text NOT NULL,
  `invited_phone_e164` text NOT NULL,
  `token_hash` text NOT NULL,
  `status` text DEFAULT 'sent' NOT NULL,
  `expires_at` text,
  `opened_at` text,
  `rsvped_at` text,
  `rescinded_at` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invitations_token_hash_unique` ON `invitations` (`token_hash`);
--> statement-breakpoint
CREATE INDEX `invitations_event_idx` ON `invitations` (`event_id`);
--> statement-breakpoint
CREATE INDEX `invitations_phone_idx` ON `invitations` (`invited_phone_e164`);
--> statement-breakpoint
CREATE TABLE `drinks` (
  `id` text PRIMARY KEY NOT NULL,
  `event_id` text NOT NULL REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action,
  `name` text NOT NULL,
  `category` text NOT NULL,
  `description` text DEFAULT '' NOT NULL,
  `prep_minutes` integer DEFAULT 3 NOT NULL,
  `caffeine` text DEFAULT 'Caffeinated' NOT NULL,
  `recipe_json` text DEFAULT '[]' NOT NULL,
  `available` integer DEFAULT true NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `drinks_event_idx` ON `drinks` (`event_id`);
--> statement-breakpoint
CREATE TABLE `orders` (
  `id` text PRIMARY KEY NOT NULL,
  `event_id` text NOT NULL REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action,
  `guest_id` text NOT NULL REFERENCES `guests`(`id`) ON UPDATE no action ON DELETE no action,
  `drink_id` text NOT NULL REFERENCES `drinks`(`id`) ON UPDATE no action ON DELETE no action,
  `order_number` text NOT NULL,
  `customizations_json` text DEFAULT '{}' NOT NULL,
  `status` text DEFAULT 'queued' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `making_at` text,
  `ready_at` text,
  `archived_at` text,
  `cancelled_at` text
);
--> statement-breakpoint
CREATE INDEX `orders_event_idx` ON `orders` (`event_id`,`status`);
--> statement-breakpoint
CREATE INDEX `orders_guest_idx` ON `orders` (`guest_id`,`created_at`);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_event_number_unique` ON `orders` (`event_id`,`order_number`);
