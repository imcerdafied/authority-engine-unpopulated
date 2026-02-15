
-- Create storage bucket for nightly backups
INSERT INTO storage.buckets (id, name, public) VALUES ('data-backups', 'data-backups', false);

-- Only service role can manage backup files (no public access)
CREATE POLICY "Service role manages backups"
ON storage.objects FOR ALL
USING (bucket_id = 'data-backups' AND auth.role() = 'service_role')
WITH CHECK (bucket_id = 'data-backups' AND auth.role() = 'service_role');
