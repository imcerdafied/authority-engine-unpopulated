-- Add optional sponsor field to strategic bets.
ALTER TABLE public.decisions
  ADD COLUMN IF NOT EXISTS sponsor text;
