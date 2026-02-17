-- Add pod_configuration JSONB column to decisions
ALTER TABLE public.decisions
ADD COLUMN IF NOT EXISTS pod_configuration jsonb;
