-- BSPG launch setup (amended)
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
    jsonb_build_object('key', 'S1', 'label', 'Strategy Execution OS'),
    jsonb_build_object('key', 'S2', 'label', 'Enterprise Platforms'),
    jsonb_build_object('key', 'S3', 'label', 'AI Platforms'),
    jsonb_build_object('key', 'S4', 'label', 'Product Operating Model'),
    jsonb_build_object('key', 'S5', 'label', 'Builder Pods and Delivery'),
    jsonb_build_object('key', 'S6', 'label', 'Studio and Venture')
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

-- Remove prior BSPG launch-template bets that were renamed/retired.
WITH target_org AS (
  SELECT id
  FROM public.organizations
  WHERE lower(name) = lower('BSPG')
  LIMIT 1
),
legacy_titles AS (
  SELECT title FROM (
    VALUES
      ('BSPG defines the AI-native builder category'),
      ('Build Authority becomes the strategy execution OS for enterprises'),
      ('OutcomeOS becomes the executive decision layer for AI product companies'),
      ('BSPG becomes the premium alternative to McKinsey for builders')
  ) AS v(title)
)
DELETE FROM public.decisions d
USING target_org o, legacy_titles l
WHERE d.org_id = o.id
  AND d.title = l.title;

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
        'BSPG defines the AI-native builder organization category',
        'Michael Cerda',
        'BSPG Leadership',
        'Product Operating Model',
        'S4',
        'market_leadership',
        '3 enterprise deployments of the Builder Pod operating model',
        '3 enterprise engagements totaling $3M+ services revenue',
        '$5M annual services opportunity',
        '$2M expected BSPG year-1 revenue',
        '2 clients adopt Builder Pods and publish case studies showing faster product delivery vs traditional consulting'
      ),
      (
        'Build Authority becomes the strategy execution OS for enterprise product organizations',
        'Michael Cerda',
        'BSPG Leadership',
        'Strategy Execution OS',
        'S1',
        'platform_adoption',
        '3 organizations managing strategic bets inside Build Authority',
        '50+ weekly active users across executive and pod leadership roles',
        '$2M annual software licensing opportunity',
        '$1M expected platform revenue',
        'Executives run weekly strategy reviews using Build Authority dashboards'
      ),
      (
        'Strike Crew proves elite small builder teams outperform traditional consulting',
        'Michael Cerda',
        'BSPG Leadership',
        'Builder Pods and Delivery',
        'S5',
        'delivery_velocity',
        'Ship 3 enterprise product platforms with teams under 6 people',
        'Products shipped in under 6 months vs typical 12-18 month enterprise cycles',
        '$4M consulting revenue pipeline',
        '$2.5M expected year-1 services revenue',
        'Clients renew or expand engagement after first product release'
      ),
      (
        'BSPG becomes the premium alternative to McKinsey for product and platform strategy',
        'Michael Cerda',
        'BSPG Leadership',
        'Product Operating Model',
        'S4',
        'market_leadership',
        'Win 2 CEO or PE sponsored strategy engagements',
        '2 marquee clients validating BSPG builder model',
        '$3M consulting and platform revenue opportunity',
        '$1.5M pipeline dependent on positioning',
        'Deals closed where BSPG replaces traditional consulting firms'
      ),
      (
        'Launch one BSPG studio product into paid adoption',
        'Michael Cerda',
        'BSPG Leadership',
        'Studio and Venture',
        'S6',
        'revenue_growth',
        'Release one product and reach 10 paying customers or 1 enterprise pilot',
        'First BSPG standalone product revenue',
        '$5M+ product opportunity',
        '$500K year-1 product revenue',
        'First 10 paid customers or enterprise pilot agreement'
      ),
      (
        'Build Authority becomes the central system connecting strategy, execution, and outcomes',
        'Michael Cerda',
        'BSPG Leadership',
        'Strategy Execution OS',
        'S1',
        'platform_adoption',
        'Organizations run quarterly strategic planning directly inside Build Authority',
        'Leadership teams track bets, pod execution, and outcomes in a single platform',
        '$3M enterprise platform opportunity',
        '$1M expected licensing pipeline',
        'Executive teams conduct quarterly planning cycles entirely within Build Authority'
      )
  ) AS t(
    title,
    owner,
    sponsor,
    product_area,
    solution_domain,
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
    'BSPG defines the AI-native builder organization category',
    'Build Authority becomes the strategy execution OS for enterprise product organizations',
    'Strike Crew proves elite small builder teams outperform traditional consulting',
    'BSPG becomes the premium alternative to McKinsey for product and platform strategy',
    'Launch one BSPG studio product into paid adoption',
    'Build Authority becomes the central system connecting strategy, execution, and outcomes'
  )
ORDER BY d.created_at ASC;
