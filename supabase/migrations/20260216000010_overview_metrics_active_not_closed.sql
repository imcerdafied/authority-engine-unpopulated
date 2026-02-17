-- Update get_overview_metrics: count all statuses EXCEPT 'closed' as active.
-- Active states: hypothesis, defined, piloting, scaling, at_risk, legacy active.
-- Only closed frees a slot.
CREATE OR REPLACE FUNCTION public.get_overview_metrics(_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  v_active_high integer;
  v_blocked_gt5 integer;
  v_unlinked_signals integer;
  v_decision_latency numeric;
  v_overdue_slices integer;
  v_total_active integer;
  v_blocked_count integer;
  v_friction_score numeric;
  v_friction_level text;
  v_friction_drivers jsonb;
  v_drivers text[] := '{}';
BEGIN
  -- Active High-Impact: count(decisions where impact_tier=High and status <> closed)
  SELECT COUNT(*) INTO v_active_high
  FROM decisions
  WHERE org_id = _org_id AND status::text <> 'closed' AND impact_tier = 'High';

  -- Total active decisions (all statuses except closed)
  SELECT COUNT(*) INTO v_total_active
  FROM decisions
  WHERE org_id = _org_id AND status::text <> 'closed';

  -- Blocked > 5 Days: decisions where status=Blocked and age > 5
  SELECT COUNT(*) INTO v_blocked_gt5
  FROM decisions
  WHERE org_id = _org_id
    AND status = 'Blocked'
    AND EXTRACT(DAY FROM (now() - created_at))::integer > 5;

  -- Total blocked
  SELECT COUNT(*) INTO v_blocked_count
  FROM decisions
  WHERE org_id = _org_id AND status = 'Blocked';

  -- Unlinked Signals: signals where decision_id is null
  SELECT COUNT(*) INTO v_unlinked_signals
  FROM signals
  WHERE org_id = _org_id AND decision_id IS NULL;

  -- Decision Latency: avg days between linked signal created_at and decision created_at
  SELECT COALESCE(
    ROUND(AVG(EXTRACT(DAY FROM (d.created_at - s.created_at))::numeric), 1),
    0
  ) INTO v_decision_latency
  FROM signals s
  JOIN decisions d ON d.id = s.decision_id
  WHERE s.org_id = _org_id AND s.decision_id IS NOT NULL;

  -- Overdue slices: active (non-closed) decisions past their slice_due_at
  SELECT COUNT(*) INTO v_overdue_slices
  FROM decisions
  WHERE org_id = _org_id
    AND status::text <> 'closed'
    AND slice_due_at IS NOT NULL
    AND now() > slice_due_at;

  -- Operating Friction score
  -- Components:
  --   overdue slices * 15
  --   blocked decisions * 10
  --   high-impact capacity saturation: (active_high / 5) * 20
  --   unlinked signals * 5
  v_friction_score := (v_overdue_slices * 15.0)
    + (v_blocked_count * 10.0)
    + ((v_active_high::numeric / 5.0) * 20.0)
    + (v_unlinked_signals * 5.0);

  IF v_friction_score > 60 THEN
    v_friction_level := 'High';
  ELSIF v_friction_score > 30 THEN
    v_friction_level := 'Moderate';
  ELSE
    v_friction_level := 'Low';
  END IF;

  -- Friction drivers
  IF v_overdue_slices > 0 THEN
    v_drivers := array_append(v_drivers, v_overdue_slices || ' overdue slices');
  END IF;
  IF v_blocked_count > 0 THEN
    v_drivers := array_append(v_drivers, v_blocked_count || ' blocked decisions');
  END IF;
  IF v_active_high >= 5 THEN
    v_drivers := array_append(v_drivers, 'high-impact capacity saturated');
  END IF;
  IF v_unlinked_signals > 0 THEN
    v_drivers := array_append(v_drivers, v_unlinked_signals || ' unlinked signals');
  END IF;

  result := jsonb_build_object(
    'active_high_impact', v_active_high,
    'blocked_gt5_days', v_blocked_gt5,
    'unlinked_signals', v_unlinked_signals,
    'decision_latency_days', v_decision_latency,
    'overdue_slices', v_overdue_slices,
    'total_active', v_total_active,
    'blocked_count', v_blocked_count,
    'friction_score', ROUND(v_friction_score),
    'friction_level', v_friction_level,
    'friction_drivers', to_jsonb(v_drivers),
    'at_capacity', v_active_high >= 5
  );

  RETURN result;
END;
$$;
