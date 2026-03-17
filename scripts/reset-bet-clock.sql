-- Reset "days since update" clock for open bets in one workspace.
-- Update the workspace name below before running in Supabase SQL Editor.

-- 1) Preview open bets in target workspace
WITH target_org AS (
  SELECT id
  FROM public.organizations
  WHERE lower(name) = lower('Conviva')
  LIMIT 1
)
SELECT d.id, d.title, d.status::text AS status, d.updated_at
FROM public.decisions d
WHERE d.org_id IN (SELECT id FROM target_org)
  AND d.status::text <> 'closed'
ORDER BY d.created_at ASC;

-- 2) Reset staleness clock (open bets only)
WITH target_org AS (
  SELECT id
  FROM public.organizations
  WHERE lower(name) = lower('Conviva')
  LIMIT 1
)
UPDATE public.decisions d
SET updated_at = now()
WHERE d.org_id IN (SELECT id FROM target_org)
  AND d.status::text <> 'closed'
RETURNING d.id, d.title, d.status::text AS status, d.updated_at;
