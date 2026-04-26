"""
extract_pdf_fields.py
Dumps all AcroForm field names, types, and (where present) option values from
every PDF in the same directory. Output is written to pdf_fields_raw.json.
"""

import json
import os
import sys

try:
    from pypdf import PdfReader
except ImportError:
    print("pypdf not found – run: python -m pip install pypdf")
    sys.exit(1)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PDF_FILES = [f for f in os.listdir(SCRIPT_DIR) if f.lower().endswith(".pdf")]

FIELD_TYPE_MAP = {
    "/Tx":   "Text",
    "/Btn":  "Button/Checkbox/Radio",
    "/Ch":   "Choice/Dropdown",
    "/Sig":  "Signature",
}

def get_field_type(field):
    ft = field.get("/FT")
    if ft is None:
        return "Unknown"
    return FIELD_TYPE_MAP.get(str(ft), str(ft))

def get_options(field):
    """Return dropdown/radio options if present."""
    opts = field.get("/Opt")
    if opts is None:
        return None
    result = []
    for o in opts:
        if isinstance(o, list):
            result.append(str(o[-1]))
        else:
            result.append(str(o))
    return result

def extract_fields(pdf_path):
    reader = PdfReader(pdf_path)
    fields = reader.get_fields()
    if not fields:
        return []
    results = []
    for name, field in fields.items():
        entry = {
            "pdf_field": name,
            "type": get_field_type(field),
            "tooltip": str(field.get("/TU", "")).strip("/") or None,
            "options": get_options(field),
        }
        results.append(entry)
    return results

output = {}
for pdf_file in sorted(PDF_FILES):
    full_path = os.path.join(SCRIPT_DIR, pdf_file)
    print(f"Extracting: {pdf_file} …", end=" ")
    try:
        fields = extract_fields(full_path)
        print(f"{len(fields)} fields")
        output[pdf_file] = fields
    except Exception as e:
        print(f"ERROR: {e}")
        output[pdf_file] = {"error": str(e)}

out_path = os.path.join(SCRIPT_DIR, "pdf_fields_raw.json")
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(output, f, indent=2, ensure_ascii=False)

print(f"\nSaved → {out_path}")
