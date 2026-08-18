-- Migration 030: Videos Control Plane and Gallery & Videos Storage Buckets
-- Run this in the Supabase Dashboard SQL Editor (Project ID: gqarlkfmpgaotbezpkbs)

-- 1. Create storage buckets if they do not already exist
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('gallery', 'gallery', true),
    ('videos', 'videos', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- 2. Storage Policies for 'gallery' bucket
DO $$
BEGIN
    -- Public / Authenticated read
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public and authenticated can read gallery') THEN
        CREATE POLICY "Public and authenticated can read gallery"
            ON storage.objects FOR SELECT
            USING (bucket_id = 'gallery');
    END IF;

    -- Authenticated insert
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can upload to gallery') THEN
        CREATE POLICY "Authenticated users can upload to gallery"
            ON storage.objects FOR INSERT
            WITH CHECK (bucket_id = 'gallery' AND auth.role() = 'authenticated');
    END IF;

    -- Authenticated update
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can update gallery') THEN
        CREATE POLICY "Authenticated users can update gallery"
            ON storage.objects FOR UPDATE
            USING (bucket_id = 'gallery' AND auth.role() = 'authenticated');
    END IF;

    -- Authenticated delete
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can delete from gallery') THEN
        CREATE POLICY "Authenticated users can delete from gallery"
            ON storage.objects FOR DELETE
            USING (bucket_id = 'gallery' AND auth.role() = 'authenticated');
    END IF;
END $$;

-- 3. Storage Policies for 'videos' bucket
DO $$
BEGIN
    -- Public / Authenticated read
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public and authenticated can read videos') THEN
        CREATE POLICY "Public and authenticated can read videos"
            ON storage.objects FOR SELECT
            USING (bucket_id = 'videos');
    END IF;

    -- Authenticated insert
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can upload to videos') THEN
        CREATE POLICY "Authenticated users can upload to videos"
            ON storage.objects FOR INSERT
            WITH CHECK (bucket_id = 'videos' AND auth.role() = 'authenticated');
    END IF;

    -- Authenticated update
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can update videos') THEN
        CREATE POLICY "Authenticated users can update videos"
            ON storage.objects FOR UPDATE
            USING (bucket_id = 'videos' AND auth.role() = 'authenticated');
    END IF;

    -- Authenticated delete
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated users can delete from videos') THEN
        CREATE POLICY "Authenticated users can delete from videos"
            ON storage.objects FOR DELETE
            USING (bucket_id = 'videos' AND auth.role() = 'authenticated');
    END IF;
END $$;

-- 4. Create public.videos table
CREATE TABLE IF NOT EXISTS public.videos (
    id                      uuid            DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Video Attributes & Generation Mode
    title                   text            NOT NULL DEFAULT '',
    format                  text            NOT NULL DEFAULT 'short' CHECK (format IN ('short', 'long')),
    generation_mode         text            NOT NULL DEFAULT 'motion' CHECK (generation_mode IN ('static', 'motion')),
    video_model             text            NOT NULL DEFAULT 'higgsfield',
    duration_sec            integer         DEFAULT 40 NOT NULL,
    script                  text            DEFAULT '' NOT NULL,
    ai_directive            text            DEFAULT '' NOT NULL,
    cta_text                text            DEFAULT '' NOT NULL,
    cta_on_every_frame      boolean         DEFAULT false NOT NULL,
    
    -- Voice & Speech Settings
    tts_engine              text            DEFAULT 'elevenlabs' NOT NULL CHECK (tts_engine IN ('elevenlabs', 'openai', 'qwen-openrouter')),
    voice_id                text            DEFAULT 'GGRMgbKfr7QscdcrvWga' NOT NULL, -- Kai default
    voice_name              text            DEFAULT 'Kai' NOT NULL,
    tempo                   numeric(3, 2)   DEFAULT 1.00 NOT NULL,
    
    -- Status & Media Asset URLs
    status                  text            DEFAULT 'draft' NOT NULL CHECK (status IN ('draft', 'generating', 'ready', 'failed')),
    video_url               text,
    audio_url               text,
    thumbnail_url           text,
    
    -- Hyperframes (Narrative Timeline Synchronization)
    hyperframes             jsonb           DEFAULT '[]'::jsonb NOT NULL,
    
    -- Continuity Reference Assets (Higgsfield Multi-Image / Character / Environment consistency)
    continuity_references   jsonb           DEFAULT '[]'::jsonb NOT NULL,
    
    -- Horizontal ordered presentation assets (array of { id, url, name, type, order })
    media_assets            jsonb           DEFAULT '[]'::jsonb NOT NULL,
    
    -- Additional metadata
    metadata                jsonb           DEFAULT '{}'::jsonb NOT NULL,
    
    -- Soft Delete support
    is_deleted              boolean         DEFAULT false NOT NULL,
    
    -- Mandatory Audit Fields (NON-NEGOTIABLE)
    cre_dt                  timestamptz     DEFAULT now() NOT NULL,
    cre_by                  text            DEFAULT '' NOT NULL,
    mod_dt                  timestamptz     DEFAULT now() NOT NULL,
    mod_by                  text            DEFAULT '' NOT NULL,
    version_no              integer         DEFAULT 1 NOT NULL,
    tenant_id               uuid            DEFAULT NULL
);

-- Upgrade existing table if columns are missing
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS generation_mode text NOT NULL DEFAULT 'motion';
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS video_model text NOT NULL DEFAULT 'higgsfield';
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS tts_engine text NOT NULL DEFAULT 'elevenlabs';
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS hyperframes jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS continuity_references jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_videos_is_deleted        ON public.videos (is_deleted);
CREATE INDEX IF NOT EXISTS idx_videos_cre_dt            ON public.videos (cre_dt DESC) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_videos_format            ON public.videos (format) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_videos_generation_mode   ON public.videos (generation_mode) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_videos_status            ON public.videos (status) WHERE is_deleted = false;

-- 6. Trigger for mod_dt and version_no
DROP TRIGGER IF EXISTS trg_videos_mod_dt ON public.videos;
CREATE TRIGGER trg_videos_mod_dt
    BEFORE UPDATE ON public.videos
    FOR EACH ROW EXECUTE FUNCTION public.update_mod_dt();

-- 7. Row Level Security
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Service role policy
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'videos' AND policyname = 'service_role_full_videos') THEN
        CREATE POLICY "service_role_full_videos" ON public.videos USING (true) WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'videos' AND policyname = 'Authenticated users can manage videos') THEN
        CREATE POLICY "Authenticated users can manage videos"
            ON public.videos FOR ALL
            USING (auth.role() = 'authenticated')
            WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;
