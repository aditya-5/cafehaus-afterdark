ALTER TABLE events ADD COLUMN IF NOT EXISTS service_mode text DEFAULT 'closed' NOT NULL;
--> statement-breakpoint
ALTER TABLE events ADD COLUMN IF NOT EXISTS service_message text;
--> statement-breakpoint
ALTER TABLE events ADD COLUMN IF NOT EXISTS oat_milk_available boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE events ADD COLUMN IF NOT EXISTS decaf_available boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE events ADD COLUMN IF NOT EXISTS rsvp_deadline text;
--> statement-breakpoint
ALTER TABLE events ADD COLUMN IF NOT EXISTS maps_url text;
--> statement-breakpoint
ALTER TABLE events ADD COLUMN IF NOT EXISTS next_order_number integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE events
SET
  rsvp_deadline = COALESCE(rsvp_deadline, '2026-10-10T23:59:00+01:00'),
  maps_url = COALESCE(maps_url, 'https://www.google.com/maps/search/?api=1&query=Flat%2076%2C%204%20Silvertown%20Way%2C%20Canning%20Town%2C%20London%20E16%201YD'),
  next_order_number = GREATEST(
    next_order_number,
    COALESCE((
      SELECT MAX(CASE WHEN order_number ~ '^A[0-9]+$' THEN SUBSTRING(order_number FROM 2)::integer ELSE 0 END)
      FROM orders
      WHERE orders.event_id = events.id
    ), 0)
  ),
  updated_at = CURRENT_TIMESTAMP::text
WHERE id = 'afterdark-2026';
