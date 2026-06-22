-- Add caller date of birth to echo_leads. Starting with the June 28th webinar
-- the echowin agent collects DOB; the webhook body sends `dob` (ISO yyyy-mm-dd),
-- which the webhook handler stores here.
-- Run in Supabase Dashboard → SQL Editor.

ALTER TABLE public.echo_leads
  ADD COLUMN IF NOT EXISTS dob date;
