-- RPC function to fetch org members with identity from auth.users
-- Bypasses profiles RLS so team page can see all members' email/name
CREATE OR REPLACE FUNCTION public.get_org_members(target_org_id uuid)
RETURNS TABLE (
  user_id uuid,
  email text,
  display_name text,
  role text,
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
    om.role,
    om.created_at AS joined_at
  FROM organization_memberships om
  JOIN auth.users au ON au.id = om.user_id
  LEFT JOIN profiles p ON p.id = om.user_id
  WHERE om.org_id = target_org_id
    AND EXISTS (
      SELECT 1 FROM organization_memberships
      WHERE org_id = target_org_id AND user_id = auth.uid()
    )
  ORDER BY om.created_at ASC;
$$;
