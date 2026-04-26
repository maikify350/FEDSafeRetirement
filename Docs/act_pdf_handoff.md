# ACT Extension — PDF Generation & Document Save Handoff

> **Last Updated:** April 26, 2026

---

## Endpoints

### 1. Generate Filled PDF

```
POST https://fedsafe-retirement.vercel.app/api/blueprint/generate-pdf
Content-Type: application/json
```

### Request Body

```json
{
  "contactId": "2840103a-4d74-44c5-a5f3-01f708d34d30",
  "form": "BLUEPRINT"
}
```

| Field | Type | Description |
|---|---|---|
| `contactId` | string | ACT contact UUID (36-char) |
| `form` | string | One of: `SF-2809`, `SF-2818`, `SF-2823`, `SF-3102`, `SF-3107`, `SF-3108`, `W4P`, `BLUEPRINT` |

### Response Shape

```json
{
  "success": true,
  "form": "BLUEPRINT",
  "contactId": "2840103a-4d74-44c5-a5f3-01f708d34d30",
  "clientName": "Battisto, Hal",
  "fileName": "Battisto, Hal BLUEPRINT 2026-04-26_20-35-12.pdf",
  "url": "https://gqarlkfmpgaotbezpkbs.supabase.co/storage/v1/object/public/Forms/filled-forms/2840103a-...-BLUEPRINT-2026-04-26_20-35-12.pdf",
  "meta": {
    "totalFields": 114,
    "mappedFieldCount": 114,
    "populatedCount": 106,
    "actualFilled": 87,
    "fillEngine": "pdf-lib",
    "uploaded": true,
    "uploadStatus": 200
  }
}
```

### Key Response Fields

| Field | Use |
|---|---|
| `url` | **PRIMARY** — Direct public URL to the filled PDF. Open in new tab or embed. |
| `fileName` | Suggested display name with timestamp (e.g. `Battisto, Hal BLUEPRINT 2026-04-26_20-35-12.pdf`) |
| `clientName` | For UI display: `LastName, FirstName` |
| `meta.actualFilled` | Number of fields actually written into the PDF |
| `meta.uploaded` | `true` if Supabase upload succeeded |

---

### 2. Save PDF as Act! Document Attachment

```
POST https://fedsafe-retirement.vercel.app/api/blueprint/save-document
Content-Type: application/json
```

### Request Body

```json
{
  "contactId": "2840103a-4d74-44c5-a5f3-01f708d34d30",
  "pdfUrl": "https://gqarlkfmpgaotbezpkbs.supabase.co/storage/v1/object/public/Forms/filled-forms/...",
  "fileName": "Battisto, Hal BLUEPRINT 2026-04-26_20-35-12.pdf"
}
```

> Use the `url` and `fileName` values returned by the generate-pdf endpoint.

### Response Shape

```json
{
  "success": true,
  "contactId": "2840103a-...",
  "fileName": "Battisto, Hal BLUEPRINT 2026-04-26_20-35-12.pdf",
  "documentId": "cba44353-6a49-455d-8389-4f08d20942e4",
  "actResponse": { ... }
}
```

### How it works

- Creates a **Library Document** (historyTypeID: -1) on the Act! contact
- Stores a **short redirect URL** in the `details` field to avoid URL truncation:
  `https://fedsafe-retirement.vercel.app/api/pdf/{fileId}`
- The redirect (302) resolves to the full Supabase Storage URL

---

### 3. PDF Short-URL Redirect

```
GET https://fedsafe-retirement.vercel.app/api/pdf/{fileId}
→ 302 redirect to full Supabase Storage URL
```

Used internally by save-document to keep Act! CRM document links short and clickable.

---

## Storage Path Convention

```
filled-forms/{UUID}-{FORMID}-{YYYY-MM-DD_HH-mm-ss}.pdf
```

- **UUID** is always 36 chars → predictable parse boundaries
- **FORMID** is the form code (`SF-2809`, `BLUEPRINT`, etc.)
- **Timestamp** is UTC ISO 8601 with **seconds** precision (prevents collisions on rapid re-generation)

## Duplicate Handling

- Storage uploads use `x-upsert: true` header — safe to re-generate
- Timestamps include seconds — each generation gets a unique path
- Template uploads: old files are auto-deleted, URL is cache-busted with `?v=timestamp`

---

## ACT Extension Integration

### Generate and view PDF
```javascript
// In background.js — handle BLUEPRINT_GENERATE message
const response = await fetch('https://fedsafe-retirement.vercel.app/api/blueprint/generate-pdf', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ contactId, form: 'BLUEPRINT' })
});
const data = await response.json();

if (data.success && data.url) {
  chrome.tabs.create({ url: data.url }); // opens filled PDF
}
```

### Save to Act! Documents
```javascript
// In background.js — handle BLUEPRINT_SAVE_DOCUMENT message
const response = await fetch('https://fedsafe-retirement.vercel.app/api/blueprint/save-document', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contactId: msg.contactId,
    pdfUrl: msg.pdfUrl,      // url from generate-pdf response
    fileName: msg.fileName   // fileName from generate-pdf response
  })
});
const data = await response.json();
// data.success === true → document saved to Act! contact
```

### List all PDFs for a client (Supabase Storage API)
```javascript
const listRes = await fetch(
  `${SUPABASE_URL}/storage/v1/object/list/Forms`,
  {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prefix: `filled-forms/${contactId}-`,
      limit: 100
    })
  }
);
const files = await listRes.json();
// Build public URL: `${SUPABASE_URL}/storage/v1/object/public/Forms/${file.name}`
```

---

## Valid Form IDs

| Form ID | Title |
|---|---|
| `SF-2809` | Health Benefits Election Form |
| `SF-2818` | Continuation of Life Insurance Coverage |
| `SF-2823` | Designation of Beneficiary (FEGLI) |
| `SF-3102` | Designation of Beneficiary (FERS) |
| `SF-3107` / `SF-3107-2` | Application for Immediate Retirement |
| `SF-3108` | Application to Make Deposit or Redeposit |
| `W4P` / `FW-4P` | Withholding Certificate for Pension or Annuity |
| `BLUEPRINT` | Full Retirement Blueprint Report (114 fields) |

---

## Environment Variables (Vercel)

| Variable | Purpose |
|----------|---------|
| `ACT_USERNAME` | Act! Web API login (for server-side CRM lookups) |
| `ACT_PASSWORD` | Act! Web API password |
| `ACT_DATABASE` | Act! database ID (e.g. `H2226003316`) |
| `ACT_API_BASE` | Defaults to `https://apius.act.com/act.web.api` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin-level Supabase key |

---

## CORS

All PDF-related endpoints (`generate-pdf`, `save-document`, `pdf/[id]`) return `Access-Control-Allow-Origin: *` for extension compatibility.
