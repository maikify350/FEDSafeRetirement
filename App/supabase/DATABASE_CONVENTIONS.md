# Database Conventions

Rules for every table in this project's Supabase database. Migrations live in
`App/supabase/migrations/` and are run manually in the Supabase Dashboard → SQL Editor.

## Audit / control fields — NON-NEGOTIABLE

**Every table MUST include these columns:**

| Column       | Type          | Default        | Notes                                              |
|--------------|---------------|----------------|----------------------------------------------------|
| `cre_dt`     | `timestamptz` | `now()` NOT NULL | When the row was created.                          |
| `cre_by`     | `text`        | `''` NOT NULL  | Who/what created it (user id/email, or a system tag like `echowin`). |
| `mod_dt`     | `timestamptz` | `now()` NOT NULL | Last modified. Auto-bumped by trigger (see below). |
| `mod_by`     | `text`        | `''` NOT NULL  | Who/what last modified it.                          |
| `version_no` | `integer`     | `1` NOT NULL   | Auto-incremented on every UPDATE by the trigger.    |

Core/tenant tables also carry `tenant_id uuid`.

### Auto-update trigger

A shared function `public.update_mod_dt()` (defined in `001_initial_schema.sql`) bumps
`mod_dt` and `version_no` on every UPDATE. Each table wires it up:

```sql
CREATE TRIGGER trg_<table>_mod_dt
  BEFORE UPDATE ON public.<table>
  FOR EACH ROW EXECUTE FUNCTION public.update_mod_dt();
```

Because the trigger owns `mod_dt`/`version_no`, **application code must NOT set them**.
On write, code sets only `cre_by` (insert) and `mod_by` (update). `cre_dt`/`mod_dt`
default to `now()`; the trigger advances `mod_dt`/`version_no` thereafter.

### Index

Add `CREATE INDEX idx_<table>_cre_dt ON public.<table> (cre_dt DESC);` so recent-first
listing and "is data still arriving?" audits are fast.

## Naming

- Use `cre_dt/cre_by/mod_dt/mod_by` — **not** `created_at`/`updated_at`. (echo_leads
  originally used `created_at`/`updated_at`; migration `024_echo_leads_audit_fields.sql`
  renamed them to the convention.)
- snake_case columns; `<table>_<column>_fkey` for foreign keys.

## New-table checklist

1. `id uuid DEFAULT gen_random_uuid() PRIMARY KEY`
2. Domain columns
3. The five audit fields above (+ `tenant_id` if multi-tenant)
4. `idx_<table>_cre_dt` index
5. `trg_<table>_mod_dt` trigger
6. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` + policies
