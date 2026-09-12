INSERT INTO events (
  id, slug, title, status, ordering_enabled, starts_at, address, created_at, updated_at
)
VALUES (
  'afterdark-2026',
  'after-dark',
  'Aditya''s Rooftop Party',
  'scheduled',
  false,
  '2026-10-12T19:00:00+01:00',
  'Flat 76, 4 Silvertown Way, Canning Town, E16 1YD',
  CURRENT_TIMESTAMP::text,
  CURRENT_TIMESTAMP::text
)
ON CONFLICT (id) DO NOTHING;
