-- Migration 021: Split user bio into short + long
-- Date: 2026-06-04
-- Description:
--   The app is becoming the source of truth for partner/rep biographies
--   (previously kept on the WordPress marketing site). Each user now has a
--   short "memo" bio (the summary shown under the photo) and a long bio
--   (the detailed text shown when the photo is clicked).
--
--   Existing single-column `bio` (migration 017) is preserved and copied into
--   `bio_long` so no content is lost.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS bio_short text DEFAULT '',
  ADD COLUMN IF NOT EXISTS bio_long  text DEFAULT '';

-- Backfill: move any existing rich-text bio into the new long-bio column.
UPDATE public.users
   SET bio_long = bio
 WHERE COALESCE(bio, '') <> ''
   AND COALESCE(bio_long, '') = '';
