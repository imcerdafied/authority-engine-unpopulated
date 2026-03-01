-- Seed script: adds metrics and initiatives to the first decision in the database.
-- Run against your Supabase database:
--   psql $DATABASE_URL < scripts/seed-pilot-bet.sql
-- Or paste into the Supabase SQL editor.

DO $$
DECLARE
  _bet_id uuid;
BEGIN
  -- Pick the first existing decision
  SELECT id INTO _bet_id FROM public.decisions ORDER BY created_at ASC LIMIT 1;
  IF _bet_id IS NULL THEN
    RAISE NOTICE 'No decisions found — create a bet first.';
    RETURN;
  END IF;

  RAISE NOTICE 'Seeding converged engine data for decision %', _bet_id;

  -- ── Metrics (3 outcome tracks) ──
  INSERT INTO public.bet_metrics (bet_id, outcome_key, metric_name, target_value, current_value, status) VALUES
    (_bet_id, 'retention',  '90-day renewal rate',    95,  88,  'AtRisk'),
    (_bet_id, 'revenue',    'Expansion ARR ($K)',     500, 420, 'OnTrack'),
    (_bet_id, 'activation', 'Day-7 activation rate',  70,  32,  'OffTrack');

  -- ── Initiatives (5 with varying V/C/E and outcome alignments) ──
  INSERT INTO public.bet_initiatives
    (bet_id, description, aligned_outcomes, value, confidence, effort, outcome_multiplier, score_v3, roadmap_position, last_score_delta)
  VALUES
    (_bet_id, 'Launch proactive churn-risk alerts for CS team',
     '["retention"]',                  8, 0.7, 4, 1.15, (8*0.7*1.15)/4, 1, 0),
    (_bet_id, 'Build expansion playbook for mid-market segment',
     '["revenue"]',                    7, 0.8, 5, 1.15, (7*0.8*1.15)/5, 2, 0),
    (_bet_id, 'Redesign onboarding flow to reduce time-to-value',
     '["activation","retention"]',     9, 0.6, 7, 1.30, (9*0.6*1.30)/7, 3, 0),
    (_bet_id, 'Ship self-serve usage dashboard for champions',
     '["activation","revenue"]',       6, 0.5, 3, 1.30, (6*0.5*1.30)/3, 4, 0),
    (_bet_id, 'Automate QBR deck generation from product telemetry',
     '["retention","revenue","activation"]', 5, 0.4, 6, 1.45, (5*0.4*1.45)/6, 5, 0);

  -- ── Monitoring (initial clean state) ──
  INSERT INTO public.bet_monitoring (bet_id, drift_flags, last_recalculated_at)
  VALUES (_bet_id, '[]', now())
  ON CONFLICT (bet_id) DO UPDATE SET drift_flags = '[]', last_recalculated_at = now();

  RAISE NOTICE 'Seed complete: 3 metrics, 5 initiatives, monitoring row created.';
END $$;
