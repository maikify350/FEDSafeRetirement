-- ============================================================================
-- Migration: Event Check-In Feature
-- Adds expected_attendees & expected_guests columns to events table
-- Creates event_attendees table for check-in tracking
-- ============================================================================

-- ── 1. Add columns to events table ──────────────────────────────────────────
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS expected_attendees integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expected_guests    integer DEFAULT 0;

COMMENT ON COLUMN events.expected_attendees IS 'Expected number of registered/invited attendees';
COMMENT ON COLUMN events.expected_guests    IS 'Expected number of guests (companions of attendees)';

-- ── 2. Create event_attendees table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_attendees (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_fk      uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  parent_fk     uuid REFERENCES event_attendees(id) ON DELETE SET NULL,

  first_name    text NOT NULL DEFAULT '',
  last_name     text NOT NULL DEFAULT '',
  phone         text,
  email         text,

  -- 1 = Invitee (pre-registered subscriber)
  -- 2 = Lead    (new potential lead discovered at event)
  -- 3 = Guest   (companion of an invitee/lead)
  attendee_type integer NOT NULL DEFAULT 1
    CHECK (attendee_type IN (1, 2, 3)),

  checked_in    boolean NOT NULL DEFAULT false,
  no_show       boolean NOT NULL DEFAULT false,
  check_in_time timestamptz,

  notes         text,
  cre_dt        timestamptz NOT NULL DEFAULT now(),
  upd_dt        timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_attendees_event_fk  ON event_attendees(event_fk);
CREATE INDEX IF NOT EXISTS idx_event_attendees_parent_fk ON event_attendees(parent_fk);
CREATE INDEX IF NOT EXISTS idx_event_attendees_type      ON event_attendees(attendee_type);

COMMENT ON TABLE  event_attendees IS 'Tracks attendees, leads, and guests for event check-in';
COMMENT ON COLUMN event_attendees.attendee_type IS '1=Invitee, 2=Lead, 3=Guest';
COMMENT ON COLUMN event_attendees.parent_fk     IS 'Links guests to their parent invitee/lead';
