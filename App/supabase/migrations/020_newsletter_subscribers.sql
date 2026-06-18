-- Newsletter subscribers table
-- Captures signups from the public FedSafe website newsletter form.
-- Run this in Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS public.newsletter (
    id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Form fields (all required on the frontend)
    first_name        text        NOT NULL DEFAULT '',
    last_name         text        NOT NULL DEFAULT '',
    cell_phone        text        NOT NULL DEFAULT '',
    personal_email    text        NOT NULL DEFAULT '',

    -- Tracking / enrichment
    source_page       text,                                  -- URL the form was submitted from
    referrer          text,                                  -- HTTP Referer header
    ip_address        text,                                  -- client IP for fraud/abuse checks
    user_agent        text,                                  -- browser user-agent string
    sms_consent       boolean     DEFAULT true NOT NULL,     -- consent toggle from the form
    status            text        DEFAULT 'active' NOT NULL
                                  CHECK (status IN ('active', 'unsubscribed', 'bounced')),
    raw_payload       jsonb,                                 -- full original POST body

    -- Audit fields (NON-NEGOTIABLE)
    cre_dt            timestamptz DEFAULT now() NOT NULL,
    cre_by            text        DEFAULT '' NOT NULL,
    mod_dt            timestamptz DEFAULT now() NOT NULL,
    mod_by            text        DEFAULT '' NOT NULL,
    version_no        integer     DEFAULT 1 NOT NULL,

    -- Prevent duplicate email signups
    CONSTRAINT uq_newsletter_email UNIQUE (personal_email)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_newsletter_email   ON public.newsletter (personal_email);
CREATE INDEX IF NOT EXISTS idx_newsletter_status  ON public.newsletter (status);
CREATE INDEX IF NOT EXISTS idx_newsletter_cre_dt  ON public.newsletter (cre_dt DESC);


-- Auto-update mod_dt and version_no on UPDATE
CREATE TRIGGER trg_newsletter_mod_dt
    BEFORE UPDATE ON public.newsletter
    FOR EACH ROW EXECUTE FUNCTION public.update_mod_dt();

-- Row-Level Security
ALTER TABLE public.newsletter ENABLE ROW LEVEL SECURITY;

-- Service role has full access (used by the public API route)
CREATE POLICY "service_role_full" ON public.newsletter USING (true) WITH CHECK (true);

-- Authenticated users can read (for the admin portal)
CREATE POLICY "Authenticated users can read newsletter"
    ON public.newsletter FOR SELECT
    USING (auth.role() = 'authenticated');
