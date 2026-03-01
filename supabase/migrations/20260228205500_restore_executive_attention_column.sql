-- Restore column required by compute_decision_fields trigger.
-- Without this, any UPDATE on decisions fails with:
-- record "new" has no field "executive_attention_required"

ALTER TABLE public.decisions
  ADD COLUMN IF NOT EXISTS executive_attention_required boolean NOT NULL DEFAULT false;

