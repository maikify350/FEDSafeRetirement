-- Returns the unique federal facilities (post offices / agencies) within a
-- radius along with the lead count at each one. Powers the facility-marker
-- overlay on the radius map so users can see whether expanding the radius
-- would pick up nearby facilities.

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
