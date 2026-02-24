-- Add explicit bet owner account binding for strict ownership checks
ALTER TABLE public.decisions
  ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS decisions_owner_user_id_idx ON public.decisions(owner_user_id);

-- Backfill to creator where possible so existing bets have a deterministic owner account
UPDATE public.decisions
SET owner_user_id = created_by
WHERE owner_user_id IS NULL
  AND created_by IS NOT NULL;
