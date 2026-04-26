-- ============================================================
-- FEDSafe: forms table + Storage buckets + seed data
-- Apply in Supabase SQL Editor
-- ============================================================

-- 1. Create the forms table
CREATE TABLE IF NOT EXISTS public.forms (
  id              UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id         VARCHAR(12)   NOT NULL UNIQUE,
  aka             VARCHAR(30)   NULL,
  title           VARCHAR(60)   NOT NULL,
  description     TEXT          NULL,
  tags            VARCHAR(40)   NULL,
  source_url      VARCHAR(100)  NULL,
  instruct_pages  VARCHAR(8)    NULL,
  fill_pages      VARCHAR(8)    NULL,
  form_url        VARCHAR(500)  NULL,        -- Supabase Storage 'Forms' bucket path
  summary         TEXT          NULL,        -- TTS-ready explainer summary
  explainer_url   VARCHAR(500)  NULL,        -- Supabase Storage 'Explainer' bucket path (.mp3)
  -- Audit / control fields (non-negotiable)
  cre_dt          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  cre_by          VARCHAR(100)  NOT NULL DEFAULT 'system',
  mod_dt          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  mod_by          VARCHAR(100)  NOT NULL DEFAULT 'system',
  version_no      INTEGER       NOT NULL DEFAULT 1
);

-- 2. Index on form_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_forms_form_id ON public.forms (form_id);

-- 3. RLS — read by all authenticated, write by admin only
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "forms_select" ON public.forms;
CREATE POLICY "forms_select" ON public.forms
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "forms_insert" ON public.forms;
CREATE POLICY "forms_insert" ON public.forms
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "forms_update" ON public.forms;
CREATE POLICY "forms_update" ON public.forms
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "forms_delete" ON public.forms;
CREATE POLICY "forms_delete" ON public.forms
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 4. Seed the 6 initial forms
INSERT INTO public.forms
  (form_id, aka, title, description, tags, source_url, instruct_pages, fill_pages, cre_by, mod_by)
VALUES
  (
    'SF-2818',
    'FEGLI Cont.',
    'Continuation of Life Insurance Coverage',
    'Used by employees to continue FEGLI life insurance coverage into retirement or after separation.',
    'FEGLI,Life Insurance,Retirement',
    'https://www.opm.gov/forms/pdf_fill/sf2818.pdf',
    '1-2',
    '3-4',
    'system', 'system'
  ),
  (
    'SF-2823',
    'FEGLI Benefic.',
    'Designation of Beneficiary (FEGLI)',
    'Designates who receives FEGLI life insurance benefits upon the insured employee or annuitant''s death.',
    'FEGLI,Beneficiary,Life Insurance',
    'https://www.opm.gov/forms/pdf_fill/sf2823.pdf',
    '1-2',
    '3',
    'system', 'system'
  ),
  (
    'SF-3102',
    'FERS Benefic.',
    'Designation of Beneficiary (FERS)',
    'Designates beneficiaries for FERS retirement benefits, lump-sum payments, and survivor annuities.',
    'FERS,Beneficiary,Retirement',
    'https://www.opm.gov/forms/pdf_fill/sf3102.pdf',
    '1-2',
    '3',
    'system', 'system'
  ),
  (
    'SF-3107-2',
    'Retirement App',
    'Application for Immediate Retirement',
    'Primary application form for federal employees under FERS electing an immediate retirement annuity.',
    'FERS,Retirement,Application',
    'https://www.opm.gov/forms/pdf_fill/sf3107.pdf',
    '1-7',
    '8-11',
    'system', 'system'
  ),
  (
    'W4P',
    'W-4P',
    'Withholding Certificate for Pension or Annuity',
    'Tells OPM how much federal income tax to withhold from periodic pension or annuity payments.',
    'Tax,Withholding,Annuity',
    'https://www.irs.gov/pub/irs-pdf/fw4p.pdf',
    '1-3',
    '4',
    'system', 'system'
  ),
  (
    'SF-2809',
    'FEHB Election',
    'Health Benefits Election Form',
    'Used to enroll in, change, or cancel Federal Employees Health Benefits (FEHB) coverage.',
    'FEHB,Health Insurance,Benefits',
    'https://www.opm.gov/forms/pdf_fill/sf2809.pdf',
    '1-3',
    '4-6',
    'system', 'system'
  )
ON CONFLICT (form_id) DO NOTHING;

-- 5. Storage buckets (run these separately if SQL Editor doesn't support storage commands)
-- In Supabase Dashboard > Storage, create two buckets:
--   • "Forms"     — public: false (authenticated access only)
--   • "Explainer" — public: true  (so audio can be played via URL without auth)
--
-- Or via Supabase client:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('Forms', 'Forms', false) ON CONFLICT DO NOTHING;
-- INSERT INTO storage.buckets (id, name, public) VALUES ('Explainer', 'Explainer', true) ON CONFLICT DO NOTHING;
