-- Migration 017: Add bio field to users table
-- Date: 2026-05-28
-- Description: Stores HTML rich-text biography for Reps/Partners

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS bio text DEFAULT '';
