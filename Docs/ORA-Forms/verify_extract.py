import json

d = json.load(open(r'c:\WIP\FEDSafeRetirement_App\Docs\ORA-Forms\hal_act_extract.json'))
print('=== REP ===')
print(json.dumps(d['rep'], indent=2))
print()
print('=== KEY FIELDS ===')
keys = ['fullname','age','retiredate','high3avgsalary','feglicodeactive','fegliperpayperiod',
        'maritalstatus','whatpercentage','survivorbenefitelection','feglireduction',
        'optiona','optionb','optionc','optiona_retire','optionb_retire','optionc_retire',
        'fehbpermonth','tsptraditionalbalance','tsprothbalance','tsptotalbalance',
        'salaryamount','high3avgsalary']
for k in keys:
    print(f'  {k}: {d["fields"].get(k)}')

print()
print(f'Total fields: {len(d["fields"])}')
print(f'repResolved: {d["_meta"]["repResolved"]}')
