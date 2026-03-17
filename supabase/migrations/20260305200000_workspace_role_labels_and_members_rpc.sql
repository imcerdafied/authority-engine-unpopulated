-- Multi-workspace role label support + org members RPC shape update.
-- Safe to run multiple times.

ALTER TABLE public.organization_memberships
  ADD COLUMN IF NOT EXISTS role_label text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'pending_invitations'
  ) THEN
    ALTER TABLE public.pending_invitations
      ADD COLUMN IF NOT EXISTS role_label text;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_org_members(target_org_id uuid)
RETURNS TABLE (
  user_id uuid,
  email text,
  display_name text,
  role text,
  role_label text,
  joined_at timestamptz
) SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$
  SELECT
    om.user_id,
    COALESCE(p.email, au.email, '') AS email,
    COALESCE(p.display_name, au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name', '') AS display_name,
    om.role::text,
    om.role_label,
    om.created_at AS joined_at
  FROM public.organization_memberships om
  JOIN auth.users au ON au.id = om.user_id
  LEFT JOIN public.profiles p ON p.id = om.user_id
  WHERE om.org_id = target_org_id
    AND EXISTS (
      SELECT 1
      FROM public.organization_memberships
      WHERE org_id = target_org_id
        AND user_id = auth.uid()
    )
  ORDER BY om.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_org_members(uuid) TO authenticated;
