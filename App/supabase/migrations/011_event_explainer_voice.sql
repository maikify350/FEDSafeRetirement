-- Stores the TTS voice and provider selected for each event's explainer audio.
-- explainer_voice  — OpenAI voice name (onyx/echo/fable) or ElevenLabs voice ID
-- explainer_provider — 'openai' (default) | 'elevenlabs'

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS explainer_voice    text,
  ADD COLUMN IF NOT EXISTS explainer_provider text NOT NULL DEFAULT 'openai';

COMMENT ON COLUMN events.explainer_voice    IS 'TTS voice: OpenAI voice name (onyx, echo, fable) or ElevenLabs voice ID. NULL = use server default.';
COMMENT ON COLUMN events.explainer_provider IS 'TTS provider: openai (default) or elevenlabs.';
