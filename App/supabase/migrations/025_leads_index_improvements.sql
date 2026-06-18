-- Index improvements for public.leads (~472K rows), based on the real query
-- patterns in /api/leads (state filter + last_name sort + pagination, favorites
-- filter, and the global substring ILIKE search).
-- Run in Supabase Dashboard → SQL Editor.
--
-- NOTE: plain CREATE INDEX briefly write-locks the table. leads is bulk-imported
-- and read-heavy, so that's fine. If you prefer zero lock, change each to
-- `CREATE INDEX CONCURRENTLY` and run the statements individually (CONCURRENTLY
-- cannot run inside a transaction block).

-- 1. Most common query: filter by state, default sort by last_name, paginate.
--    (Existing composites cover state+salary and state+grade, but not the
--    default last_name ordering.)
CREATE INDEX IF NOT EXISTS idx_leads_state_last_name
  ON public.leads (facility_state, last_name);

-- 2. Favorites filter — favorites are a tiny subset, so a partial index stays
--    small and is very fast for `WHERE is_favorite = true`.
CREATE INDEX IF NOT EXISTS idx_leads_is_favorite
  ON public.leads (is_favorite) WHERE is_favorite = true;

-- 3. Global search uses leading-wildcard ILIKE ('%term%') OR'd across several
--    columns, which NO B-tree can serve. Trigram GIN indexes make substring
--    ILIKE fast. All columns in the OR need one for the planner to use a
--    BitmapOr instead of a seq scan.  (~tens of MB each — acceptable on Pro.)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_leads_trgm_last_name        ON public.leads USING gin (last_name        gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_leads_trgm_first_name       ON public.leads USING gin (first_name       gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_leads_trgm_occupation_title ON public.leads USING gin (occupation_title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_leads_trgm_facility_name    ON public.leads USING gin (facility_name    gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_leads_trgm_facility_city    ON public.leads USING gin (facility_city    gin_trgm_ops);

-- After creating indexes, refresh planner stats:
ANALYZE public.leads;
