-- Lightweight function to get lead count per state within a radius
-- Used by the Radius Search dialog to show the state breakdown summary

CREATE OR REPLACE FUNCTION radius_state_counts(
  p_lat          double precision,
  p_lon          double precision,
  p_radius_miles double precision DEFAULT 25
)
RETURNS TABLE (
  facility_state text,
  lead_count     bigint
)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_lat_deg  double precision;
  v_lon_deg  double precision;
  v_lat_min  double precision;
  v_lat_max  double precision;
  v_lon_min  double precision;
  v_lon_max  double precision;
BEGIN
  -- Bounding box pre-filter
  v_lat_deg := p_radius_miles / 69.0;
  v_lon_deg := p_radius_miles / (69.0 * cos(radians(p_lat)));
  v_lat_min := p_lat - v_lat_deg;
  v_lat_max := p_lat + v_lat_deg;
  v_lon_min := p_lon - v_lon_deg;
  v_lon_max := p_lon + v_lon_deg;

  RETURN QUERY
  SELECT
    l.facility_state::text,
    count(*)::bigint AS lead_count
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
  GROUP BY l.facility_state
  ORDER BY lead_count DESC;
END;
$$;
