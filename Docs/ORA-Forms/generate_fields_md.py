"""
generate_fields_md.py
Reads pdf_fields_raw.json and generates one {pdfname}_fields.md per PDF
listing all discovered AcroForm fields in alphabetical order.
"""
import json, os
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
RAW        = SCRIPT_DIR / 'pdf_fields_raw.json'

data = json.loads(RAW.read_text(encoding='utf-8'))

for pdf_file, fields in data.items():
    stem   = Path(pdf_file).stem                    # e.g. "sf2818"
    out_md = SCRIPT_DIR / f'{stem}_fields.md'

    # Handle error entries
    if isinstance(fields, dict) and 'error' in fields:
        out_md.write_text(f'# {pdf_file} — Field List\n\n> **Error:** {fields["error"]}\n', encoding='utf-8')
        print(f'  {out_md.name}  [ERROR]')
        continue

    # Sort by field name (case-insensitive)
    sorted_fields = sorted(fields, key=lambda f: f['pdf_field'].lower())

    lines = [
        f'# {pdf_file} — Field List',
        f'',
        f'**Total fields:** {len(sorted_fields)}',
        f'',
        f'| # | Field Name | Type | Tooltip |',
        f'|---|-----------|------|---------|',
    ]

    for i, f in enumerate(sorted_fields, 1):
        name    = f['pdf_field']
        ftype   = f.get('type') or ''
        tooltip = f.get('tooltip') or ''
        # Escape pipe chars inside cells
        name    = name.replace('|', '\\|')
        tooltip = tooltip.replace('|', '\\|')
        lines.append(f'| {i} | `{name}` | {ftype} | {tooltip} |')

    out_md.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print(f'  {out_md.name}  ({len(sorted_fields)} fields)')

print('\nDone.')
