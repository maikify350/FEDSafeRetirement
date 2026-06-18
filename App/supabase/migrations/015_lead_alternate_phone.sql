-- Migration 015: Add alternate_phone column to public.leads table
-- Created at: 2026-05-22

ALTER TABLE public.leads ADD COLUMN alternate_phone text;
