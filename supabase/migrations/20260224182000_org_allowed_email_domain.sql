-- Per-organization email-domain restriction for invite-link join flow.
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS allowed_email_domain text;

-- Backfill from creator email domain where possible.
UPDATE public.organizations o
SET allowed_email_domain = lower(split_part(u.email, '@', 2))
FROM auth.users u
WHERE o.allowed_email_domain IS NULL
  AND o.created_by = u.id
  AND position('@' in u.email) > 0;
