-- ============================================================
-- Supabase Storage: loss_runs bucket
-- Run this in the Supabase SQL Editor.
-- ============================================================

-- 1. Create the bucket (private — files accessed via signed URLs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'loss-runs',
  'loss-runs',
  false,
  20971520,   -- 20 MB max per file
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/tiff']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Authenticated users can upload
CREATE POLICY "Authenticated users can upload loss runs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'loss-runs');

-- 3. Authenticated users can read
CREATE POLICY "Authenticated users can read loss runs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'loss-runs');

-- 4. Authenticated users can delete
CREATE POLICY "Authenticated users can delete loss runs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'loss-runs');

-- 5. Track uploaded loss runs linked to a client or prospect
CREATE TABLE IF NOT EXISTS loss_run_uploads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID REFERENCES clients(id) ON DELETE CASCADE,
  storage_path  TEXT NOT NULL,
  file_name     TEXT NOT NULL,
  uploaded_by   UUID NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE loss_run_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage loss_run_uploads"
ON loss_run_uploads FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
