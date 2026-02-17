-- Ensure platform_integrity displays as "Platform Integrity" in outcome_categories (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'outcome_categories') THEN
    UPDATE public.outcome_categories SET label = 'Platform Integrity' WHERE key = 'platform_integrity';
  END IF;
END $$;
