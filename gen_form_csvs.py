"""
gen_form_csvs.py
Converts ora_form_mappings.json into per-form _pdf-map.csv files
using Chris's PDF_Preparer_API token format.
Output goes to App/public/pdfmaps/
"""
import json, csv, os
from pathlib import Path

ROOT      = Path(__file__).parent
MAPS_FILE = ROOT / 'Docs' / 'ORA-Forms' / 'ora_form_mappings.json'
OUT_DIR   = ROOT / 'App' / 'public' / 'pdfmaps'
OUT_DIR.mkdir(parents=True, exist_ok=True)

FORM_KEYS = {
    'sf2818': 'sf2818',
    'sf2823': 'sf2823',
    'sf3102': 'sf3102',
    'sf3107': 'sf3107',
    'sf3108': 'sf3108',
    'fw4p':   'fw4p',
    'sf2809': 'sf2809',
}

def transform_to_crm(crm_key: str, transform: str | None, pdf_field: str) -> str:
    """Map our transform types to Chris's resolveMappedValue format."""
    t = (transform or 'none').strip().lower()
    k = (crm_key or '').strip().lower()
    pf = (pdf_field or '').strip().lower()

    if t == 'none' or not t:
        return crm_key

    if t == 'last_first_mi':
        return 'lastname, firstname, middlename'

    if t == 'city_state_zip':
        return '@home_city_state_zip'

    if t == 'full_home_address':
        return '@return_address'

    if t == 'agency_city_state_zip':
        return '@agency_location'

    if t == 'mm/dd/yyyy':
        # Chris auto-detects date fields; just pass the raw key
        return crm_key

    if t == 'today_date':
        # No direct Chris token — leave blank (unmapped)
        return ''

    if t == 'check_if_eq:married':
        return '@married_yes'

    if t == 'check_if_eq:single':
        return '@married_no'

    if t == 'check_if_eq:y':
        # Context: determine from crm_key
        if 'fegli' in k or 'optiona' in k:
            return '@fegli_yes'
        if 'fehb' in k:
            return '@fehb_yes'
        return crm_key

    if t == 'check_if_eq:n':
        if 'fegli' in k or 'optiona' in k:
            return '@fegli_no'
        if 'fehb' in k:
            return '@fehb_no'
        return crm_key

    if t == 'check_if_eq:75':
        return '@fegli_reduction_75'

    if t == 'check_if_eq:50':
        # Could be fegli reduction 50 or survivor max (50%)
        if 'survivor' in k or 'survivor' in pf:
            return '@survivor_max'
        return '@fegli_reduction_50'

    if t == 'check_if_eq:none':
        if 'survivor' in k or 'survivor' in pf:
            return '@survivor_none'
        if 'fegli' in k:
            return '@fegli_reduction_0'
        return crm_key

    if t == 'check_if_eq:full':
        # survivor full / Living Benefit full
        if 'survivor' in k or 'survivor' in pf:
            return '@survivor_none'    # "Full Living Benefit" checkbox
        return crm_key

    if t == 'check_if_eq:maximum':
        return '@survivor_max'

    if t == 'check_if_eq:partial':
        return '@survivor_partial'

    if t == 'check_if_eq:cancelled':
        return ''  # no direct token — leave unmapped

    if t == 'check_if_eq:insurable interest':
        return ''  # no direct token

    if t in ('check_if_eq:checking', 'check_if_eq:savings'):
        return crm_key

    if t == 'check_if_true':
        return crm_key

    if t == 'check_if_false':
        return crm_key

    if t == 'check_if_truthy':
        return crm_key

    if t == 'check_if_falsy':
        return crm_key

    if t == 'extract_area_code':
        return '@preferred_phone'

    if t == 'extract_phone_number':
        return '@preferred_phone'

    if t == 'sum_beneficiary_shares':
        return '@beneficiary_1_share'

    if t == 'sum_step3_credits':
        return crm_key

    if t.startswith('radio:'):
        # Chris handles radio buttons via field name patterns;
        # pass the raw crm_key and Chris will resolve the active option
        return crm_key

    # Fallback: pass through
    return crm_key


data = json.loads(MAPS_FILE.read_text(encoding='utf-8'))

for form_key, form_data in data.items():
    mapped_key = FORM_KEYS.get(form_key, form_key)
    out_file = OUT_DIR / f'{mapped_key}_pdf-map.csv'
    fields = form_data.get('fields', [])

    with open(out_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f, quoting=csv.QUOTE_ALL)
        writer.writerow(['PDF Field', 'CRM Field'])
        for fld in fields:
            pdf_field = fld.get('pdf_field', '')
            crm_key   = fld.get('crm_key', '')
            transform = fld.get('transform')
            source    = fld.get('source', 'crm')

            if source == 'derived':
                crm_field = crm_key or ''
            elif source == 'static':
                crm_field = ''
            elif source == 'needs_mapping':
                crm_field = ''
            else:
                crm_field = transform_to_crm(crm_key, transform, pdf_field)

            writer.writerow([pdf_field, crm_field])

    print(f"  {out_file.name}  ({len(fields)} rows)")

print(f"\nDone → {OUT_DIR}")
