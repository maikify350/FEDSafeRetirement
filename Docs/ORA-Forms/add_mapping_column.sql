ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS mapping JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.forms.mapping IS 'ACT auto-fill mapping rules. Array of { pdf_field, act_field, handling, sources?, template?, value?, note }';
