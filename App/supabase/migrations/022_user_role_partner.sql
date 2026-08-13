-- Migration 022: Add "partner" role and assign the 4 founding partners
-- Date: 2026-06-04
-- Description:
--   Adds a dedicated "partner" role (the founding/senior partners shown on the
--   marketing site) and reassigns the four partners from "agent" to "partner".

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'advisor', 'viewer', 'agent', 'partner'));

UPDATE public.users
   SET role = 'partner'
 WHERE lower(email) IN (
   'ben@fedsaferetirement.com',
   'dan@fedsaferetirement.com',
   'brian@fedsaferetirement.com',
   'mike@fedsaferetirement.com'
 );
