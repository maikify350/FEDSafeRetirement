-- App-wide key/value settings (used for echowin sync state, etc.)
CREATE TABLE IF NOT EXISTS public.app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Service role can read/write; no public access
CREATE POLICY "service_role_only" ON public.app_settings
  USING (true)
  WITH CHECK (true);
