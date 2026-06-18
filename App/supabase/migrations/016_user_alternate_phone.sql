-- Migration 016: Add alternate_phone column to public.users table
-- Created at: 2026-05-22

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS alternate_phone text;
