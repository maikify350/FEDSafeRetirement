-- Adds flyer-attachment columns to the events table.
-- The flyer PDF itself lives in the Supabase Storage `flyers` bucket;
-- only metadata is tracked in the row.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS flyer_path        text,
  ADD COLUMN IF NOT EXISTS flyer_filename    text,
  ADD COLUMN IF NOT EXISTS flyer_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS flyer_uploaded_by uuid;

ALTER TABLE events
  DROP CONSTRAINT IF EXISTS events_flyer_uploaded_by_fkey;

ALTER TABLE events
  ADD CONSTRAINT events_flyer_uploaded_by_fkey
    FOREIGN KEY (flyer_uploaded_by) REFERENCES users(id) ON DELETE SET NULL;

COMMENT ON COLUMN events.flyer_path        IS 'Object path inside the `flyers` storage bucket (e.g. "<event_id>/flyer.pdf"). NULL when no flyer is attached.';
COMMENT ON COLUMN events.flyer_filename    IS 'Original filename at upload time, used to preserve the user-supplied name on download.';
COMMENT ON COLUMN events.flyer_uploaded_at IS 'When the current flyer was uploaded.';
COMMENT ON COLUMN events.flyer_uploaded_by IS 'User who uploaded the current flyer.';
