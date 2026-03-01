-- Refresh bet category model to 5 strategic categories used by the UI.
-- 1) Seed new canonical keys
-- 2) Remap existing decision keys to the new model

INSERT INTO public.outcome_categories (key, label)
VALUES
  ('growth_revenue_expansion', 'Growth (Revenue Expansion)'),
  ('retention_renewal_defense', 'Retention (Renewal Defense)'),
  ('efficiency_cost_capital', 'Efficiency (Cost & Capital)'),
  ('execution_speed_delivery', 'Execution (Speed & Delivery)'),
  ('strategic_positioning', 'Strategic Positioning')
ON CONFLICT (key) DO UPDATE
SET label = EXCLUDED.label;

-- Growth mappings
UPDATE public.decisions
SET outcome_category_key = 'growth_revenue_expansion'
WHERE outcome_category_key IN ('arr', 'product_market_fit', 'product_differentiation');

-- Retention mappings
UPDATE public.decisions
SET outcome_category_key = 'retention_renewal_defense'
WHERE outcome_category_key IN ('renewal_retention', 'risk_trust');

-- Efficiency mappings
UPDATE public.decisions
SET outcome_category_key = 'efficiency_cost_capital'
WHERE outcome_category_key IN ('cost_efficiency', 'capital_allocation');

-- Execution mappings
UPDATE public.decisions
SET outcome_category_key = 'execution_speed_delivery'
WHERE outcome_category_key IN ('execution_velocity');

