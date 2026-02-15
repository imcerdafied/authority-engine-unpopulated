
-- Fix security definer view by recreating with security_invoker
DROP VIEW IF EXISTS public.decisions_computed;
CREATE VIEW public.decisions_computed
WITH (security_invoker=on) AS
SELECT
  d.*,
  EXTRACT(DAY FROM (now() - d.created_at))::integer AS age_days,
  CASE
    WHEN d.slice_due_at IS NOT NULL
    THEN EXTRACT(DAY FROM (d.slice_due_at - now()))::integer
    ELSE (COALESCE(d.slice_deadline_days, 10) - EXTRACT(DAY FROM (now() - d.created_at))::integer)
  END AS slice_remaining,
  CASE
    WHEN d.status = 'Active' AND d.slice_due_at IS NOT NULL AND now() > d.slice_due_at THEN true
    WHEN d.status = 'Active' AND d.slice_due_at IS NULL AND EXTRACT(DAY FROM (now() - d.created_at))::integer > COALESCE(d.slice_deadline_days, 10) THEN true
    ELSE false
  END AS is_exceeded,
  CASE
    WHEN d.status = 'Active' THEN
      CASE
        WHEN d.slice_due_at IS NOT NULL THEN EXTRACT(DAY FROM (d.slice_due_at - now()))::integer BETWEEN 0 AND 3
        ELSE (COALESCE(d.slice_deadline_days, 10) - EXTRACT(DAY FROM (now() - d.created_at))::integer) BETWEEN 0 AND 3
      END
    ELSE false
  END AS is_urgent,
  (d.status = 'Active' AND EXTRACT(DAY FROM (now() - d.created_at))::integer > 14) AS is_aging,
  (d.status = 'Active' AND d.outcome_target IS NULL) AS is_unbound,
  (d.status = 'Blocked' AND EXTRACT(DAY FROM (now() - d.created_at))::integer > 7) AS needs_exec_attention
FROM public.decisions d;
