import json
from pathlib import Path

m = json.loads(Path(r'c:\WIP\FEDSafeRetirement_App\Docs\ORA-Forms\ora_form_mappings.json').read_text())
for form_key, form_data in m.items():
    fields = form_data.get('fields', [])
    pdf = form_data.get('pdf_file', 'N/A')
    print(f"{form_key}: pdf_file={pdf} | {len(fields)} field mappings")
    if fields:
        print("  Sample field:", json.dumps(fields[0]))
    print()
