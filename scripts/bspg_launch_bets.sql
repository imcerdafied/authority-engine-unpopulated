-- BSPG launch setup
-- Prerequisites:
-- 1) supabase/migrations/20260305213000_add_decision_sponsor.sql
-- 2) supabase/migrations/20260305223000_extend_solution_domain_and_high_impact_cap.sql

BEGIN;

DO $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT id INTO v_org_id
  FROM public.organizations
  WHERE lower(name) = lower('BSPG')
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Workspace not found: BSPG';
  END IF;
END
$$;

-- Ensure outcome category keys exist in canonical table before writing decisions.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'outcome_categories'
  ) THEN
    INSERT INTO public.outcome_categories (key, label)
    VALUES
      ('revenue_growth', 'Revenue Growth'),
      ('platform_adoption', 'Platform Adoption'),
      ('market_leadership', 'Market Leadership'),
      ('delivery_velocity', 'Delivery Velocity'),
      ('operational_efficiency', 'Operational Efficiency'),
      ('product_quality_and_reliability', 'Product Quality and Reliability')
    ON CONFLICT (key) DO UPDATE
    SET label = EXCLUDED.label;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'outcome_categories'
        AND column_name = 'is_active'
    ) THEN
      UPDATE public.outcome_categories
      SET is_active = true
      WHERE key IN (
        'revenue_growth',
        'platform_adoption',
        'market_leadership',
        'delivery_velocity',
        'operational_efficiency',
        'product_quality_and_reliability'
      );
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'outcome_categories'
        AND column_name = 'sort_order'
    ) THEN
      UPDATE public.outcome_categories oc
      SET sort_order = v.sort_order
      FROM (
        VALUES
          ('revenue_growth', 1),
          ('platform_adoption', 2),
          ('market_leadership', 3),
          ('delivery_velocity', 4),
          ('operational_efficiency', 5),
          ('product_quality_and_reliability', 6)
      ) AS v(key, sort_order)
      WHERE oc.key = v.key;
    END IF;
  END IF;
END
$$;

-- Part A: dropdown options for BSPG
WITH target_org AS (
  SELECT id
  FROM public.organizations
  WHERE lower(name) = lower('BSPG')
  LIMIT 1
)
UPDATE public.organizations o
SET
  product_areas = jsonb_build_array(
    jsonb_build_object('key', 'S1', 'label', 'AI Platforms'),
    jsonb_build_object('key', 'S2', 'label', 'Enterprise Platforms'),
    jsonb_build_object('key', 'S3', 'label', 'Strategy Execution OS'),
    jsonb_build_object('key', 'S4', 'label', 'Decision Intelligence'),
    jsonb_build_object('key', 'S5', 'label', 'Product Operating Model'),
    jsonb_build_object('key', 'S6', 'label', 'Builder Pods and Delivery'),
    jsonb_build_object('key', 'S7', 'label', 'Studio and Venture')
  ),
  custom_outcome_categories = jsonb_build_array(
    jsonb_build_object('key', 'revenue_growth', 'label', 'Revenue Growth'),
    jsonb_build_object('key', 'platform_adoption', 'label', 'Platform Adoption'),
    jsonb_build_object('key', 'market_leadership', 'label', 'Market Leadership'),
    jsonb_build_object('key', 'delivery_velocity', 'label', 'Delivery Velocity'),
    jsonb_build_object('key', 'operational_efficiency', 'label', 'Operational Efficiency'),
    jsonb_build_object('key', 'product_quality_and_reliability', 'label', 'Product Quality and Reliability')
  )
WHERE o.id IN (SELECT id FROM target_org);

-- Part B: create/update BSPG launch bets (idempotent by title within org)
WITH target_org AS (
  SELECT id
  FROM public.organizations
  WHERE lower(name) = lower('BSPG')
  LIMIT 1
),
seed_rows AS (
  SELECT *
  FROM (
    VALUES
      (
        'BSPG defines the AI-native builder category',
        'Michael Cerda',
        'BSPG Leadership',
        'Product Operating Model',
        'S5',
        'Market Leadership',
        'market_leadership',
        '3 referenceable enterprise deployments of the Builder Pod model',
        '3 signed engagements totaling $3.0M+ in services value',
        '$5.0M annual services and licensing potential',
        '$2.0M expected year-1 BSPG revenue',
        '2 clients publish (or approve) case studies showing faster ship cycles and higher outcome delivery vs prior model'
      ),
      (
        'Build Authority becomes the strategy execution OS for enterprises',
        'Michael Cerda',
        'BSPG Leadership',
        'Strategy Execution OS',
        'S3',
        'Platform Adoption',
        'platform_adoption',
        '3 organizations actively running quarterly bets and pod execution inside Build Authority',
        '50+ weekly active executive and pod-lead users across deployments',
        '$1.5M annual licensing potential',
        '$750K expected licensing revenue in year-1 pipeline',
        'Weekly exec reviews run directly from Build Authority in at least 2 deployments for 4 consecutive weeks'
      ),
      (
        'OutcomeOS becomes the executive decision layer for AI product companies',
        'Michael Cerda',
        'BSPG Leadership',
        'Decision Intelligence',
        'S4',
        'Platform Adoption',
        'platform_adoption',
        '2 enterprise deployments connecting conversational signals to downstream outcomes and decisions',
        '1 shared "decision review" dashboard becomes the standard weekly operating view for leadership',
        '$2.0M annual software licensing potential',
        '$1.0M expected software revenue in year-1 pipeline',
        'Executives explicitly use OutcomeOS in weekly business reviews and cite it in at least 6 decisions over a month'
      ),
      (
        'Strike Crew proves elite small teams can outperform big consulting',
        'Michael Cerda',
        'BSPG Leadership',
        'Builder Pods and Delivery',
        'S6',
        'Delivery Velocity',
        'delivery_velocity',
        'Ship 3 meaningful production releases with teams of 6 or fewer within 90 days of kickoff',
        'Deliver in <6 months what would typically take 12-18 months',
        '$4.0M annual delivery revenue potential',
        '$2.5M expected year-1 delivery pipeline',
        '2 clients renew or expand scope within 30 days of first production shipment'
      ),
      (
        'BSPG launches one studio product into paid adoption',
        'Michael Cerda',
        'BSPG Leadership',
        'Studio and Venture',
        'S7',
        'Revenue Growth',
        'revenue_growth',
        'Launch one product (e.g., Timeless Moment, TrueNorth, or another studio build) to 10 paying customers or 1 enterprise pilot',
        'First standalone software revenue stream independent of services',
        '$5.0M+ long-term product upside',
        '$500K expected year-1 product revenue target',
        'First 10 paid seats or first enterprise pilot signed with defined renewal path'
      ),
      (
        'BSPG becomes the premium alternative to McKinsey for builders',
        'Michael Cerda',
        'BSPG Leadership',
        'Product Operating Model',
        'S5',
        'Market Leadership',
        'market_leadership',
        'Win 2 CEO-level or PE-sponsored engagements where BSPG is chosen explicitly over traditional consulting',
        '2 marquee logos plus executive references that unlock follow-on deal flow',
        '$3.0M annual high-end advisory and build revenue potential',
        '$1.5M of year-1 top-of-funnel dependent on positioning',
        '2 closed-won deals where buyer cites "working systems shipped" and "AI-native builder pods" as the decisive differentiator'
      )
  ) AS t(
    title,
    owner,
    sponsor,
    product_area,
    solution_domain,
    outcome_category_label,
    outcome_category_key,
    outcome_target,
    expected_impact,
    exposure_value,
    revenue_at_risk,
    trigger_signal
  )
),
updated AS (
  UPDATE public.decisions d
  SET
    owner = s.owner,
    sponsor = s.sponsor,
    surface = s.product_area,
    solution_domain = s.solution_domain::public.solution_domain,
    impact_tier = 'High',
    risk_level = 'healthy',
    outcome_category_key = s.outcome_category_key,
    outcome_target = s.outcome_target,
    expected_impact = s.expected_impact,
    exposure_value = s.exposure_value,
    revenue_at_risk = s.revenue_at_risk,
    trigger_signal = s.trigger_signal
  FROM seed_rows s, target_org o
  WHERE d.org_id = o.id
    AND d.title = s.title
  RETURNING d.id, d.title
)
INSERT INTO public.decisions (
  org_id,
  title,
  owner,
  sponsor,
  surface,
  solution_domain,
  impact_tier,
  status,
  risk_level,
  outcome_category_key,
  outcome_target,
  expected_impact,
  exposure_value,
  revenue_at_risk,
  trigger_signal
)
SELECT
  o.id,
  s.title,
  s.owner,
  s.sponsor,
  s.product_area,
  s.solution_domain::public.solution_domain,
  'High',
  'defined',
  'healthy',
  s.outcome_category_key,
  s.outcome_target,
  s.expected_impact,
  s.exposure_value,
  s.revenue_at_risk,
  s.trigger_signal
FROM seed_rows s, target_org o
WHERE NOT EXISTS (
  SELECT 1
  FROM public.decisions d
  WHERE d.org_id = o.id
    AND d.title = s.title
);

COMMIT;

-- Verification: expect 6 rows with matching labels
WITH target_org AS (
  SELECT id
  FROM public.organizations
  WHERE lower(name) = lower('BSPG')
  LIMIT 1
),
cats AS (
  SELECT
    o.id AS org_id,
    c->>'key' AS key,
    c->>'label' AS label
  FROM public.organizations o
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(o.custom_outcome_categories::jsonb, '[]'::jsonb)) c
  WHERE o.id IN (SELECT id FROM target_org)
)
SELECT
  d.title,
  d.surface AS product_area,
  COALESCE(c.label, d.outcome_category_key) AS outcome_category,
  d.owner,
  d.sponsor,
  d.status::text AS status
FROM public.decisions d
LEFT JOIN cats c
  ON c.org_id = d.org_id
 AND c.key = d.outcome_category_key
WHERE d.org_id IN (SELECT id FROM target_org)
  AND d.title IN (
    'BSPG defines the AI-native builder category',
    'Build Authority becomes the strategy execution OS for enterprises',
    'OutcomeOS becomes the executive decision layer for AI product companies',
    'Strike Crew proves elite small teams can outperform big consulting',
    'BSPG launches one studio product into paid adoption',
    'BSPG becomes the premium alternative to McKinsey for builders'
  )
ORDER BY d.created_at ASC;
