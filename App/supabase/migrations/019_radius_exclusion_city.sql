-- Migration 019: Exclusion zones also match by city name
--
-- Problem: ~43% of facilities are PO boxes that geocode poorly (e.g.
-- "CEDAR RAPIDS PO" landed 114mi away in Keokuk), so a radius-only exclusion
-- missed them. Fix: a lead is excluded from a zone if it falls within the
-- radius OR its facility_city matches the zone's city. The radius still
-- catches surrounding suburbs; the city match guarantees the named city is
-- fully removed regardless of coordinate accuracy.
--
-- Zones now carry an optional "city" field (derived from geocoding the zone
-- address). Empty/absent city → radius-only behavior (backward compatible).

-- ═══════════════════════════════════════════════════════════════════════
-- search_leads_exclude_radius (radius OR city)
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION search_leads_exclude_radius(
  p_exclusion_zones jsonb           DEFAULT '[]'::jsonb,
  p_limit           integer         DEFAULT 25,
  p_offset          integer         DEFAULT 0,
  p_search          text            DEFAULT '',
  p_state           text            DEFAULT '',
  p_gender          text            DEFAULT '',
  p_favorite        boolean         DEFAULT NULL,
  p_filters         jsonb           DEFAULT '[]'::jsonb
)
RETURNS TABLE (
  lead_data      jsonb,
  total_count    bigint
)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_filter_sql text;
  v_exclusion_sql text := '';
  v_zone jsonb;
  v_zone_lat double precision;
  v_zone_lon double precision;
  v_zone_radius double precision;
  v_zone_city text;
  v_query text;
BEGIN
  PERFORM set_config('statement_timeout', '30000', true);

  v_filter_sql := build_leads_filter_clause(p_search, p_state, p_gender, p_favorite, p_filters);

  IF p_exclusion_zones IS NOT NULL AND jsonb_typeof(p_exclusion_zones) = 'array' THEN
    FOR v_zone IN SELECT * FROM jsonb_array_elements(p_exclusion_zones) LOOP
      v_zone_lat := (v_zone->>'lat')::double precision;
      v_zone_lon := (v_zone->>'lon')::double precision;
      v_zone_radius := (v_zone->>'radius_miles')::double precision;
      v_zone_city := v_zone->>'city';

      v_exclusion_sql := v_exclusion_sql || '
        AND NOT (
          (
            l.lat BETWEEN ' || (v_zone_lat - v_zone_radius / 69.0)::text || ' AND ' || (v_zone_lat + v_zone_radius / 69.0)::text || '
            AND l.lon BETWEEN ' || (v_zone_lon - v_zone_radius / (69.0 * cos(radians(v_zone_lat))))::text || ' AND ' || (v_zone_lon + v_zone_radius / (69.0 * cos(radians(v_zone_lat))))::text || '
            AND (
              3959 * acos(
                LEAST(1.0, GREATEST(-1.0,
                  cos(radians(' || v_zone_lat::text || ')) * cos(radians(l.lat)) *
                  cos(radians(l.lon) - radians(' || v_zone_lon::text || ')) +
                  sin(radians(' || v_zone_lat::text || ')) * sin(radians(l.lat))
                ))
              )
            ) <= ' || v_zone_radius::text || '
          )';

      IF v_zone_city IS NOT NULL AND length(btrim(v_zone_city)) > 0 THEN
        v_exclusion_sql := v_exclusion_sql || '
          OR upper(btrim(l.facility_city)) = upper(btrim(' || quote_literal(v_zone_city) || '))';
      END IF;

      v_exclusion_sql := v_exclusion_sql || '
        )';
    END LOOP;
  END IF;

  v_query := '
    WITH filtered AS (
      SELECT to_jsonb(l.*) AS lead_data
      FROM leads l
      WHERE ' || v_filter_sql || v_exclusion_sql || '
    )
    SELECT
      f.lead_data,
      (SELECT count(*) FROM filtered)::bigint AS total_count
    FROM filtered f
    ORDER BY f.lead_data->>''last_name'' ASC, f.lead_data->>''first_name'' ASC
    LIMIT $1
    OFFSET $2';

  RETURN QUERY EXECUTE v_query USING p_limit, p_offset;
END;
$$;


-- ═══════════════════════════════════════════════════════════════════════
-- exclusion_state_counts (radius OR city)
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION exclusion_state_counts(
  p_exclusion_zones jsonb           DEFAULT '[]'::jsonb,
  p_search          text            DEFAULT '',
  p_state           text            DEFAULT '',
  p_gender          text            DEFAULT '',
  p_favorite        boolean         DEFAULT NULL,
  p_filters         jsonb           DEFAULT '[]'::jsonb
)
RETURNS TABLE (
  facility_state text,
  lead_count     bigint
)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_filter_sql text;
  v_exclusion_sql text := '';
  v_zone jsonb;
  v_zone_lat double precision;
  v_zone_lon double precision;
  v_zone_radius double precision;
  v_zone_city text;
  v_query text;
BEGIN
  PERFORM set_config('statement_timeout', '30000', true);

  v_filter_sql := build_leads_filter_clause(p_search, p_state, p_gender, p_favorite, p_filters);

  IF p_exclusion_zones IS NOT NULL AND jsonb_typeof(p_exclusion_zones) = 'array' THEN
    FOR v_zone IN SELECT * FROM jsonb_array_elements(p_exclusion_zones) LOOP
      v_zone_lat := (v_zone->>'lat')::double precision;
      v_zone_lon := (v_zone->>'lon')::double precision;
      v_zone_radius := (v_zone->>'radius_miles')::double precision;
      v_zone_city := v_zone->>'city';

      v_exclusion_sql := v_exclusion_sql || '
        AND NOT (
          (
            l.lat BETWEEN ' || (v_zone_lat - v_zone_radius / 69.0)::text || ' AND ' || (v_zone_lat + v_zone_radius / 69.0)::text || '
            AND l.lon BETWEEN ' || (v_zone_lon - v_zone_radius / (69.0 * cos(radians(v_zone_lat))))::text || ' AND ' || (v_zone_lon + v_zone_radius / (69.0 * cos(radians(v_zone_lat))))::text || '
            AND (
              3959 * acos(
                LEAST(1.0, GREATEST(-1.0,
                  cos(radians(' || v_zone_lat::text || ')) * cos(radians(l.lat)) *
                  cos(radians(l.lon) - radians(' || v_zone_lon::text || ')) +
                  sin(radians(' || v_zone_lat::text || ')) * sin(radians(l.lat))
                ))
              )
            ) <= ' || v_zone_radius::text || '
          )';

      IF v_zone_city IS NOT NULL AND length(btrim(v_zone_city)) > 0 THEN
        v_exclusion_sql := v_exclusion_sql || '
          OR upper(btrim(l.facility_city)) = upper(btrim(' || quote_literal(v_zone_city) || '))';
      END IF;

      v_exclusion_sql := v_exclusion_sql || '
        )';
    END LOOP;
  END IF;

  v_query := '
    SELECT
      l.facility_state::text,
      count(*)::bigint AS lead_count
    FROM leads l
    WHERE ' || v_filter_sql || v_exclusion_sql || '
    GROUP BY l.facility_state
    ORDER BY lead_count DESC';

  RETURN QUERY EXECUTE v_query;
END;
$$;
