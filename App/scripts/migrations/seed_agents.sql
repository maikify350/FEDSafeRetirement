-- ==========================================================================
-- Seed: Insert all agents from agents_tmp.json into public.users
-- Run in Supabase Dashboard → SQL Editor
-- Safe to run multiple times — ON CONFLICT (email) DO UPDATE
-- ==========================================================================

INSERT INTO public.users (id, email, first_name, last_name, phone, role, cre_by, mod_by)
VALUES
  (gen_random_uuid(), 'ben@fedsaferetirement.com',           'Ben',              'Bailey',   '(260) 308-3345', 'agent', 'seed', 'seed'),
  (gen_random_uuid(), 'brian@fedsaferetirement.com',         'Brian',            'Westrich', '(636) 333-5162', 'agent', 'seed', 'seed'),
  (gen_random_uuid(), 'cowboy@fedsaferetirement.com',        'Christopher Jerome','Routley', '(260) 579-3331', 'agent', 'seed', 'seed'),
  (gen_random_uuid(), 'dan@fedsaferetirement.com',           'Dan',              'French',   '(260) 530-5759', 'agent', 'seed', 'seed'),
  (gen_random_uuid(), 'greg@fedsaferetirement.com',          'Greg',             'Lamm',     '(608) 234-2345', 'agent', 'seed', 'seed'),
  (gen_random_uuid(), 'jonavon.lester@fedsaferetirement.com','Jonavon',          'Lester',   '(636) 248-2995', 'agent', 'seed', 'seed'),
  (gen_random_uuid(), 'kevin.pickett@fedsaferetirement.com', 'Kevin',            'Pickett',  '(904) 479-0976', 'agent', 'seed', 'seed'),
  (gen_random_uuid(), 'michael.krey@fedsaferetirement.com',  'Michael',          'Krey',     '(608) 820-8095', 'agent', 'seed', 'seed'),
  (gen_random_uuid(), 'mike.mammoser@fedsaferetirement.com', 'Mike',             'Mammoser', '(260) 308-3345', 'agent', 'seed', 'seed'),
  (gen_random_uuid(), 'mike@fedsaferetirement.com',          'Mike',             'Zaino',    '(260) 308-3345', 'agent', 'seed', 'seed'),
  (gen_random_uuid(), 'nick.howle@fedsaferetirement.com',    'Nick',             'Howle',    '(636) 248-2994', 'agent', 'seed', 'seed')
ON CONFLICT (email) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name  = EXCLUDED.last_name,
  phone      = EXCLUDED.phone,
  role       = EXCLUDED.role,
  mod_by     = 'seed',
  mod_dt     = NOW();

-- Verify
SELECT id, first_name, last_name, email, phone, role
FROM public.users
WHERE role = 'agent'
ORDER BY last_name;
