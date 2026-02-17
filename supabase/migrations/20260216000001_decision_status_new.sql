-- Add new decision status values: active, accepted, rejected, archived
ALTER TYPE public.decision_status ADD VALUE IF NOT EXISTS 'active';
ALTER TYPE public.decision_status ADD VALUE IF NOT EXISTS 'accepted';
ALTER TYPE public.decision_status ADD VALUE IF NOT EXISTS 'rejected';
ALTER TYPE public.decision_status ADD VALUE IF NOT EXISTS 'archived';

-- Migrate existing rows to active
UPDATE public.decisions
SET status = 'active'::public.decision_status
WHERE status IN ('Draft', 'Active', 'Blocked', 'Closed');

-- Set default for new insertions
ALTER TABLE public.decisions ALTER COLUMN status SET DEFAULT 'active'::public.decision_status;
