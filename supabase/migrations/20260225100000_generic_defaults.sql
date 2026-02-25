-- Update default product areas to generic placeholders instead of Conviva-specific values
ALTER TABLE public.organizations
  ALTER COLUMN product_areas SET DEFAULT '[
    {"key": "S1", "label": "Area 1"},
    {"key": "S2", "label": "Area 2"},
    {"key": "S3", "label": "Area 3"}
  ]'::jsonb;
