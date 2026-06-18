-- Defends radius searches against wrongly-geocoded leads.
--
-- Background: the bulk geocoding script asks Mapbox for lat/lon given the
-- facility address. For ambiguous town names (e.g. "Tallapoosa" exists in
-- MO and GA) Mapbox sometimes returns the wrong region, even when state
-- and zip are passed. The result is a lead with facility_state = MO but a
-- lat/lon physically located in GA/SC, which then surfaces in radius
-- searches it has no business appearing in.
--
-- This migration adds a small state-bounding-box reference table and makes
-- the three radius RPCs require each row's (lat, lon) to fall inside the
-- bbox of its facility_state (with a ~10mi buffer for border noise).

CREATE TABLE IF NOT EXISTS public.us_state_bounds (
  code     text PRIMARY KEY,
  lat_min  double precision NOT NULL,
  lat_max  double precision NOT NULL,
  lon_min  double precision NOT NULL,
  lon_max  double precision NOT NULL
);

INSERT INTO public.us_state_bounds (code, lat_min, lat_max, lon_min, lon_max) VALUES
  ('AL', 30.14, 35.01, -88.48, -84.89),
  ('AK', 51.21, 71.37, -169.00, -130.00),
  ('AZ', 31.33, 37.01, -114.82, -109.05),
  ('AR', 33.00, 36.50, -94.62, -89.64),
  ('CA', 32.53, 42.01, -124.41, -114.13),
  ('CO', 36.99, 41.00, -109.06, -102.04),
  ('CT', 40.99, 42.05, -73.73, -71.79),
  ('DE', 38.45, 39.84, -75.79, -75.05),
  ('DC', 38.79, 39.00, -77.12, -76.90),
  ('FL', 24.52, 31.00, -87.63, -80.03),
  ('GA', 30.36, 35.00, -85.61, -80.84),
  ('HI', 18.91, 22.24, -160.25, -154.81),
  ('ID', 41.99, 49.00, -117.24, -111.04),
  ('IL', 36.97, 42.51, -91.51, -87.49),
  ('IN', 37.77, 41.76, -88.10, -84.78),
  ('IA', 40.38, 43.50, -96.64, -90.14),
  ('KS', 36.99, 40.00, -102.05, -94.59),
  ('KY', 36.50, 39.15, -89.57, -81.96),
  ('LA', 28.93, 33.02, -94.04, -88.82),
  ('ME', 43.06, 47.46, -71.08, -66.95),
  ('MD', 37.91, 39.72, -79.49, -75.05),
  ('MA', 41.19, 42.89, -73.51, -69.93),
  ('MI', 41.70, 48.31, -90.42, -82.41),
  ('MN', 43.50, 49.38, -97.24, -89.49),
  ('MS', 30.17, 34.99, -91.66, -88.10),
  ('MO', 35.99, 40.61, -95.77, -89.10),
  ('MT', 44.36, 49.00, -116.05, -104.04),
  ('NE', 40.00, 43.00, -104.05, -95.31),
  ('NV', 35.00, 42.00, -120.01, -114.04),
  ('NH', 42.70, 45.31, -72.56, -70.61),
  ('NJ', 38.93, 41.36, -75.56, -73.89),
  ('NM', 31.33, 37.00, -109.05, -103.00),
  ('NY', 40.50, 45.02, -79.76, -71.86),
  ('NC', 33.84, 36.59, -84.32, -75.46),
  ('ND', 45.94, 49.00, -104.05, -96.55),
  ('OH', 38.40, 41.98, -84.82, -80.52),
  ('OK', 33.62, 37.00, -103.00, -94.43),
  ('OR', 41.99, 46.29, -124.57, -116.46),
  ('PA', 39.72, 42.27, -80.52, -74.69),
  ('RI', 41.15, 42.02, -71.86, -71.12),
  ('SC', 32.03, 35.22, -83.35, -78.54),
  ('SD', 42.48, 45.95, -104.06, -96.44),
  ('TN', 34.98, 36.68, -90.31, -81.65),
  ('TX', 25.84, 36.50, -106.65, -93.51),
  ('UT', 36.99, 42.00, -114.05, -109.04),
  ('VT', 42.73, 45.02, -73.44, -71.46),
  ('VA', 36.54, 39.47, -83.68, -75.24),
  ('WA', 45.54, 49.00, -124.77, -116.92),
  ('WV', 37.20, 40.64, -82.64, -77.72),
  ('WI', 42.49, 47.08, -92.89, -86.25),
  ('WY', 40.99, 45.01, -111.06, -104.05),
  ('PR', 17.88, 18.52, -67.95, -65.22),
  ('VI', 17.67, 18.41, -65.09, -64.56),
  ('GU', 13.23, 13.66, 144.62, 144.96),
  ('MP', 14.11, 20.55, 144.89, 146.07)
ON CONFLICT (code) DO UPDATE SET
  lat_min = EXCLUDED.lat_min,
  lat_max = EXCLUDED.lat_max,
  lon_min = EXCLUDED.lon_min,
  lon_max = EXCLUDED.lon_max;

-- ── Updated RPCs with state-bbox filter (0.15° ≈ 10mi buffer) ────────────
-- Drop first so a stale/broken signature from earlier migration runs gets
-- replaced cleanly (CREATE OR REPLACE refuses to alter return signatures).
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
  FROM leads l
  WHERE l.lat IS NOT NULL
    AND l.lon IS NOT NULL
    AND l.lat BETWEEN v_lat_min AND v_lat_max
    AND l.lon BETWEEN v_lon_min AND v_lon_max
    AND EXISTS (
      SELECT 1 FROM us_state_bounds b
      WHERE b.code = l.facility_state
        AND l.lat BETWEEN b.lat_min - 0.15 AND b.lat_max + 0.15
        AND l.lon BETWEEN b.lon_min - 0.15 AND b.lon_max + 0.15
    )
    AND (
      3959 * acos(
        LEAST(1.0, GREATEST(-1.0,
          cos(radians(p_lat)) * cos(radians(l.lat)) *
          cos(radians(l.lon) - radians(p_lon)) +
          sin(radians(p_lat)) * sin(radians(l.lat))
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
    AND EXISTS (
      SELECT 1 FROM us_state_bounds b
      WHERE b.code = l.facility_state
        AND l.lat BETWEEN b.lat_min - 0.15 AND b.lat_max + 0.15
        AND l.lon BETWEEN b.lon_min - 0.15 AND b.lon_max + 0.15
    )
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
    AND EXISTS (
      SELECT 1 FROM us_state_bounds b
      WHERE b.code = l.facility_state
        AND l.lat BETWEEN b.lat_min - 0.15 AND b.lat_max + 0.15
        AND l.lon BETWEEN b.lon_min - 0.15 AND b.lon_max + 0.15
    )
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
    AND EXISTS (
      SELECT 1 FROM us_state_bounds b
      WHERE b.code = l.facility_state
        AND l.lat BETWEEN b.lat_min - 0.15 AND b.lat_max + 0.15
        AND l.lon BETWEEN b.lon_min - 0.15 AND b.lon_max + 0.15
    )
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
