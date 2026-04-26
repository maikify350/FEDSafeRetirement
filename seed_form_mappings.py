"""
seed_form_mappings.py
─────────────────────
Reads each per-form CSV from Docs/PDFGEN/unsorted/ and UPDATEs the
corresponding row in the Supabase `forms` table's `mapping` column
with a JSON array of { pdfField, crmField } objects.

Run from project root:  python seed_form_mappings.py
"""

import csv
import json
import os
import io
import pathlib
import urllib.request
import urllib.parse

# ── Config ──────────────────────────────────────────────────────────────────
SUPABASE_URL = "https://gqarlkfmpgaotbezpkbs.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxYXJsa2ZtcGdhb3RiZXpwa2JzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA2NDYzNCwiZXhwIjoyMDkwNjQwNjM0fQ.N8TxFsnqnGUkMK_qmvATDSs-kyneci8ULziUHzpOwq8"

CSV_DIR = pathlib.Path(__file__).parent / "Docs" / "PDFGEN" / "unsorted"

# Maps csv filename stem → actual form_id value stored in Supabase
FORM_MAP = {
    "fw4p_pdf-map":    "W4P",        # Supabase stores as W4P
    "sf2809_pdf-map":  "SF-2809",
    "sf2818_pdf-map":  "SF-2818",
    "sf2823_pdf-map":  "SF-2823",
    "sf3102_pdf-map":  "SF-3102",
    "sf3107_pdf-map":  "SF-3107-2",  # Supabase stores as SF-3107-2
    "sf3108_pdf-map":  "SF-3108",
}

def parse_csv(path: pathlib.Path) -> list:
    """Return list of {pdfField, crmField} dicts from the CSV."""
    rows = []
    with open(path, newline='', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            pdf_field = (row.get("PDF Field") or "").strip()
            crm_field = (row.get("CRM Field") or "").strip()
            if pdf_field:  # skip blank rows
                rows.append({"pdfField": pdf_field, "crmField": crm_field})
    return rows

def supabase_patch(form_id: str, mapping: list):
    """PATCH the forms table row where form_id = form_id."""
    url  = f"{SUPABASE_URL}/rest/v1/forms?form_id=eq.{urllib.parse.quote(form_id)}"
    body = json.dumps({"mapping": mapping}).encode()
    req  = urllib.request.Request(
        url,
        data=body,
        method="PATCH",
        headers={
            "apikey":        SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type":  "application/json",
            "Prefer":        "return=minimal",
        },
    )
    with urllib.request.urlopen(req) as resp:
        return resp.status

# ── Main ──────────────────────────────────────────────────────────────────────
for stem, form_id in FORM_MAP.items():
    csv_path = CSV_DIR / f"{stem}.csv"
    if not csv_path.exists():
        print(f"  SKIP  {stem}.csv  (file not found)")
        continue

    rows = parse_csv(csv_path)
    status = supabase_patch(form_id, rows)
    print(f"  {'OK' if status in (200,204) else 'ERR'} [{status}]  {form_id}  ({len(rows)} rows)")

print("\nDone.")
