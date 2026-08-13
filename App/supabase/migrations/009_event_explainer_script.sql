-- Persists the script text used to generate the seminar explainer MP3.
-- Lets admins edit the wording and re-render the audio without losing
-- their edits. NULL means the API will fall back to the default template
-- built from the event row.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS explainer_script text;

COMMENT ON COLUMN events.explainer_script IS 'The narration script that produced the current explainer MP3. Editable; on re-generate the saved script is used verbatim. NULL means use the default template (date + city + state filled in from the event row).';
