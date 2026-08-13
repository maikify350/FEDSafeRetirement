# FEDSafe Retirement — API Reference Guide

> **Last Updated:** April 26, 2026
> **Repo:** [github.com/maikify350/FEDSafeRetirement](https://github.com/maikify350/FEDSafeRetirement)

---

## 🔑 Access

| Environment | URL |
|-------------|-----|
| **Swagger UI** | [fedsafe-retirement.vercel.app/api/swagger](https://fedsafe-retirement.vercel.app/api/swagger) |
| **OpenAPI JSON** | [fedsafe-retirement.vercel.app/api/openapi](https://fedsafe-retirement.vercel.app/api/openapi) |
| **Base URL** | `https://fedsafe-retirement.vercel.app` |
| **Local Dev** | `http://localhost:8001` |

### Login Credentials

| User | Email | Password | Role |
|------|-------|----------|------|
| Chris Routley | `chris.routley@fedsaferetirement.com` | `pass123` | **Admin** |

> [!IMPORTANT]
> All **GET** endpoints are publicly accessible (no auth required).
> **POST / PUT / DELETE** require an authenticated admin session.

---

## 📊 FEGLI Rates — Employee

Rate table for **active federal employees**. Columns: `basic`, `opt_a`, `opt_b`, `opt_c` (per $1,000 of coverage, biweekly).

### Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| `GET` | `/api/fegli-rates-employee` | List all employee rates |
| `GET` | `/api/fegli-rates-employee?includeAudit=true` | Include audit fields (cre_by, cre_dt, mod_by, mod_dt) |
| `GET` | `/api/fegli-rates-employee?age=42` | Find the rate band containing age 42 |
| `GET` | `/api/fegli-rates-employee?ageMin=40&ageMax=44` | Filter by exact age range |
| `GET` | `/api/fegli-rates-employee/{id}` | Get a single rate by UUID |
| `POST` | `/api/fegli-rates-employee` | Create a new rate row *(admin only)* |
| `PUT` | `/api/fegli-rates-employee/{id}` | Update a rate row *(admin only)* |
| `DELETE` | `/api/fegli-rates-employee/{id}` | Delete a rate row *(admin only)* |

### Sample Response

```json
GET /api/fegli-rates-employee?age=42

[
  {
    "id": "c21a297d-7bfa-4293-9085-0e83d0c604ef",
    "age_min": 40,
    "age_max": 44,
    "basic": 0.16,
    "opt_a": 0.3,
    "opt_b": 0.03,
    "opt_c": 0.37,
    "notes": ""
  }
]
```

### Schema

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Auto-generated primary key |
| `age_min` | integer | Lower bound of age range (inclusive) |
| `age_max` | integer | Upper bound of age range (inclusive) |
| `basic` | numeric(8,4) | Basic insurance rate |
| `opt_a` | numeric(8,4) | Option A rate |
| `opt_b` | numeric(8,4) | Option B rate |
| `opt_c` | numeric(8,4) | Option C rate |
| `notes` | text | Optional notes |
| `cre_by` | text | Created by (audit) |
| `cre_dt` | timestamptz | Created date (audit) |
| `mod_by` | text | Modified by (audit) |
| `mod_dt` | timestamptz | Modified date (audit) |

---

## 📊 FEGLI Rates — Annuitant

Rate table for **annuitants/retirees**. Has three Basic tiers (75%, 50%, 0% reduction) plus Options A/B/C.

### Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| `GET` | `/api/fegli-rates-annuitant` | List all annuitant rates |
| `GET` | `/api/fegli-rates-annuitant?includeAudit=true` | Include audit fields |
| `GET` | `/api/fegli-rates-annuitant?age=42` | Find the rate band containing age 42 |
| `GET` | `/api/fegli-rates-annuitant?ageMin=40&ageMax=44` | Filter by exact age range |
| `GET` | `/api/fegli-rates-annuitant/{id}` | Get a single rate by UUID |
| `POST` | `/api/fegli-rates-annuitant` | Create a new rate row *(admin only)* |
| `PUT` | `/api/fegli-rates-annuitant/{id}` | Update a rate row *(admin only)* |
| `DELETE` | `/api/fegli-rates-annuitant/{id}` | Delete a rate row *(admin only)* |

### Sample Response

```json
GET /api/fegli-rates-annuitant?age=42

[
  {
    "id": "b59b4bba-2899-4e3b-8f91-76b5d52f8917",
    "age_min": 40,
    "age_max": 44,
    "basic_75": 0.3467,
    "basic_50": 1.0967,
    "basic_0": 2.5967,
    "opt_a": 0.65,
    "opt_b": 0.65,
    "opt_c": 0.8,
    "notes": ""
  }
]
```

### Schema

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Auto-generated primary key |
| `age_min` | integer | Lower bound of age range (inclusive) |
| `age_max` | integer | Upper bound of age range (inclusive) |
| `basic_75` | numeric(8,4) | Basic rate — 75% reduction election |
| `basic_50` | numeric(8,4) | Basic rate — 50% reduction election |
| `basic_0` | numeric(8,4) | Basic rate — No reduction (0%) election |
| `opt_a` | numeric(8,4) | Option A rate |
| `opt_b` | numeric(8,4) | Option B rate |
| `opt_c` | numeric(8,4) | Option C rate |
| `notes` | text | Optional notes |
| `cre_by` | text | Created by (audit) |
| `cre_dt` | timestamptz | Created date (audit) |
| `mod_by` | text | Modified by (audit) |
| `mod_dt` | timestamptz | Modified date (audit) |

---

## 📊 IRS Tax Brackets

Federal income tax brackets by filing status.

### Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| `GET` | `/api/irs-brackets` | List all brackets |
| `GET` | `/api/irs-brackets?filingStatus=Single` | Filter by filing status |
| `GET` | `/api/irs-brackets?income=75000` | Find bracket containing this income |
| `GET` | `/api/irs-brackets/{id}` | Get a single bracket by UUID |
| `POST` | `/api/irs-brackets` | Create *(admin only)* |
| `PUT` | `/api/irs-brackets/{id}` | Update *(admin only)* |
| `DELETE` | `/api/irs-brackets/{id}` | Delete *(admin only)* |

---

## 🔍 OData Query Options

All list endpoints support these query parameters for advanced filtering:

| Parameter | Example | Description |
|-----------|---------|-------------|
| `$select` | `$select=id,age_min,opt_a` | Return only specified columns |
| `$top` | `$top=5` | Limit number of rows returned |
| `$skip` | `$skip=10` | Skip rows (for pagination) |
| `$orderby` | `$orderby=age_min asc` | Sort by column and direction |
| `$filter` | `$filter=age_min eq 40` | Simple equality filter |

### Example: Combined Query

```
GET /api/fegli-rates-employee?$select=age_min,age_max,basic,opt_a&$orderby=age_min asc&$top=5
```

---

## 🏗️ Other Available Endpoints

| Tag | Endpoints | Description |
|-----|-----------|-------------|
| **Events** | `/api/events`, `/api/events/lookup` | Event management and agent assignment |
| **Event Attendees** | `/api/event-attendees` | Check-in and attendee management |
| **Leads** | `/api/leads`, `/api/leads/{id}` | Lead search (472K+ records) |
| **Agents** | `/api/users` | Agent/user listings |

---

## 📄 PDF Generation & Act! CRM Integration

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/blueprint/generate-pdf` | Generate filled PDF from Act! contact data (all 8 forms + Blueprint) |
| `POST` | `/api/blueprint/save-document` | Save filled PDF as Library Document on Act! contact |
| `GET` | `/api/pdf/{id}` | Short-URL redirect to full Supabase Storage PDF |
| `POST` | `/api/blueprint/act-full` | Fetch and normalize all contact fields from Act! CRM |
| `POST` | `/api/forms/upload` | Upload PDF template to Supabase Storage (admin only) |

> See [act_pdf_handoff.md](./act_pdf_handoff.md) for full request/response schemas.

### Key Design Decisions (April 26, 2026)

- **x-upsert header** on storage uploads prevents duplicate-key errors on rapid re-generation
- **Seconds in timestamps** (`HH-mm-ss`) ensures unique filenames for back-to-back generation
- **Short-URL redirects** (`/api/pdf/{id}`) prevent Act! CRM from truncating long Supabase URLs
- **Cache-busting** (`?v=timestamp`) on template URLs ensures preview always shows latest version
- **Auto-delete old files** before template re-upload keeps storage clean
- **Auto-persist form_url** after upload eliminates manual database updates

---

## 📋 Architecture Notes

- **Framework:** Next.js 16 (App Router) deployed on Vercel
- **Database:** Supabase (PostgreSQL) with Row Level Security
- **Auth:** Supabase Auth (email/password)
- **Admin gates:** POST/PUT/DELETE routes check the `users.role` column for `'admin'`
- **Rate tables:** `fegli_rates_employee` and `fegli_rates_annuitant` in Supabase
- **PDF Storage:** Supabase Storage bucket `Forms` (templates + `filled-forms/` folder)
- **Act! CRM API:** Server-side auth via `ACT_USERNAME`/`ACT_PASSWORD`/`ACT_DATABASE` env vars
- **Swagger UI:** Auto-generated from the `/api/openapi` spec
