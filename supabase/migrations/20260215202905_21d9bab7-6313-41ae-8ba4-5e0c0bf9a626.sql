
-- Fix: recreate view as SECURITY INVOKER (default, but explicit)
DROP VIEW IF EXISTS public.decisions_computed;

CREATE VIEW public.decisions_computed
WITH (security_invoker = true)
AS
SELECT
  d.*,
  EXTRACT(DAY FROM (now() - d.created_at))::INTEGER AS age_days,
  COALESCE(d.slice_deadline_days, 10) - EXTRACT(DAY FROM (now() - d.created_at))::INTEGER AS slice_remaining,
  EXTRACT(DAY FROM (now() - d.created_at))::INTEGER > COALESCE(d.slice_deadline_days, 10) AS is_exceeded,
  COALESCE(d.slice_deadline_days, 10) - EXTRACT(DAY FROM (now() - d.created_at))::INTEGER BETWEEN 0 AND 3 AS is_urgent,
  EXTRACT(DAY FROM (now() - d.created_at))::INTEGER > 7 AS is_aging,
  d.outcome_category IS NULL AS is_unbound,
  d.status = 'Blocked' AND EXTRACT(DAY FROM (now() - d.created_at))::INTEGER > 7 AS needs_exec_attention
FROM public.decisions d;

GRANT SELECT ON public.decisions_computed TO authenticated;
GRANT SELECT ON public.decisions_computed TO anon;
