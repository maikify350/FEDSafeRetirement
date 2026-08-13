-- Link echo_leads to a scheduled event.
-- The event carries the assigned agent (events.assignedto_fk), so an echo
-- lead's "assigned user" is derived through this FK — no extra column needed.
-- Run this in Supabase Dashboard → SQL Editor.

ALTER TABLE public.echo_leads
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.events(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS echo_leads_event_id_idx ON public.echo_leads(event_id);
