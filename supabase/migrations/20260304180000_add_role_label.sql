-- Add optional free-text role label to organization_memberships
ALTER TABLE public.organization_memberships
  ADD COLUMN IF NOT EXISTS role_label TEXT;
