"""
Final post-processor for hal_act_extract.json.
Applies to the JSON already saved by the browser subagent fetch:
  1. Removes leaked address sub-fields from top level
  2. Formats all date strings (MM/DD/YYYY or MM/DD/YYYY HH:MM)
  3. Derives birthday year from age field
  4. Sorts fields alphabetically
  5. Overwrites the file
"""
import json, re, datetime
from pathlib import Path

FILE = Path(r'c:\WIP\FEDSafeRetirement_App\Docs\ORA-Forms\hal_act_extract.json')
d = json.loads(FILE.read_text(encoding='utf-8'))
f = d['fields']

# ── 1. Remove leaked address sub-fields ──────────────────────────────────────
ADDRESS_SUBFIELDS = {'city','line1','line2','line3','state','postalcode','country','latitude','longitude'}
leaked = [k for k in f if k in ADDRESS_SUBFIELDS]
for k in leaked:
    del f[k]
    print(f'Removed leaked address sub-field: {k}')

# ── 2. Date formatter ─────────────────────────────────────────────────────────
FULL = re.compile(r'^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})')
PART = re.compile(r'^(\d{2})-(\d{2})T(\d{2}):(\d{2})')
YEAR_HINT = {'created', 'edited', 'retiredate', 'servicecomputationdate', 'spousedob'}

def fmt(val, key=''):
    val = val.strip()
    m = FULL.match(val)
    if m:
        y, mo, dd, h, mi = m.groups()
        return f'{mo}/{dd}/{y}' if h == '00' and mi == '00' else f'{mo}/{dd}/{y} {h}:{mi}'
    m = PART.match(val)
    if m:
        mo, dd, h, mi = m.groups()
        midnight = (h == '00' and mi == '00')
        if key in YEAR_HINT:
            return f'{mo}/{dd}/2026' if midnight else f'{mo}/{dd}/2026 {h}:{mi}'
        return f'{mo}/{dd}' if midnight else f'{mo}/{dd} {h}:{mi}'
    return val

def norm(v, k=''):
    return fmt(v, k) if isinstance(v, str) and 'T' in v and (FULL.match(v) or PART.match(v)) else v

# ── 3. Apply date formatting to all fields ────────────────────────────────────
for k in list(f.keys()):
    f[k] = norm(f[k], k)
d['_meta']['fetchedAt'] = norm(d['_meta']['fetchedAt'], 'fetchedAt')

# ── 4. Derive birthday year from age ─────────────────────────────────────────
bd = f.get('birthday')
age_raw = f.get('age')
if bd and '/' in str(bd) and age_raw:
    age = int(str(age_raw))
    parts = str(bd).split('/')
    mo, day = parts[0], parts[1]
    today = datetime.date.today()
    try:
        this_yr_bday = datetime.date(today.year, int(mo), int(day))
        birth_year = today.year - age - (1 if this_yr_bday > today else 0)
        new_bd = f'{mo}/{day}/{birth_year}'
        f['birthday'] = new_bd
        print(f'Birthday: {bd}  ->  {new_bd}')
    except ValueError as e:
        print(f'Birthday derivation skipped: {e}')

# ── 5. Sort alphabetically ────────────────────────────────────────────────────
d['fields'] = dict(sorted(f.items()))

# ── 6. Write ──────────────────────────────────────────────────────────────────
FILE.write_text(json.dumps(d, indent=2, ensure_ascii=False), encoding='utf-8')
total = len(d['fields'])
size = FILE.stat().st_size
print(f'\nDone: {total} fields | {size:,} bytes')
print()

# Spot-check
chk = ['liquid','stocksbonds','birthday','created','edited','retiredate',
       'spousedob','feglireduction','survivorbenefitelection','whatpercentage']
print('Spot-check:')
for k in chk:
    print(f'  {k:35s}: {d["fields"].get(k)}')
print(f'  {"_meta.fetchedAt":35s}: {d["_meta"]["fetchedAt"]}')
print(f'  {"_meta.schemaFieldCount":35s}: {d["_meta"].get("schemaFieldCount")}')
