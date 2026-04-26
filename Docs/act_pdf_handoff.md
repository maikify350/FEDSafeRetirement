# ACT Extension — PDF Generation Handoff

## Endpoint

```
POST https://fedsafe-retirement.vercel.app/api/blueprint/generate-pdf
Content-Type: application/json
```

## Request Body

```json
{
  "contactId": "2840103a-4d74-44c5-a5f3-01f708d34d30",
  "form": "SF-2809"
}
```

| Field | Type | Description |
|---|---|---|
| `contactId` | string | ACT contact UUID (36-char) |
| `form` | string | One of: `SF-2809`, `SF-2818`, `SF-2823`, `SF-3102`, `SF-3107`, `SF-3108`, `W4P` |

## Response Shape

```json
{
  "success": true,
  "form": "SF-2809",
  "contactId": "2840103a-4d74-44c5-a5f3-01f708d34d30",
  "clientName": "Battisto, Hal",
  "fileName": "Battisto, Hal SF-2809 2026-04-25_00-08.pdf",
  "url": "https://gqarlkfmpgaotbezpkbs.supabase.co/storage/v1/object/public/Forms/filled-forms/2840103a-4d74-44c5-a5f3-01f708d34d30-SF-2809-2026-04-25_00-08.pdf",
  "pdf": "<base64 — DEPRECATED, use url instead>",
  "meta": {
    "totalFields": 126,
    "mappedFieldCount": 9,
    "populatedCount": 5,
    "actualFilled": 5,
    "filledFields": [" Name. Name=Battisto, Hal", " DOB. DOB=04/14/1960", ...],
    "uploaded": true,
    "uploadStatus": 200
  }
}
```

## Key Response Fields

| Field | Use |
|---|---|
| `url` | **PRIMARY** — Direct public URL to the filled PDF. Open in new tab or embed in iframe. |
| `fileName` | Suggested display name with timestamp (e.g. `Battisto, Hal SF-2809 2026-04-25_00-08.pdf`) |
| `clientName` | For UI display: `LastName, FirstName` |
| `meta.actualFilled` | Number of fields actually written into the PDF |
| `meta.uploaded` | `true` if Supabase upload succeeded |
| `pdf` | **DEPRECATED** — base64 fallback, ignore in new code |

## Storage Path Convention

```
filled-forms/{UUID}-{FORMID}-{YYYY-MM-DD_HH-MM}.pdf
```

- **Prefix query** — list all PDFs for a client: `filled-forms/{UUID}-*`
- **UUID** is always 36 chars → predictable parse boundaries
- **FORMID** is the form code (`SF-2809`, `SF-3108`, `W4P`, etc.)
- **Timestamp** is UTC ISO 8601 (minute precision)

## ACT Extension Integration

### Open filled PDF in new tab
```javascript
const response = await fetch('https://fedsafe-retirement.vercel.app/api/blueprint/generate-pdf', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ contactId, form: 'SF-2809' })
});
const data = await response.json();

if (data.success && data.url) {
  window.open(data.url, '_blank');  // opens filled PDF directly
}
```

### Create ACT Note with PDF link (next step)
```javascript
// After generating PDF, create a note in ACT linked to the contact
// The url is permanent and can be referenced from notes, emails, etc.
const noteBody = `Generated ${data.form} — ${data.fileName}\n${data.url}`;
// POST to ACT notes API with data.contactId and noteBody
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
// Each file has .name, .created_at, etc.
// Build public URL: `${SUPABASE_URL}/storage/v1/object/public/Forms/${file.name}`
```

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
