-- Address Supabase Security Advisor "RLS Enabled No Policy" suggestions.
--
-- These tables had RLS ENABLED but NO policies — which means they were deny-all
-- to the browser (anon/authenticated) and only reachable via the service-role
-- API routes (service_role bypasses RLS). That's safe, but the advisor flags it.
--
-- We add LEAST-PRIVILEGE policies — deliberately NOT a blanket `USING (true)`,
-- which would expose these (incl. PII) to the public anon key:
--   • Tables the logged-in browser touches directly  -> TO authenticated
--   • Server-only tables (reached via service-role)   -> TO service_role
--
-- Idempotent (DROP ... IF EXISTS first). Run in Supabase Dashboard -> SQL Editor.

-- ── Browser-accessed (authenticated portal users) ───────────────────────────
-- echo_leads_blocked: upserted from the Echo Leads grid delete flow in the browser.
DROP POLICY IF EXISTS "Authenticated manage echo_leads_blocked" ON public.echo_leads_blocked;
CREATE POLICY "Authenticated manage echo_leads_blocked"
  ON public.echo_leads_blocked
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ── Server-only (reached only via service-role API routes) ──────────────────
-- service_role bypasses RLS, so this explicit policy clears the advisor lint
-- while keeping anon AND authenticated denied (no direct REST access to PII).
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'events',
    'event_attendees',
    'provider_requests',
    'provider_requests_phase2',
    'rag_documents',
    'source_registry'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'service_role_only', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      'service_role_only', t
    );
  END LOOP;
END $$;

-- NOTE: there were 8 flagged tables; the 8th wasn't visible in the advisor list.
-- Add it below with the right scope (authenticated if the browser queries it,
-- otherwise service_role) once confirmed.
