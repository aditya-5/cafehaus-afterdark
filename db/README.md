# Caféhaus event database

The schema is PostgreSQL-backed through an external Postgres provider (Neon is
the planned provider) and lives in `schema.ts`. Drizzle applies the ordered SQL
migrations in `../drizzle/migrations/` during the Netlify build. The second
migration seeds Aditya's Rooftop Party for 12 October 2026.

The production API reads `DATABASE_URL` and `ADMIN_API_KEY` from Netlify's
server environment. Guest endpoints authenticate with the opaque invitation
token; host endpoints use the admin key.

Core API surface:

- `GET /api/events?slug=after-dark` — public event metadata and guest list
- `POST /api/events` — create an event (host auth)
- `GET/POST /api/invitations` — list or create invitations (host auth)
- `GET/POST /api/invitations/token/:token` — open an invitation or save RSVP
- `POST /api/invitations/token/:token/request-tokens` — request more tokens
- `GET/POST /api/orders` — read or place one-token orders
- `PATCH /api/orders/:id` — edit or cancel a queued order
- `PATCH /api/host/orders/:id` — advance an order through service states
- `POST /api/host/tokens` — add/reset/fulfil guest tokens
- `PATCH /api/host/events/:id` — toggle ordering or end the event
