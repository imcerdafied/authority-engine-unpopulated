# Build Authority — Required Environment Variables

## Frontend (Vite)

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Backend API endpoint |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |

## Backend (Edge Functions / Secrets)

| Secret | Required | Description |
|---|---|---|
| `SUPABASE_URL` | Yes | Backend URL (auto-provisioned) |
| `SUPABASE_PUBLISHABLE_KEY` | Yes | Anon key (auto-provisioned) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key for admin operations (auto-provisioned) |
| `SUPABASE_DB_URL` | Yes | Direct database connection string (auto-provisioned) |

## Notes

- All frontend variables are prefixed with `VITE_` and are embedded at build time.
- Backend secrets are available in edge functions via `Deno.env.get()`.
- No `.env` files are committed — variables are managed through the platform.
- The nightly backup cron job runs at 03:00 UTC daily.
