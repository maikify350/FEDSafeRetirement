-- Migration: Create fegli_rates_employee and fegli_rates_annuitant tables
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)

CREATE TABLE IF NOT EXISTS fegli_rates_employee (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  age_min     integer       NOT NULL,
  age_max     integer       NOT NULL,
  basic       numeric(8,4)  NOT NULL DEFAULT 0,
  opt_a       numeric(8,4)  NOT NULL DEFAULT 0,
  opt_b       numeric(8,4)  NOT NULL DEFAULT 0,
  opt_c       numeric(8,4)  NOT NULL DEFAULT 0,
  notes       text          NOT NULL DEFAULT '',
  cre_by      text          NOT NULL DEFAULT 'system',
  cre_dt      timestamptz   NOT NULL DEFAULT now(),
  mod_by      text          NOT NULL DEFAULT 'system',
  mod_dt      timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE fegli_rates_employee ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fegli_rates_employee' AND policyname = 'Allow all for service_role') THEN
    CREATE POLICY "Allow all for service_role" ON fegli_rates_employee FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS fegli_rates_annuitant (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  age_min     integer       NOT NULL,
  age_max     integer       NOT NULL,
  basic_75    numeric(8,4)  NOT NULL DEFAULT 0,
  basic_50    numeric(8,4)  NOT NULL DEFAULT 0,
  basic_0     numeric(8,4)  NOT NULL DEFAULT 0,
  opt_a       numeric(8,4)  NOT NULL DEFAULT 0,
  opt_b       numeric(8,4)  NOT NULL DEFAULT 0,
  opt_c       numeric(8,4)  NOT NULL DEFAULT 0,
  notes       text          NOT NULL DEFAULT '',
  cre_by      text          NOT NULL DEFAULT 'system',
  cre_dt      timestamptz   NOT NULL DEFAULT now(),
  mod_by      text          NOT NULL DEFAULT 'system',
  mod_dt      timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE fegli_rates_annuitant ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fegli_rates_annuitant' AND policyname = 'Allow all for service_role') THEN
    CREATE POLICY "Allow all for service_role" ON fegli_rates_annuitant FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
