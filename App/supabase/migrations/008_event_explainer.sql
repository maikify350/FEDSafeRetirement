-- Adds explainer-audio columns to the events table.
-- The MP3 lives alongside the flyer PDF in the `flyers` storage bucket
-- under the same per-event folder: <event_id>/explainer.mp3
-- Only metadata is tracked in the row.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS explainer_path        text,
  ADD COLUMN IF NOT EXISTS explainer_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS explainer_uploaded_by uuid;

ALTER TABLE events
  DROP CONSTRAINT IF EXISTS events_explainer_uploaded_by_fkey;

ALTER TABLE events
  ADD CONSTRAINT events_explainer_uploaded_by_fkey
    FOREIGN KEY (explainer_uploaded_by) REFERENCES users(id) ON DELETE SET NULL;

COMMENT ON COLUMN events.explainer_path        IS 'Object path inside the `flyers` storage bucket for the seminar explainer MP3 (e.g. "<event_id>/explainer.mp3"). NULL when no explainer has been generated.';
COMMENT ON COLUMN events.explainer_uploaded_at IS 'When the current explainer MP3 was generated/uploaded.';
COMMENT ON COLUMN events.explainer_uploaded_by IS 'User who triggered the most recent explainer generation.';
