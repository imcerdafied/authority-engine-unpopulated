# Build Authority — Required Environment Variables

## Frontend (Vite)

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Backend API endpoint |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `VITE_GOOGLE_WORKSPACE_DOMAIN` | Optional | Restricts Google OAuth account chooser to your Workspace domain via `hd` hint |

## Backend (Edge Functions / Secrets)

| Secret | Required | Description |
|---|---|---|
| `SUPABASE_URL` | Yes | Backend URL (auto-provisioned) |
| `SUPABASE_ANON_KEY` or `SUPABASE_PUBLISHABLE_KEY` | Yes | Used for server-side user token verification |
| `SUPABASE_PUBLISHABLE_KEY` | Yes | Anon key (auto-provisioned) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key for admin operations (auto-provisioned) |
| `SUPABASE_DB_URL` | Yes | Direct database connection string (auto-provisioned) |
| `BACKUP_CRON_SECRET` | Yes | Shared secret sent as `x-backup-secret` to authorize nightly backups |
| `RESEND_API_KEY` | Optional | Resend API key for sending weekly bet reminder emails |
| `REMINDER_CRON_SECRET` | Optional | Shared secret sent as `x-reminder-secret` to authorize weekly reminders |

## Notes

- All frontend variables are prefixed with `VITE_` and are embedded at build time.
- Backend secrets are available in edge functions via `Deno.env.get()`.
- No `.env` files are committed — variables are managed through the platform.
- The nightly backup cron job runs at 03:00 UTC daily.
- The weekly bet reminder runs every Friday at 15:00 UTC (8am PT). Requires `RESEND_API_KEY` and `REMINDER_CRON_SECRET`.
- Google SSO is the only supported login path in the app UI.
- Workspace-domain enforcement is configured in DB via `public.auth_settings.workspace_domain` (set to `NULL` to disable).
