-- Migration 014: Dynamic filtering support for radius search RPCs
-- Adds a helper function to build dynamic WHERE clauses and updates the three radius search functions.

CREATE OR REPLACE FUNCTION build_leads_filter_clause(
  p_search   text,
  p_state    text,
  p_gender   text,
  p_favorite boolean,
  p_filters  jsonb
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_sql text := '1=1';
  v_filter jsonb;
  v_cond jsonb;
  v_col text;
  v_comb text;
  v_cond_parts text[];
  v_op text;
  v_val text;
  v_like_op text;
  v_part text;
BEGIN
  -- 1. Quick State Filter
  IF p_state IS NOT NULL AND p_state <> '' AND p_state <> 'all' THEN
    v_sql := v_sql || ' AND facility_state = ' || quote_literal(p_state);
  END IF;

  -- 2. Gender Filter
  IF p_gender IS NOT NULL AND p_gender <> '' AND p_gender <> 'all' THEN
    v_sql := v_sql || ' AND gender = ' || quote_literal(p_gender);
  END IF;

  -- 3. Favorite Filter
  IF p_favorite IS NOT NULL AND p_favorite = true THEN
    v_sql := v_sql || ' AND is_favorite = true';
  END IF;

  -- 4. Global Search Filter
  IF p_search IS NOT NULL AND p_search <> '' THEN
    v_val := trim(p_search);
    IF length(v_val) < 3 THEN
      v_sql := v_sql || ' AND (first_name ILIKE ' || quote_literal(v_val || '%') || 
                        ' OR last_name ILIKE ' || quote_literal(v_val || '%') || 
                        ' OR facility_state ILIKE ' || quote_literal(v_val || '%') || ')';
    ELSE
      v_sql := v_sql || ' AND (first_name ILIKE ' || quote_literal('%' || v_val || '%') ||
                        ' OR last_name ILIKE ' || quote_literal('%' || v_val || '%') ||
                        ' OR occupation_title ILIKE ' || quote_literal('%' || v_val || '%') ||
                        ' OR facility_name ILIKE ' || quote_literal('%' || v_val || '%') ||
                        ' OR facility_city ILIKE ' || quote_literal('%' || v_val || '%') || ')';
    END IF;
  END IF;

  -- 5. Column Filters (jsonb array of { id, value: { combinator, conditions } })
  IF p_filters IS NOT NULL AND jsonb_typeof(p_filters) = 'array' THEN
    FOR v_filter IN SELECT * FROM jsonb_array_elements(p_filters) LOOP
      v_col := v_filter->>'id';
      -- White-list column names to prevent SQL injection
      IF v_col IN ('first_name', 'last_name', 'occupation_title', 'grade_level', 'annual_salary', 
                   'hourly_rate', 'facility_name', 'facility_city', 'facility_state', 
                   'facility_zip_code', 'facility_address', 'entered_on_duty_date', 
                   'years_of_service', 'middle_initial', 'gender', 'source_file', 'is_favorite') THEN
        
        v_comb := coalesce(v_filter->'value'->>'combinator', 'and');
        IF v_comb <> 'or' THEN
          v_comb := 'and';
        END IF;

        v_cond_parts := ARRAY[]::text[];
        FOR v_cond IN SELECT * FROM jsonb_array_elements(v_filter->'value'->'conditions') LOOP
          v_op := v_cond->>'op';
          v_val := trim(coalesce(v_cond->>'value', ''));

          IF v_op IN ('isEmpty', 'isNotEmpty') OR v_val <> '' THEN
            v_like_op := CASE WHEN v_col IN ('facility_zip_code', 'personal_zip') THEN 'LIKE' ELSE 'ILIKE' END;
            
            v_part := CASE 
              WHEN v_op = 'contains'    THEN v_col || ' ' || v_like_op || ' ' || quote_literal('%' || v_val || '%')
              WHEN v_op = 'notContains' THEN v_col || ' NOT ' || v_like_op || ' ' || quote_literal('%' || v_val || '%')
              WHEN v_op = 'startsWith'  THEN v_col || ' ' || v_like_op || ' ' || quote_literal(v_val || '%')
              WHEN v_op = 'endsWith'    THEN v_col || ' ' || v_like_op || ' ' || quote_literal('%' || v_val)
              WHEN v_op = 'equals'      THEN v_col || ' = ' || quote_literal(v_val)
              WHEN v_op = 'notEquals'   THEN v_col || ' NOT ' || v_like_op || ' ' || quote_literal(v_val)
              WHEN v_op = 'isEmpty'     THEN '(' || v_col || ' IS NULL OR ' || v_col || ' = '''')'
              WHEN v_op = 'isNotEmpty'  THEN '(' || v_col || ' IS NOT NULL AND ' || v_col || ' <> '''')'
              ELSE NULL
            END;

            IF v_part IS NOT NULL THEN
              v_cond_parts := array_append(v_cond_parts, v_part);
            END IF;
          END IF;
        END LOOP;

        IF array_length(v_cond_parts, 1) > 0 THEN
          v_sql := v_sql || ' AND (' || array_to_string(v_cond_parts, ' ' || upper(v_comb) || ' ') || ')';
        END IF;
      END IF;
    END LOOP;
  END IF;

  RETURN v_sql;
END;
$$;


-- Drop old radius search signatures to prevent ambiguities with default parameters
DROP FUNCTION IF EXISTS search_leads_by_radius(double precision, double precision, double precision, integer, integer);
DROP FUNCTION IF EXISTS radius_state_counts(double precision, double precision, double precision);
DROP FUNCTION IF EXISTS radius_facilities(double precision, double precision, double precision, integer);
DROP FUNCTION IF EXISTS radius_facilities(double precision, double precision, double precision);


-- Create the updated search_leads_by_radius function
CREATE OR REPLACE FUNCTION search_leads_by_radius(
  p_lat          double precision,
  p_lon          double precision,
  p_radius_miles double precision DEFAULT 25,
  p_limit        integer         DEFAULT 25,
  p_offset       integer         DEFAULT 0,
  p_search       text            DEFAULT '',
  p_state        text            DEFAULT '',
  p_gender       text            DEFAULT '',
  p_favorite     boolean         DEFAULT NULL,
  p_filters      jsonb           DEFAULT '[]'::jsonb
)
RETURNS TABLE (
  lead_data      jsonb,
  distance_miles double precision,
  total_count    bigint
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
  v_filter_sql text;
  v_query    text;
  v_total_query text;
  v_total    bigint;
BEGIN
  v_lat_deg := p_radius_miles / 69.0;
  v_lon_deg := p_radius_miles / (69.0 * cos(radians(p_lat)));
  v_lat_min := p_lat - v_lat_deg;
  v_lat_max := p_lat + v_lat_deg;
  v_lon_min := p_lon - v_lon_deg;
  v_lon_max := p_lon + v_lon_deg;

  v_filter_sql := build_leads_filter_clause(p_search, p_state, p_gender, p_favorite, p_filters);

  v_total_query := '
    SELECT count(*)
    FROM leads
    WHERE lat IS NOT NULL
      AND lon IS NOT NULL
      AND lat BETWEEN $1 AND $2
      AND lon BETWEEN $3 AND $4
      AND (
        3959 * acos(
          LEAST(1.0, GREATEST(-1.0,
            cos(radians($5)) * cos(radians(lat)) *
            cos(radians(lon) - radians($6)) +
            sin(radians($5)) * sin(radians(lat))
          ))
        )
      ) <= $7
      AND ' || v_filter_sql;

  EXECUTE v_total_query
    INTO v_total
    USING v_lat_min, v_lat_max, v_lon_min, v_lon_max, p_lat, p_lon, p_radius_miles;

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
      ) AS distance_miles,
      $8::bigint AS total_count
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
    ORDER BY distance_miles ASC
    LIMIT $9
    OFFSET $10';

  RETURN QUERY EXECUTE v_query
    USING v_lat_min, v_lat_max, v_lon_min, v_lon_max, p_lat, p_lon, p_radius_miles, v_total, p_limit, p_offset;
END;
$$;


-- Create the updated radius_state_counts function
CREATE OR REPLACE FUNCTION radius_state_counts(
  p_lat          double precision,
  p_lon          double precision,
  p_radius_miles double precision DEFAULT 25,
  p_search       text            DEFAULT '',
  p_state        text            DEFAULT '',
  p_gender       text            DEFAULT '',
  p_favorite     boolean         DEFAULT NULL,
  p_filters      jsonb           DEFAULT '[]'::jsonb
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
  v_filter_sql text;
  v_query    text;
BEGIN
  v_lat_deg := p_radius_miles / 69.0;
  v_lon_deg := p_radius_miles / (69.0 * cos(radians(p_lat)));
  v_lat_min := p_lat - v_lat_deg;
  v_lat_max := p_lat + v_lat_deg;
  v_lon_min := p_lon - v_lon_deg;
  v_lon_max := p_lon + v_lon_deg;

  v_filter_sql := build_leads_filter_clause(p_search, p_state, p_gender, p_favorite, p_filters);

  v_query := '
    SELECT
      l.facility_state::text,
      count(*)::bigint AS lead_count
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
    GROUP BY l.facility_state
    ORDER BY lead_count DESC';

  RETURN QUERY EXECUTE v_query
    USING v_lat_min, v_lat_max, v_lon_min, v_lon_max, p_lat, p_lon, p_radius_miles;
END;
$$;


-- Create the updated radius_facilities function
CREATE OR REPLACE FUNCTION radius_facilities(
  p_lat          double precision,
  p_lon          double precision,
  p_radius_miles double precision DEFAULT 25,
  p_limit        integer         DEFAULT 500,
  p_search       text            DEFAULT '',
  p_state        text            DEFAULT '',
  p_gender       text            DEFAULT '',
  p_favorite     boolean         DEFAULT NULL,
  p_filters      jsonb           DEFAULT '[]'::jsonb
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
  v_filter_sql text;
  v_query    text;
BEGIN
  v_lat_deg := p_radius_miles / 69.0;
  v_lon_deg := p_radius_miles / (69.0 * cos(radians(p_lat)));
  v_lat_min := p_lat - v_lat_deg;
  v_lat_max := p_lat + v_lat_deg;
  v_lon_min := p_lon - v_lon_deg;
  v_lon_max := p_lon + v_lon_deg;

  v_filter_sql := build_leads_filter_clause(p_search, p_state, p_gender, p_favorite, p_filters);

  v_query := '
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
    GROUP BY l.facility_name, l.lat, l.lon
    ORDER BY lead_count DESC
    LIMIT $8';

  RETURN QUERY EXECUTE v_query
    USING v_lat_min, v_lat_max, v_lon_min, v_lon_max, p_lat, p_lon, p_radius_miles, p_limit;
END;
$$;
