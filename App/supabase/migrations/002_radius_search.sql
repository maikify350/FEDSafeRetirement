-- Optimized Haversine radius search with bounding box pre-filter
-- The bounding box eliminates 99%+ of rows using simple index-friendly
-- comparisons BEFORE the expensive trig calculations run.

-- Step 1: Add indexes on lat/lon for the bounding box filter
CREATE INDEX IF NOT EXISTS idx_leads_lat ON public.leads (lat);
CREATE INDEX IF NOT EXISTS idx_leads_lon ON public.leads (lon);

-- Step 2: Replace the function with optimized version
CREATE OR REPLACE FUNCTION search_leads_by_radius(
  p_lat          double precision,
  p_lon          double precision,
  p_radius_miles double precision DEFAULT 25,
  p_limit        integer         DEFAULT 25,
  p_offset       integer         DEFAULT 0
)
RETURNS TABLE (
  lead_data      jsonb,
  distance_miles double precision,
  total_count    bigint
)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_total    bigint;
  v_lat_deg  double precision;
  v_lon_deg  double precision;
  v_lat_min  double precision;
  v_lat_max  double precision;
  v_lon_min  double precision;
  v_lon_max  double precision;
BEGIN
  -- Pre-compute bounding box (rectangular approximation of the circle)
  -- 1 degree latitude  ≈ 69 miles
  -- 1 degree longitude ≈ 69 * cos(lat) miles
  v_lat_deg := p_radius_miles / 69.0;
  v_lon_deg := p_radius_miles / (69.0 * cos(radians(p_lat)));

  v_lat_min := p_lat - v_lat_deg;
  v_lat_max := p_lat + v_lat_deg;
  v_lon_min := p_lon - v_lon_deg;
  v_lon_max := p_lon + v_lon_deg;

  -- Count matching leads (bounding box + Haversine)
  SELECT count(*) INTO v_total
  FROM leads
  WHERE lat IS NOT NULL
    AND lon IS NOT NULL
    AND lat BETWEEN v_lat_min AND v_lat_max
    AND lon BETWEEN v_lon_min AND v_lon_max
    AND (
      3959 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(p_lat)) * cos(radians(lat)) *
          cos(radians(lon) - radians(p_lon)) +
          sin(radians(p_lat)) * sin(radians(lat))
        ))
      )
    ) <= p_radius_miles;

  -- Return paginated results ordered by distance
  RETURN QUERY
  SELECT
    to_jsonb(l.*) AS lead_data,
    (
      3959 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(p_lat)) * cos(radians(l.lat)) *
          cos(radians(l.lon) - radians(p_lon)) +
          sin(radians(p_lat)) * sin(radians(l.lat))
        ))
      )
    ) AS distance_miles,
    v_total AS total_count
  FROM leads l
  WHERE l.lat IS NOT NULL
    AND l.lon IS NOT NULL
    AND l.lat BETWEEN v_lat_min AND v_lat_max
    AND l.lon BETWEEN v_lon_min AND v_lon_max
    AND (
      3959 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(p_lat)) * cos(radians(l.lat)) *
          cos(radians(l.lon) - radians(p_lon)) +
          sin(radians(p_lat)) * sin(radians(l.lat))
        ))
      )
    ) <= p_radius_miles
  ORDER BY distance_miles ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
