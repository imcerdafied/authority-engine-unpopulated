-- Add org-specific product areas and outcome categories
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS product_areas jsonb NOT NULL DEFAULT '[
    {"key": "S1", "label": "Video"},
    {"key": "S2", "label": "DPI"},
    {"key": "S3", "label": "Agent Intelligence"}
  ]'::jsonb;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS custom_outcome_categories jsonb DEFAULT NULL;
