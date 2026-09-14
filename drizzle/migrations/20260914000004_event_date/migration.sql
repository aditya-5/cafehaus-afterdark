UPDATE events
SET
  starts_at = '2026-10-18T19:00:00+01:00',
  updated_at = CURRENT_TIMESTAMP::text
WHERE id = 'afterdark-2026';
