-- Add caller age to echo_leads. The echowin webhook body now sends `age`,
-- which the webhook handler stores here.
-- Run in Supabase Dashboard → SQL Editor.

ALTER TABLE public.echo_leads
  ADD COLUMN IF NOT EXISTS age integer;
