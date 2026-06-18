"""
Post-processes hal_act_extract.json:
  1. Sorts all fields alphabetically
  2. Normalizes all date strings to MM/DD/YYYY or MM/DD/YYYY HH:MM
  3. Overwrites the file in place
"""
import json, re
from pathlib import Path

FILE = Path(r'c:\WIP\FEDSafeRetirement_App\Docs\ORA-Forms\hal_act_extract.json')

# ── Date normalizer ───────────────────────────────────────────────────────────
# ACT returns dates in two flavours:
#   Full ISO:    "2026-04-23T15:07:20+00:00"  →  "04/23/2026 15:07"
#   Partial ISO: "04-14T00:00:00+00:00"        →  "04/14"  (no year in ACT)
#   Partial ISO: "04-30T00:00:00+00:00"        →  "04/30/2026" (with known year)
#   fetchedAt:   "2026-04-23T15:41:52.796Z"    →  "04/23/2026 15:41"

FULL_ISO  = re.compile(r'^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})')  # YYYY-MM-DD
PART_ISO  = re.compile(r'^(\d{2})-(\d{2})T(\d{2}):(\d{2})')          # MM-DDThh:mm (no year)

# Fields where the partial date should include a guessed year of 2026
# (set from ACT "Create Date: 1/2/26" and "Edit Date: 4/23/26" from the UI screenshot)
YEAR_HINT_FIELDS = {
    'created', 'edited', 'retiredate', 'servicecomputationdate',
    'spousedob',
}

def fmt_date(val: str, field_key: str = '') -> str:
    val = val.strip()

    # Full ISO with year
    m = FULL_ISO.match(val)
    if m:
        yyyy, mm, dd, hh, mi = m.groups()
        if hh == '00' and mi == '00':
            return f'{mm}/{dd}/{yyyy}'
        return f'{mm}/{dd}/{yyyy} {hh}:{mi}'

    # Partial ISO — no year prefix (ACT strips year from some date fields)
    m = PART_ISO.match(val)
    if m:
        mm, dd, hh, mi = m.groups()
        midnight = (hh == '00' and mi == '00')
        if field_key in YEAR_HINT_FIELDS:
            return f'{mm}/{dd}/2026' if midnight else f'{mm}/{dd}/2026 {hh}:{mi}'
        # birthday or unknown field — no year available, keep as MM/DD
        return f'{mm}/{dd}' if midnight else f'{mm}/{dd} {hh}:{mi}'

    return val   # not a date — return unchanged

def normalize_value(val, key=''):
    if isinstance(val, str):
        # Check if it looks like a date string
        if 'T' in val and (FULL_ISO.match(val) or PART_ISO.match(val)):
            return fmt_date(val, key)
    return val

# ── Load ──────────────────────────────────────────────────────────────────────
d = json.loads(FILE.read_text(encoding='utf-8'))

# ── Fix fetchedAt in _meta ────────────────────────────────────────────────────
if '_meta' in d and 'fetchedAt' in d['_meta']:
    d['_meta']['fetchedAt'] = normalize_value(d['_meta']['fetchedAt'], 'fetchedAt')

# ── Normalize + sort fields ───────────────────────────────────────────────────
raw_fields = d.get('fields', {})
cleaned = {}
for k, v in raw_fields.items():
    cleaned[k] = normalize_value(v, k)

d['fields'] = dict(sorted(cleaned.items()))   # alphabetical sort

# ── Write back ────────────────────────────────────────────────────────────────
FILE.write_text(json.dumps(d, indent=2, ensure_ascii=False), encoding='utf-8')
print(f'Done. {len(d["fields"])} fields written (sorted).')

# Quick spot-check
spot = ['age', 'birthday', 'created', 'edited', 'fetchedAt_in_meta', 'retiredate',
        'servicecomputationdate', 'spousedob', 'fullname', 'whatpercentage']
print()
print('Spot-check:')
for k in spot:
    if k == 'fetchedAt_in_meta':
        print(f'  _meta.fetchedAt : {d["_meta"]["fetchedAt"]}')
    else:
        print(f'  {k:35s}: {d["fields"].get(k)}')
