import json, re, datetime
from pathlib import Path

FILE = Path(r'c:\WIP\FEDSafeRetirement_App\Docs\ORA-Forms\hal_act_extract.json')

RAW = r"""{"success":true,"contactId":"2840103a-4d74-44c5-a5f3-01f708d34d30","rep":{"id":"984e429c-c188-4ab5-b8b8-21d18a4618f0","name":"Christopher Routley","email":null,"phone":""},"fields":{"id":"2840103a-4d74-44c5-a5f3-01f708d34d30","idstatus":"Prospect","isuser":false,"company":"Franklin Green Construction (demo)","department":null,"companyid":"55703fa7-410c-4801-9138-8703a19d7104","contacttype":"Contact","nameprefix":null,"firstname":"Hal","middlename":null,"lastname":"Battisto","namesuffix":null,"fullname":"Hal Battisto","isfavorite":false,"isimported":false,"importdate":null,"isprivate":false,"acl":"Limited","lastresults":null,"lastemail":null,"lastattempt":null,"lastreach":null,"lastmeeting":null,"lastlettersent":null,"latitude":null,"longitude":null,"messengerid":null,"referredby":null,"salutation":"Hal","jobtitle":"Lead Engineer","amascore":null,"emailaddress":"Hal@franklingreen.com","altemailaddress":null,"personalemailaddress":null,"website":null,"birthday":"04-14T00:00:00+00:00","businessaddress":{"line1":null,"line2":null,"line3":null,"city":null,"state":null,"postalCode":null,"country":null,"latitude":null,"longitude":null},"businessphone":null,"businessextension":null,"businesscountrycode":null,"businessmaskformat":null,"mobilephone":null,"mobileextension":null,"mobilecountrycode":null,"mobilemaskformat":null,"faxphone":null,"faxextension":null,"faxcountrycode":null,"faxmaskformat":null,"homeaddress":{"line1":"1234 Brick Dr","line2":null,"line3":"hhhh","city":null,"state":"AR","postalCode":null,"country":null,"latitude":null,"longitude":null},"homephone":null,"homeextension":null,"homecountrycode":null,"homemaskformat":null,"alternatephone":null,"alternateextension":null,"alternatecountrycode":null,"alternatemaskformat":null,"pagerphone":null,"pagerextension":null,"pagercountrycode":null,"pagermaskformat":null,"aemoptout":false,"aembounceback":false,"recordmanagerid":"984e429c-c188-4ab5-b8b8-21d18a4618f0","quickbooksid":null,"nylascontactid":null,"created":"01-02T21:32:10+00:00","edited":"04-23T17:30:56+00:00","editedby":"Ricardo Garcia","recordowner":"Ricardo Garcia","recordmanager":"Christopher Routley","dependenttype":null,"c07_phone_phone_phone":null,"spousepensionnet":"1500","c03_phone_phone":null,"c11_dob":null,"c04_name":null,"spousessnet":"1250","c05_email_email":null,"c05_name":null,"fegli":null,"other40ksira":"0","rank":"E6","c11_email":null,"c06_dob":null,"taxes":null,"spousecellnumber":null,"c01_dob":null,"militarypension":null,"socialsecurityincome":null,"c04_phone_extension":null,"c01_name":null,"c08_age":null,"c09_phone_extension":null,"c12_dob":null,"c11_phone_phone":null,"c06_email_email":null,"fehbperpayperiod":"250.00","making":true,"c10_dob":null,"c07_email_email":null,"c08first":null,"c09_age":null,"liquidnote":"Notes for Liquid","c02_email_email":null,"survivorbenefitelection":"50","fegliperpayperiod":"184.16","retiredate":"04-30T00:00:00+00:00","c12_age":null,"vadisabilityshow":null,"c07_phone_phone_extension":null,"tsprothbalancenote":"Notes for Roth","spouseemail_email":null,"change2fegli":"FEGLI Changes Notes","c05_age":null,"totalretirementincome":null,"mortage":"650000","optiona_retire":true,"c02_age":null,"c06_age":null,"c05_dob":null,"optiona":true,"c03_dob":null,"branch":"Navy","c10_phone_phone":null,"calculatednetbridgemonthly":null,"basiclife":"152000","protecting":true,"ltcperpayperiod":"60.00","optionb":"5","tsptotalbalancenote":"Notes for Total TSP","c08_dob":null,"c12_email_email":null,"federalagency":null,"tsptraditionalbalance":"1000000.00","fehbpermonth":"541.666666","inheritedaccounts":"10000","emergencysavings":"60000","c01_phone_extension":null,"c07first":null,"user9":null,"survisorbenetit":null,"user2":null,"user3":null,"user1":null,"user6":null,"user7":null,"user4":null,"user5":null,"prefix":null,"newfield1":"60.00","anyvadisabilityrating":true,"c01_last":null,"c12_phone_phone":null,"c01_age":null,"retiredyn":true,"spousedob":"10-19T00:00:00+00:00","yrsofmilitaryservice":"26","c03_phone_extension":null,"c12_phone_extension":null,"ensuring":true,"c02_last":null,"leadsource":null,"grossmonthlydist":"1234","c09_dob":null,"calculatedage62socialsecurity":null,"annualleave":"145","suffix":null,"bonds":null,"c06_phone_phone":null,"tsptraditionalbalancenote":"Notes for Trad","optionb_retire":"0","yourplans":null,"c08_email_email":null,"c06_name":null,"dentalinsuranceperpayperiod":"40.00","homevalue":"750000","add_total":null,"c04_dob":null,"optionc":"5","spouse":"Routley","brokerageaccountsnq":"25000","spouse_pension":null,"tspdistributionrate":"4","c01_phone_phone":null,"productswesold":null,"totalbasicpayshow":"150000.00","dentalinsurancepermonth":"86.666666","appointmentstatus":null,"stocksbondsnote":"Notes for Stocks","totalassetsbalance":"1000000","spousephonenumber_extension":null,"medicare_part_b":null,"c06_phone_extension":null,"cds":null,"myrecomendations":null,"c08_phone_extension":null,"sickleave":"150","tsptotalbalance":"1500000.00","c11_phone_extension":null,"c10_phone_extension":null,"calculatednetsocualsecuritymonthly":null,"otherpensions":"Notes for Other Pensions","inheritedaccountsnote":"Notes for Inherited","otherassetsnote":"Notes for Anything else","high3avgsalary":"145000.00","vadisabilitymonthlyamt":null,"photo":null,"c07_age":null,"visioninsuranceperpayperiod":"20.00","c02_phone_extension":null,"c10_age":null,"beneficiaries":"Beneficiary Notes","spousesocialsecurityincome":null,"c04_email_email":null,"c01_email_email":null,"basicliferetired":null,"currectyrsmonthsofsvc":"27","redusing":true,"feglinetcost":null,"fegliperpayperiodcalc":null,"c05_phone_extension":null,"c02_phone_phone":null,"calculatednetfersmonthly":null,"timezone":null,"feglicodeactive":"Z5","c03_last":null,"debtbox":"Notes for Outstanding Debt","user8":null,"c07_dob":null,"otherincomesources":"Notes for Other Income","spouseage":"65","c09_email_email":null,"myconcerns":"ssssssss","stocks":"0.00","c05_phone_phone":null,"understanding":true,"ltcpermonth":"130.000000","outsidelifeinsurance":null,"age":"66","servicecomputationdate":"11-18T00:00:00+00:00","monthlyhouseholdexpenses":null,"c03_email_email":null,"c09_phone_phone":null,"otherassets":"0","optionc_retire":"5","brokerageaccountsnqnote":"Notes for Brokerage","tsprothbalance":"500000.00","age62socialsecurityestimate":null,"user10":null,"c02_name":null,"c03_age":null,"creating":true,"currentnetincomeperpayperiod":"1268.00","currentnetincomepermonth":"2747.333333","other40ksiranote":"Notes for other 401","didyoubuytimeback":false,"c03_name":null,"c04_age":null,"new_field_2":null,"federalpension":null,"maritalstatus":"Married","currentyearsmonthsofservice":"25","salaryamount":"150000.00","vadisability":null,"feglicostage":"62","visioninsurancepermonth":"43.333333","spousephonenumber_phone":null,"c04_phone_phone":null,"c10_email_email":null,"ferssupplement":null,"leadqualinfo":null,"minus_total":null,"c08_phone_phone":null,"fourpctruleyrmo":null,"preferredapptime":null,"c02_dob":null,"c06_last":null,"c04_gender":null,"c08_gender":null,"c01_gender":null,"militarypensionnet":"2500","c06_gender":null,"c12_gender":null,"calculatedcurrentmonthlynet":null,"c05_last":null,"c11_gender":null,"c12_last":null,"c10_last":null,"calculatednettspmonthly":null,"vadisabilitynet":"4200","feglireduction":"75","c07_last":null,"c11_last":null,"c12_first":null,"c08_last":null,"lesnotes":null,"c02_gender":null,"c07_gender":null,"c10_gender":null,"c04_last":null,"beneficiary_choices":"Spouse Only","c08_first":null,"spouse_first":"Courtney","c05_gender":null,"c09_first":null,"annualleavepayout":null,"tricareyn":true,"c03_gender":null,"c09_gender":null,"c10_first":null,"c11_first":null,"calculatedlessfegli":null,"whatpercentage":"100","c09_last":null,"calculatednetretirementincomemonthly":null,"spousephonenumber_countrycode":"1","spousephonenumber_maskformat":"(%%%) %%%-%%%%","liquid":null,"stocksbonds":null},"_meta":{"fetchedAt":"2026-04-23T22:11:46.842Z","actDatabase":"H2226003316","totalFieldCount":321,"schemaFieldCount":273,"repResolved":true}}"""

FULL = re.compile(r'^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})')
PART = re.compile(r'^(\d{2})-(\d{2})T(\d{2}):(\d{2})')
YEAR_HINT = {'created','edited','retiredate','servicecomputationdate','spousedob'}

def fmt(val, key=''):
    val = val.strip()
    m = FULL.match(val)
    if m:
        y,mo,dd,h,mi = m.groups()
        return f'{mo}/{dd}/{y}' if h=='00' and mi=='00' else f'{mo}/{dd}/{y} {h}:{mi}'
    m = PART.match(val)
    if m:
        mo,dd,h,mi = m.groups()
        midnight = (h=='00' and mi=='00')
        if key in YEAR_HINT:
            return f'{mo}/{dd}/2026' if midnight else f'{mo}/{dd}/2026 {h}:{mi}'
        return f'{mo}/{dd}' if midnight else f'{mo}/{dd} {h}:{mi}'
    return val

def norm(v, k=''):
    return fmt(v, k) if isinstance(v, str) and 'T' in v and (FULL.match(v) or PART.match(v)) else v

d = json.loads(RAW)
f = d['fields']

# Format dates
for k in list(f.keys()):
    f[k] = norm(f[k], k)
d['_meta']['fetchedAt'] = norm(d['_meta']['fetchedAt'], 'fetchedAt')

# Derive birthday year from age
bd = f.get('birthday')
age_raw = f.get('age')
if bd and '/' in str(bd) and age_raw:
    age = int(str(age_raw))
    mo, day = str(bd).split('/')[:2]
    today = datetime.date.today()
    this_yr_bday = datetime.date(today.year, int(mo), int(day))
    birth_year = today.year - age - (1 if this_yr_bday > today else 0)
    f['birthday'] = f'{mo}/{day}/{birth_year}'

# Sort alphabetically
d['fields'] = dict(sorted(f.items()))

FILE.write_text(json.dumps(d, indent=2, ensure_ascii=False), encoding='utf-8')
total = len(d['fields'])
print(f'Done: {total} fields | {FILE.stat().st_size:,} bytes')

chk = ['liquid','stocksbonds','birthday','created','edited','retiredate',
       'spousedob','feglireduction','survivorbenefitelection','whatpercentage','high3avgsalary']
print()
for k in chk:
    print(f'  {k:35s}: {d["fields"].get(k)}')
print(f'  {"_meta.fetchedAt":35s}: {d["_meta"]["fetchedAt"]}')
print(f'  {"_meta.schemaFieldCount":35s}: {d["_meta"].get("schemaFieldCount")}')
