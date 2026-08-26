-- Migration 031: Videos Script Library Fields + Brand Settings Table
-- Run in Supabase Dashboard SQL Editor (Project ID: gqarlkfmpgaotbezpkbs)
-- Idempotent: safe to run multiple times

-- ============================================================
-- 1. Add new columns to public.videos
-- ============================================================

ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS script_no              integer         DEFAULT NULL;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS batch_no               integer         DEFAULT NULL;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS batch_name             text            DEFAULT '' NOT NULL;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS target_length_min      integer         DEFAULT NULL;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS target_length_max      integer         DEFAULT NULL;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS spoken_cta             text            DEFAULT '' NOT NULL;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS onscreen_structure     text            DEFAULT '' NOT NULL;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS end_screen_text        text            DEFAULT '' NOT NULL;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS broll_notes            text            DEFAULT '' NOT NULL;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS lead_capture_destination text          DEFAULT '' NOT NULL;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS cta_type               text            DEFAULT '' NOT NULL;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS platforms              jsonb           DEFAULT '[]'::jsonb NOT NULL;

-- video_source: distinguishes Mike's 60 priority scripts from earlier experimental builds
-- Values: 'library_v2' (Mike's Script Library V2), 'experimental' (original dev/test videos)
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS video_source           text            NOT NULL DEFAULT 'experimental';

-- Add check constraints (only if they don't already exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'videos_cta_type_check'
        AND conrelid = 'public.videos'::regclass
    ) THEN
        ALTER TABLE public.videos
            ADD CONSTRAINT videos_cta_type_check
            CHECK (cta_type IN ('', 'direct_review', 'lead_magnet', 'website_traffic', 'agency'));
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'videos_video_source_check'
        AND conrelid = 'public.videos'::regclass
    ) THEN
        ALTER TABLE public.videos
            ADD CONSTRAINT videos_video_source_check
            CHECK (video_source IN ('experimental', 'library_v2', 'custom'));
    END IF;
END $$;

-- Mark all pre-existing DB rows as experimental (new column defaulted to 'experimental' anyway,
-- but this makes it explicit for any rows that existed before this migration)
UPDATE public.videos
SET    video_source = 'experimental'
WHERE  video_source = 'experimental'; -- no-op but documents intent

-- Indexes for filtering/sorting
CREATE INDEX IF NOT EXISTS idx_videos_batch_no      ON public.videos (batch_no)     WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_videos_script_no     ON public.videos (script_no)    WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_videos_video_source  ON public.videos (video_source) WHERE is_deleted = false;

-- ============================================================
-- 2. Create video_brand_settings table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.video_brand_settings (
    id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    key         text        UNIQUE NOT NULL,
    label       text        NOT NULL DEFAULT '',
    value_text  text        NOT NULL DEFAULT '',
    value_json  jsonb       NOT NULL DEFAULT '{}'::jsonb,
    sort_order  integer     NOT NULL DEFAULT 0,
    cre_dt      timestamptz NOT NULL DEFAULT now(),
    mod_dt      timestamptz NOT NULL DEFAULT now()
);

-- Trigger to keep mod_dt current
DROP TRIGGER IF EXISTS trg_video_brand_settings_mod_dt ON public.video_brand_settings;
CREATE TRIGGER trg_video_brand_settings_mod_dt
    BEFORE UPDATE ON public.video_brand_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_mod_dt();

-- RLS
ALTER TABLE public.video_brand_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'video_brand_settings' AND policyname = 'Authenticated users can manage video_brand_settings') THEN
        CREATE POLICY "Authenticated users can manage video_brand_settings"
            ON public.video_brand_settings FOR ALL
            USING (auth.role() = 'authenticated')
            WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;

-- ============================================================
-- 3. Seed brand settings rows (from Script Library V2 document)
-- ============================================================

INSERT INTO public.video_brand_settings (key, label, sort_order, value_text) VALUES

('production_rules', 'Production Rules', 1,
'1. Use a plain-English educator voice. The goal is to make federal employees feel smarter and more prepared, not pressured.
2. Use contractions in voiceover. These are spoken scripts, not articles.
3. Bolded words in the voiceover mark emphasis for the reader. They are not on-screen bolding instructions unless the editor chooses to mirror them.
4. Do not read the registered-federal-contractor line every time. Use it primarily as end-screen credibility text.
5. Mention FedSafe as a helpful education resource, not as the hero of the video. The employee problem should come first.
6. Use "retiree" first. Teach "annuitant" only when useful: "retiree status, what the federal system calls annuitant status."
7. Avoid suits and corporate-looking stock footage. Use casual, credible, age-appropriate federal/postal employee visuals.
8. Do not use USPS, OPM, TSP, Medicare, Social Security, or agency logos in a way that implies endorsement or affiliation.
9. Core Positioning: Federal retirement is not one decision. It is a series of connected, time-sensitive decisions. Scripts are designed to create engagement, build following, drive website traffic, capture leads, and book one-on-one retirement reviews without sounding salesy.'),

('cta_system', 'CTA System', 2,
'DIRECT REVIEW CTA
Use when: The script identifies a planning gap or decision risk.
Examples: "Request a retirement readiness review"; "Schedule a TSP distribution review."

LEAD MAGNET CTA
Use when: The topic is checklist-oriented or early-stage.
Examples: "Download the federal retirement checklist"; "Get the ORA readiness checklist."

WEBSITE TRAFFIC CTA
Use when: The script is broad education or awareness.
Examples: "Visit FedSafeRetirement.com for more federal retirement education."

AGENCY CTA
Use when: The script is intended for HR, workforce, contracting, or agency leadership.
Examples: "Request a workforce retirement education briefing."'),

('rollout_plan', 'Social Media Rollout Plan', 3,
'RECOMMENDED CADENCE
Start with 4 short-form videos per week for the first 30 days. Move to 5 per week after the production workflow is smooth and the team can maintain quality. Quality and consistency matter more than flooding the platforms.

WEEKLY POSTING MIX
Monday: Core Trap / Know Your Numbers — High engagement; broad employee relevance.
Tuesday: ORA / Application Process — FedSafe positioning lane; publish at least once per week.
Wednesday: TSP / FEGLI / FERS / FEHB Topic — Educational depth; drives issue-specific landing pages.
Thursday: Checklist / Soft Lead Magnet — Lower-friction lead capture; good for retargeting audiences.
Friday: Agency/HR or Rule Change Rotation — Run every other week at first; more on LinkedIn.

90-DAY LAUNCH RHYTHM
Days 1–30: Publish 4 videos per week. Test hooks, watch completion rate, saves, comments, landing page clicks, and appointment conversions.
Days 31–60: Move to 5 videos per week if quality is stable. Begin retargeting video viewers and website visitors with checklist and review offers.
Days 61–90: Identify the top 10–15 scripts by engagement and conversion. Recut winners with alternate hooks, different visuals, or different CTAs.
Every week: publish at least one ORA-focused video. This is the strongest differentiation lane and should become a recognizable FedSafe topic.'),

('platform_guidance', 'Platform Guidance', 4,
'FACEBOOK
3–5 short-form videos per week, plus periodic still-image posts or article links. Strong platform for older federal/postal audiences and retargeting.

INSTAGRAM REELS
4–5 Reels per week once production is smooth. Use captions, bold on-screen hooks, and simple text overlays.

TIKTOK
3–5 videos per week. Keep most videos in the 25–40 second range. Prioritize the hook in the first 3–6 seconds and do not make the content feel like a polished financial commercial.

YOUTUBE SHORTS
3–5 Shorts per week. YouTube allows longer Shorts, but FedSafe should keep most videos under 45 seconds unless the topic needs more explanation.

LINKEDIN
2–3 posts per week. Use more agency/HR, workforce education, registered contractor, and ORA process content here.'),

('broll_library', 'B-Roll Asset Library', 5,
'CORE EMPLOYEE VISUALS
Employees age 50–65 reviewing benefits, documents, calendars, laptops, checklists, and family planning materials.

ORA VISUALS
Blurred online form screens, cursor hovering over submit, checklist beside laptop, document folder, timeline from review to submit.

FERS VISUALS
Pension estimate, High-3 graphic, service timeline, calculator, retirement date calendar.

TSP VISUALS
TSP account blurred, contribution-to-withdrawal transition, income buckets, tax timing, Roth/traditional split.

INSURANCE VISUALS
FEGLI forms, premium charts, health benefit brochures, Medicare materials, survivor election graphics.

AGENCY VISUALS
Casual agency classroom, HR/workforce coordinator, employees in small-group briefing, training calendar, no formal suits.

GRAPHIC TEMPLATES
Gross vs net, employee to retiree transition, review-decide-apply-retire timeline, benefits puzzle pieces, checklist overlays.'),

('visual_rules', 'Visual Rules', 6,
'1. Use 9:16 vertical format first. Adapt to square only if needed.
2. Use large captions and high-contrast text. Many viewers watch without sound.
3. Avoid using government seals, agency logos, USPS logos, OPM marks, TSP logos, Medicare logos, or anything that implies affiliation.
4. Keep attire casual and credible: polos, button-ups without ties, sweaters, khakis, office casual. Avoid suits as the default look.
5. Show older workers and mixed-gender, mixed-race audiences. Avoid overly young stock models.
6. Use FedSafe branding lightly: end card, lower third, or CTA screen. Do not make every video look like an ad.'),

('forbidden_language', 'Forbidden / Use-With-Care Language', 7,
'AVOID ENTIRELY
guarantee, risk-free, no-brainer, secret, loophole, official government program, OPM-approved, USPS-approved, we work for the government, free money, beat the system, don''t trust HR

USE WITH CARE
maximize, expert, advisor, mistake, loss, penalty, best, always, never

PREFERRED ALTERNATIVES
understand, verify, review, compare, coordinate, know your numbers, plain-English federal retirement education, before deadlines lock in, before decisions become difficult to change'),

('measurement_dashboard', 'Measurement Dashboard', 8,
'3-SECOND HOLD / HOOK RETENTION
Shows whether the opening line works. Rewrite hooks below baseline.

COMPLETION RATE
Shows whether the script holds attention. Shorten or tighten scripts with weak completion.

SAVES AND SHARES
Signals practical value. Turn high-save topics into checklists, carousels, or lead magnets.

COMMENTS AND QUESTIONS
Shows topics generating real confusion. Create reply videos and FAQs from repeated questions.

LANDING PAGE CONVERSION
Measures lead capture quality. Refine CTA wording, page promise, and form friction.

APPOINTMENTS BOOKED
Measures business impact. Boost top-converting content and retarget video viewers.')

ON CONFLICT (key) DO UPDATE SET
    label       = EXCLUDED.label,
    value_text  = EXCLUDED.value_text,
    sort_order  = EXCLUDED.sort_order,
    mod_dt      = now();
