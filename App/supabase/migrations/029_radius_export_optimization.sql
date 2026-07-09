-- Migration 029: Radius export performance optimization
--
-- Problem 1: idx_leads_lat and idx_leads_lon are separate single-column B-tree indexes.
--   For bbox filter (lat BETWEEN x AND y AND lon BETWEEN x AND y),
--   PostgreSQL can only use ONE index at a time. For 100-mile radius, the lat band
--   alone covers ~50,000 rows across the South/Southeast US before Haversine kicks in.
--
-- Fix 1: Composite (lat, lon) partial index — both conditions satisfied from one
--   index scan, dramatically cutting rows passed to the Haversine calculation.
--
-- Problem 2: search_leads_by_radius runs a full COUNT(*)+Haversine query on EVERY
--   RPC call. The export route loops in 1000-row batches, so for 2,259 results it
--   fires 3 COUNT queries (each scanning ~30k rows) before even reading data.
--
-- Fix 2: Dedicated export RPC that skips the COUNT entirely.

-- 1. Composite lat/lon partial index (non-blocking)
-- WHERE clause excludes NULLs so the index is compact and covers actual radius queries.
CREATE INDEX IF NOT EXISTS idx_leads_lat_lon
  ON public.leads (lat, lon)
  WHERE lat IS NOT NULL AND lon IS NOT NULL;


-- 2. Lightweight export RPC — no COUNT query, no total_count column overhead
--    Returns rows ordered by distance, no pagination overhead on the caller side.
--    The API export route can call this once with a high limit instead of batching.
DROP FUNCTION IF EXISTS export_leads_by_radius(
  double precision, double precision, double precision, integer,
  text, text, text, boolean, jsonb
);

CREATE OR REPLACE FUNCTION export_leads_by_radius(
  p_lat          double precision,
  p_lon          double precision,
  p_radius_miles double precision DEFAULT 25,
  p_max_rows     integer          DEFAULT 50000,
  p_search       text             DEFAULT '',
  p_state        text             DEFAULT '',
  p_gender       text             DEFAULT '',
  p_favorite     boolean          DEFAULT NULL,
  p_filters      jsonb            DEFAULT '[]'::jsonb
)
RETURNS TABLE (
  lead_data      jsonb,
  distance_miles double precision
)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_lat_deg    double precision;
  v_lon_deg    double precision;
  v_lat_min    double precision;
  v_lat_max    double precision;
  v_lon_min    double precision;
  v_lon_max    double precision;
  v_filter_sql text;
  v_query      text;
BEGIN
  -- Bounding box in degrees (fast pre-filter before Haversine)
  v_lat_deg := p_radius_miles / 69.0;
  v_lon_deg := p_radius_miles / (69.0 * cos(radians(p_lat)));
  v_lat_min := p_lat - v_lat_deg;
  v_lat_max := p_lat + v_lat_deg;
  v_lon_min := p_lon - v_lon_deg;
  v_lon_max := p_lon + v_lon_deg;

  v_filter_sql := build_leads_filter_clause(p_search, p_state, p_gender, p_favorite, p_filters);

  -- Single query: bbox pre-filter → exact Haversine → ordered by distance
  -- No COUNT subquery, no window function overhead.
  v_query := '
    SELECT
      to_jsonb(l.*) AS lead_data,
      (
        3959 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians($5)) * cos(radians(l.lat)) *
            cos(radians(l.lon) - radians($6)) +
            sin(radians($5)) * sin(radians(l.lat))
          ))
        )
      ) AS distance_miles
    FROM leads l
    WHERE l.lat IS NOT NULL
      AND l.lon IS NOT NULL
      AND l.lat BETWEEN $1 AND $2
      AND l.lon BETWEEN $3 AND $4
      AND (
        3959 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians($5)) * cos(radians(l.lat)) *
            cos(radians(l.lon) - radians($6)) +
            sin(radians($5)) * sin(radians(l.lat))
          ))
        )
      ) <= $7
      AND ' || v_filter_sql || '
    ORDER BY distance_miles
    LIMIT $8';

  RETURN QUERY EXECUTE v_query
    USING v_lat_min, v_lat_max, v_lon_min, v_lon_max,
          p_lat, p_lon, p_radius_miles, p_max_rows;
END;
$$;

-- Grant execute to authenticated users (matches other radius RPCs)
GRANT EXECUTE ON FUNCTION export_leads_by_radius(
  double precision, double precision, double precision, integer,
  text, text, text, boolean, jsonb
) TO authenticated;
