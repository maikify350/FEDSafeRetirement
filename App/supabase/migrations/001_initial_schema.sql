-- FEDSafe Retirement Lead Manager — Initial Schema Migration
-- Version: 1.0
-- Date: 2026-04-01
-- Description: Creates all tables, indexes, triggers, and RLS policies

-- ============================================================================
-- 1. UTILITY FUNCTIONS
-- ============================================================================

-- Auto-update mod_dt and version_no on UPDATE
CREATE OR REPLACE FUNCTION public.update_mod_dt() RETURNS trigger AS $$
BEGIN
    NEW.mod_dt = now();
    NEW.version_no = OLD.version_no + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-update search_vector on leads INSERT/UPDATE
CREATE OR REPLACE FUNCTION public.leads_search_vector_update() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        to_tsvector('english',
            coalesce(NEW.first_name, '') || ' ' ||
            coalesce(NEW.last_name, '') || ' ' ||
            coalesce(NEW.middle_initial, '') || ' ' ||
            coalesce(NEW.occupation_title, '') || ' ' ||
            coalesce(NEW.facility_name, '') || ' ' ||
            coalesce(NEW.facility_city, '') || ' ' ||
            coalesce(NEW.facility_state, '') || ' ' ||
            coalesce(NEW.facility_zip_code, '')
        );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. USERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.users (
    id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    email             text        NOT NULL UNIQUE,
    first_name        text        NOT NULL DEFAULT '',
    last_name         text        NOT NULL DEFAULT '',
    phone             text        DEFAULT '',
    role              text        NOT NULL DEFAULT 'viewer'
                                  CHECK (role IN ('admin', 'advisor', 'viewer')),
    avatar_url        text        DEFAULT '',
    settings          jsonb       DEFAULT '{
        "theme_mode": "system",
        "default_page_size": 25,
        "default_columns": [],
        "sidebar_collapsed": false,
        "notifications_enabled": true
    }'::jsonb,
    last_login_at     timestamptz,

    -- Audit fields (NON-NEGOTIABLE)
    cre_dt            timestamptz DEFAULT now() NOT NULL,
    cre_by            text        DEFAULT '' NOT NULL,
    mod_dt            timestamptz DEFAULT now() NOT NULL,
    mod_by            text        DEFAULT '' NOT NULL,
    version_no        integer     DEFAULT 1 NOT NULL,
    tenant_id         uuid
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users (role);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON public.users (tenant_id);

CREATE TRIGGER trg_users_mod_dt
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_mod_dt();

-- ============================================================================
-- 3. LEADS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.leads (
    id                    uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    first_name            text        NOT NULL DEFAULT '',
    last_name             text        NOT NULL DEFAULT '',
    middle_initial        text        DEFAULT '',
    occupation_title      text        DEFAULT '',
    grade_level           text        DEFAULT '',
    annual_salary         integer     DEFAULT 0,
    hourly_rate           numeric(10,2) DEFAULT 0,
    facility_name         text        DEFAULT '',
    facility_address      text        DEFAULT '',
    facility_city         text        DEFAULT '',
    facility_state        text        DEFAULT '',
    facility_zip_code     text        DEFAULT '',
    entered_on_duty_date  date,
    source_file           text        DEFAULT '',

    -- Enrichment fields
    personal_email        text,
    personal_phone        text,
    personal_address      text,
    personal_city         text,
    personal_state        text,
    personal_zip          text,
    linkedin_url          text,
    facebook_url          text,
    lat                   numeric(10,7),
    lon                   numeric(10,7),
    years_of_service      numeric(4,1),
    age_estimate          integer,
    do_not_contact        boolean     DEFAULT false,
    enrichment_source     text,
    enrichment_confidence numeric(3,2),
    enrichment_dt         timestamptz,
    enrichment_status     text        DEFAULT 'pending'
                                      CHECK (enrichment_status IN ('pending', 'enriched', 'partial', 'not_found', 'error')),

    -- Full-text search vector
    search_vector         tsvector,

    -- Audit fields (NON-NEGOTIABLE)
    cre_dt                timestamptz DEFAULT now() NOT NULL,
    cre_by                text        DEFAULT '' NOT NULL,
    mod_dt                timestamptz DEFAULT now() NOT NULL,
    mod_by                text        DEFAULT '' NOT NULL,
    version_no            integer     DEFAULT 1 NOT NULL,
    tenant_id             uuid
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_leads_last_name ON public.leads (last_name);
CREATE INDEX IF NOT EXISTS idx_leads_facility_state ON public.leads (facility_state);
CREATE INDEX IF NOT EXISTS idx_leads_grade_level ON public.leads (grade_level);
CREATE INDEX IF NOT EXISTS idx_leads_occupation_title ON public.leads (occupation_title);
CREATE INDEX IF NOT EXISTS idx_leads_annual_salary ON public.leads (annual_salary);
CREATE INDEX IF NOT EXISTS idx_leads_entered_on_duty ON public.leads (entered_on_duty_date);
CREATE INDEX IF NOT EXISTS idx_leads_facility_city ON public.leads (facility_city);
CREATE INDEX IF NOT EXISTS idx_leads_facility_zip ON public.leads (facility_zip_code);
CREATE INDEX IF NOT EXISTS idx_leads_tenant_id ON public.leads (tenant_id);
CREATE INDEX IF NOT EXISTS idx_leads_enrichment_status ON public.leads (enrichment_status);
CREATE INDEX IF NOT EXISTS idx_leads_do_not_contact ON public.leads (do_not_contact) WHERE do_not_contact = true;

-- Full-text search index (GIN)
CREATE INDEX IF NOT EXISTS idx_leads_search_vector ON public.leads USING GIN (search_vector);

-- Composite indexes for common filter combos
CREATE INDEX IF NOT EXISTS idx_leads_state_salary ON public.leads (facility_state, annual_salary);
CREATE INDEX IF NOT EXISTS idx_leads_state_grade ON public.leads (facility_state, grade_level);

-- Triggers
CREATE TRIGGER trg_leads_search_vector
    BEFORE INSERT OR UPDATE ON public.leads
    FOR EACH ROW EXECUTE FUNCTION public.leads_search_vector_update();

CREATE TRIGGER trg_leads_mod_dt
    BEFORE UPDATE ON public.leads
    FOR EACH ROW EXECUTE FUNCTION public.update_mod_dt();

-- ============================================================================
-- 4. COLLECTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.collections (
    id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    name                text        NOT NULL,
    description         text        DEFAULT '',
    status              text        DEFAULT 'active'
                                    CHECK (status IN ('active', 'archived', 'draft')),
    tags                text[]      DEFAULT '{}',
    filter_criteria     jsonb       DEFAULT '{}'::jsonb,
    created_by_user_id  uuid        REFERENCES public.users(id) ON DELETE SET NULL,

    -- Audit fields (NON-NEGOTIABLE)
    cre_dt              timestamptz DEFAULT now() NOT NULL,
    cre_by              text        DEFAULT '' NOT NULL,
    mod_dt              timestamptz DEFAULT now() NOT NULL,
    mod_by              text        DEFAULT '' NOT NULL,
    version_no          integer     DEFAULT 1 NOT NULL,
    tenant_id           uuid
);

CREATE INDEX IF NOT EXISTS idx_collections_status ON public.collections (status);
CREATE INDEX IF NOT EXISTS idx_collections_created_by ON public.collections (created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_collections_tenant_id ON public.collections (tenant_id);

CREATE TRIGGER trg_collections_mod_dt
    BEFORE UPDATE ON public.collections
    FOR EACH ROW EXECUTE FUNCTION public.update_mod_dt();

-- ============================================================================
-- 5. LEADS_TO_COLLECTIONS TABLE (Junction)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.leads_to_collections (
    id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id         uuid        NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    collection_id   uuid        NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
    added_by        text        DEFAULT '',
    notes           text        DEFAULT '',

    -- Audit fields (NON-NEGOTIABLE)
    cre_dt          timestamptz DEFAULT now() NOT NULL,
    cre_by          text        DEFAULT '' NOT NULL,
    mod_dt          timestamptz DEFAULT now() NOT NULL,
    mod_by          text        DEFAULT '' NOT NULL,
    version_no      integer     DEFAULT 1 NOT NULL,
    tenant_id       uuid,

    -- Prevent duplicate lead-collection pairs
    CONSTRAINT uq_lead_collection UNIQUE (lead_id, collection_id)
);

CREATE INDEX IF NOT EXISTS idx_l2c_lead_id ON public.leads_to_collections (lead_id);
CREATE INDEX IF NOT EXISTS idx_l2c_collection_id ON public.leads_to_collections (collection_id);
CREATE INDEX IF NOT EXISTS idx_l2c_tenant_id ON public.leads_to_collections (tenant_id);

CREATE TRIGGER trg_l2c_mod_dt
    BEFORE UPDATE ON public.leads_to_collections
    FOR EACH ROW EXECUTE FUNCTION public.update_mod_dt();

-- ============================================================================
-- 6. ROW-LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads_to_collections ENABLE ROW LEVEL SECURITY;

-- Users: read own profile OR admin can read all
CREATE POLICY "Users can read own profile"
    ON public.users FOR SELECT
    USING (
        auth.uid()::text = id::text
        OR EXISTS (SELECT 1 FROM public.users u WHERE u.id::text = auth.uid()::text AND u.role = 'admin')
    );

-- Users: update own profile
CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE
    USING (auth.uid()::text = id::text)
    WITH CHECK (auth.uid()::text = id::text);

-- Leads: authenticated can read
CREATE POLICY "Authenticated users can read leads"
    ON public.leads FOR SELECT
    USING (auth.role() = 'authenticated');

-- Collections: authenticated can read
CREATE POLICY "Authenticated users can read collections"
    ON public.collections FOR SELECT
    USING (auth.role() = 'authenticated');

-- Collections: owner or admin can manage
CREATE POLICY "Users can manage own collections"
    ON public.collections FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update own collections"
    ON public.collections FOR UPDATE
    USING (
        auth.uid()::text = created_by_user_id::text
        OR EXISTS (SELECT 1 FROM public.users u WHERE u.id::text = auth.uid()::text AND u.role = 'admin')
    );

CREATE POLICY "Users can delete own collections"
    ON public.collections FOR DELETE
    USING (
        auth.uid()::text = created_by_user_id::text
        OR EXISTS (SELECT 1 FROM public.users u WHERE u.id::text = auth.uid()::text AND u.role = 'admin')
    );

-- leads_to_collections: authenticated can manage
CREATE POLICY "Authenticated users can read l2c"
    ON public.leads_to_collections FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert l2c"
    ON public.leads_to_collections FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete l2c"
    ON public.leads_to_collections FOR DELETE
    USING (auth.role() = 'authenticated');

-- ============================================================================
-- 7. SEED DATA
-- ============================================================================

INSERT INTO public.users (email, first_name, last_name, phone, role, cre_by, mod_by)
VALUES (
    'rgarcia350@gmail.com',
    'Ricardo',
    'Garcia',
    '(703) 475-3098',
    'admin',
    'system_seed',
    'system_seed'
)
ON CONFLICT (email) DO NOTHING;
