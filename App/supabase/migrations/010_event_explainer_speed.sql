-- Persists the playback-speed multiplier used for the seminar explainer
-- TTS render. 1.00 = default cadence; 1.20–1.30 fits long copy into the
-- 60–90 second window typical for short-form reels.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS explainer_speed numeric(3,2) NOT NULL DEFAULT 1.00;

COMMENT ON COLUMN events.explainer_speed IS 'TTS speed multiplier (typical 0.75–2.0). Applied at generate time. Native OpenAI param; ignored by ElevenLabs Turbo (which has no speed control).';
