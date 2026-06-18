import json, datetime
from pathlib import Path

FILE = Path(r'c:\WIP\FEDSafeRetirement_App\Docs\ORA-Forms\hal_act_extract.json')
d = json.loads(FILE.read_text(encoding='utf-8'))
f = d['fields']

# Fix 1: Add always-present fields as null if ACT omitted them
for key in ['liquid', 'stocksbonds']:
    if key not in f:
        f[key] = None
        print(f'Added: {key} = null')
    else:
        print(f'Already present: {key} = {f[key]}')

# Fix 2: Derive full birthday from age
bd = f.get('birthday')
age_raw = f.get('age')
if bd and '/' in str(bd) and age_raw:
    age = int(str(age_raw))
    mm, day = str(bd).split('/')[:2]
    today = datetime.date.today()
    this_yr_bday = datetime.date(today.year, int(mm), int(day))
    birth_year = today.year - age - (1 if this_yr_bday > today else 0)
    new_bd = f'{mm}/{day}/{birth_year}'
    f['birthday'] = new_bd
    print(f'Birthday: {bd}  ->  {new_bd}  (age={age})')

# Re-sort alphabetically
d['fields'] = dict(sorted(f.items()))

FILE.write_text(json.dumps(d, indent=2, ensure_ascii=False), encoding='utf-8')
total = len(d['fields'])
size = FILE.stat().st_size
print(f'Done. {total} fields | {size:,} bytes')
