"""
generate_fields_md_unsorted.py
Same as generate_fields_md.py but preserves the natural parser order
(top-to-bottom, left-to-right as the PDF AcroForm defines them).
Output files are named {pdfname}_fields_unsorted.md
"""
import json
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
RAW        = SCRIPT_DIR / 'pdf_fields_raw.json'

data = json.loads(RAW.read_text(encoding='utf-8'))

for pdf_file, fields in data.items():
    stem   = Path(pdf_file).stem
    out_md = SCRIPT_DIR / f'{stem}_fields_unsorted.md'

    if isinstance(fields, dict) and 'error' in fields:
        out_md.write_text(f'# {pdf_file} — Field List (Natural Order)\n\n> **Error:** {fields["error"]}\n', encoding='utf-8')
        print(f'  {out_md.name}  [ERROR]')
        continue

    # No sort — use parser order as-is
    lines = [
        f'# {pdf_file} — Field List (Natural Order)',
        f'',
        f'**Total fields:** {len(fields)}',
        f'',
        f'| # | Field Name | Type | Tooltip |',
        f'|---|-----------|------|---------|',
    ]

    for i, f in enumerate(fields, 1):
        name    = f['pdf_field'].replace('|', '\\|')
        ftype   = f.get('type') or ''
        tooltip = (f.get('tooltip') or '').replace('|', '\\|')
        lines.append(f'| {i} | `{name}` | {ftype} | {tooltip} |')

    out_md.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print(f'  {out_md.name}  ({len(fields)} fields)')

print('\nDone.')
