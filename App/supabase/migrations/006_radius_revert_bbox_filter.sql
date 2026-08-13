-- Reverts the state-bbox filter introduced in 005 because, in practice, it
-- excluded all rows (likely due to facility_state casing/whitespace
-- mismatches against us_state_bounds.code). The bbox table is left in
-- place — a future cleanup script will null out lat/lon on misgeocoded
-- rows so the radius RPCs naturally exclude them via lat IS NOT NULL.
--
-- This restores the three radius RPCs to their pre-005 behavior, keeping
-- the lat/lon::double precision return-type fix from 004.

DROP FUNCTION IF EXISTS search_leads_by_radius(double precision, double precision, double precision, integer, integer);
DROP FUNCTION IF EXISTS radius_state_counts(double precision, double precision, double precision);
DROP FUNCTION IF EXISTS radius_facilities(double precision, double precision, double precision, integer);
DROP FUNCTION IF EXISTS radius_facilities(double precision, double precision, double precision);

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
  v_lat_deg := p_radius_miles / 69.0;
  v_lon_deg := p_radius_miles / (69.0 * cos(radians(p_lat)));
  v_lat_min := p_lat - v_lat_deg;
  v_lat_max := p_lat + v_lat_deg;
  v_lon_min := p_lon - v_lon_deg;
  v_lon_max := p_lon + v_lon_deg;

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


CREATE OR REPLACE FUNCTION radius_facilities(
  p_lat          double precision,
  p_lon          double precision,
  p_radius_miles double precision DEFAULT 25,
  p_limit        integer          DEFAULT 500
)
RETURNS TABLE (
  facility_name    text,
  facility_address text,
  facility_city    text,
  facility_state   text,
  lat              double precision,
  lon              double precision,
  lead_count       bigint,
  distance_miles   double precision
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
  v_lat_deg := p_radius_miles / 69.0;
  v_lon_deg := p_radius_miles / (69.0 * cos(radians(p_lat)));
  v_lat_min := p_lat - v_lat_deg;
  v_lat_max := p_lat + v_lat_deg;
  v_lon_min := p_lon - v_lon_deg;
  v_lon_max := p_lon + v_lon_deg;

  RETURN QUERY
  SELECT
    l.facility_name::text,
    max(l.facility_address)::text  AS facility_address,
    max(l.facility_city)::text     AS facility_city,
    max(l.facility_state)::text    AS facility_state,
    l.lat::double precision        AS lat,
    l.lon::double precision        AS lon,
    count(*)::bigint               AS lead_count,
    (
      3959 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(p_lat)) * cos(radians(l.lat)) *
          cos(radians(l.lon) - radians(p_lon)) +
          sin(radians(p_lat)) * sin(radians(l.lat))
        ))
      )
    ) AS distance_miles
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
  GROUP BY l.facility_name, l.lat, l.lon
  ORDER BY lead_count DESC
  LIMIT p_limit;
END;
$$;
