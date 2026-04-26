-- ============================================================
-- Supabase Storage RLS Policies for 'Buckets' and 'Explainers'
-- Run in Supabase SQL Editor
-- ============================================================

-- FORMS / PDF bucket (named 'Buckets')
-- Authenticated users can upload
CREATE POLICY "Authenticated upload to Buckets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'Buckets');

-- Authenticated users can update/replace existing files
CREATE POLICY "Authenticated update Buckets"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'Buckets');

-- Authenticated users can read
CREATE POLICY "Authenticated read Buckets"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'Buckets');

-- Authenticated users can delete
CREATE POLICY "Authenticated delete Buckets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'Buckets');

-- EXPLAINERS / Audio bucket (named 'Explainers')
-- Authenticated users can upload (server-side TTS job)
CREATE POLICY "Authenticated upload to Explainers"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'Explainers');

-- Authenticated users can update/replace
CREATE POLICY "Authenticated update Explainers"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'Explainers');

-- Public can read (so audio URL plays without auth)
CREATE POLICY "Public read Explainers"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'Explainers');

-- Authenticated users can delete
CREATE POLICY "Authenticated delete Explainers"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'Explainers');
