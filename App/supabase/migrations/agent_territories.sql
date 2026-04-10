# Agent Assignment Feature — SQL Migration
# Run this in your Supabase SQL Editor at:
# https://supabase.com/dashboard/project/gqarlkfmpgaotbezpkbs/sql

# ─────────────────────────────────────────────────────────────────────────────
# STEP 1: Create agent_territories table
# ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.agent_territories (
    id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id    uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    state       text        NOT NULL CHECK (length(state) = 2),
    city        text        NOT NULL DEFAULT '',
    notes       text        DEFAULT '',

    -- Audit fields (NON-NEGOTIABLE)
    cre_dt      timestamptz DEFAULT now() NOT NULL,
    cre_by      text        DEFAULT '' NOT NULL,
    mod_dt      timestamptz DEFAULT now() NOT NULL,
    mod_by      text        DEFAULT '' NOT NULL,
    version_no  integer     DEFAULT 1 NOT NULL,
    tenant_id   uuid
);

-- Unique: one agent can only have a given state+city once
CREATE UNIQUE INDEX IF NOT EXISTS uq_agent_state_city
    ON public.agent_territories (agent_id, state, city);

CREATE INDEX IF NOT EXISTS idx_at_agent_id   ON public.agent_territories (agent_id);
CREATE INDEX IF NOT EXISTS idx_at_state      ON public.agent_territories (state);
CREATE INDEX IF NOT EXISTS idx_at_tenant_id  ON public.agent_territories (tenant_id);

-- Auto mod_dt trigger
CREATE TRIGGER trg_agent_territories_mod_dt
    BEFORE UPDATE ON public.agent_territories
    FOR EACH ROW EXECUTE FUNCTION update_mod_dt();

-- RLS
ALTER TABLE public.agent_territories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage agent_territories"
    ON public.agent_territories FOR ALL
    USING (auth.role() = 'authenticated');


# ─────────────────────────────────────────────────────────────────────────────
# STEP 2: Seed agents into the users table from Agents.xlsx
# (11 agents)
# ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.users (email, first_name, last_name, phone, role, cre_by, mod_by)
VALUES
  ('ben@fedsaferetirement.com',           'Ben',               'Bailey',   '12603083345', 'advisor', 'system_seed', 'system_seed'),
  ('brian@fedsaferetirement.com',         'Brian',             'Westrich', '16363335162', 'advisor', 'system_seed', 'system_seed'),
  ('cowboy@fedsaferetirement.com',        'Christopher Jerome','Routley',  '12605793331', 'advisor', 'system_seed', 'system_seed'),
  ('dan@fedsaferetirement.com',           'Dan',               'French',   '12605305759', 'advisor', 'system_seed', 'system_seed'),
  ('Greg@fedsaferetirement.com',          'Greg',              'Lamm',     '16082342345', 'advisor', 'system_seed', 'system_seed'),
  ('jonavon.lester@fedsaferetirement.com','Jonavon',           'Lester',   '16362482995', 'advisor', 'system_seed', 'system_seed'),
  ('kevin.pickett@fedsaferetirement.com', 'Kevin',             'Pickett',  '19044790976', 'advisor', 'system_seed', 'system_seed'),
  ('michael.krey@fedsaferetirement.com',  'Michael',           'Krey',     '16088208095', 'advisor', 'system_seed', 'system_seed'),
  ('mike.mammoser@fedsaferetirement.com', 'Mike',              'Mammoser', '12603083345', 'advisor', 'system_seed', 'system_seed'),
  ('mike@fedsaferetirement.com',          'Mike',              'Zaino',    '12603083345', 'advisor', 'system_seed', 'system_seed'),
  ('nick.howle@fedsaferetirement.com',    'Nick',              'Howle',    '16362482994', 'advisor', 'system_seed', 'system_seed')
ON CONFLICT (email) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name  = EXCLUDED.last_name,
  phone      = EXCLUDED.phone,
  role       = CASE WHEN public.users.role = 'admin' THEN 'admin' ELSE 'advisor' END,
  mod_dt     = now(),
  mod_by     = 'system_seed';
