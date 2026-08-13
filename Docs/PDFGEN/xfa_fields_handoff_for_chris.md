# XFA Form Field Inventory — Handoff for Chris

> [!IMPORTANT]
> These 3 forms use **XFA encryption** and are now processed by our **Python (pypdf)** engine on Vercel.
> The field names below are **exactly** what the mapping CSV rows need to target.
> All 3 forms are now live and generating PDFs — expanding mappings will immediately increase fill coverage.

## Summary

| Form | Total Fields | Text Fields | Checkbox/Radio | Dropdown | Priority |
|------|-------------|-------------|---------------|----------|----------|
| **SF-2818** (FEGLI Election) | 30 | 13 | 16 | 1 | 🟡 Medium |
| **SF-3107** (FERS Retirement) | 473 | 259 | 211 | 0 | 🔴 High |
| **SF-3108** (FERS Service Credit) | 274 | 131 | 140 | 0 | 🔴 High |

> [!NOTE]
> **SSN and Gender fields** are intentionally excluded from auto-fill per FINRA compliance.
> Fields marked `unknown` type are container/group nodes — they don't hold values directly.

---

## SF-2818 — FEGLI Life Insurance Election (30 fields)

### Text Fields (13)

| PDF Field Name | Tooltip / Description |
|---|---|
| `SSN` | ⛔ FINRA — Employee's social security number |
| `employee name` | Employee's name (last, first, middle) |
| `Department` | Employing department/agency |
| `claim number` | Compensation claim number (if applicable) |
| `work address` | City, state and ZIP code of work location |
| `DOB` | Employee's date of birth (MM/DD/YYYY) |
| `signature date` | Date form was signed (MM/DD/YYYY) |
| `No reduction multiples` | Number of NO REDUCTION multiples of Option B |
| `full reduction multiples` | Number of FULL REDUCTION multiples of Option B |
| `Opt C No reduction multiples` | Number of NO REDUCTION multiples of Option C |
| `Option C full reduction multiples` | Number of FULL REDUCTION multiples of Option C |

### Checkbox/Radio Fields (16)

| PDF Field Name | Description |
|---|---|
| `Basic Y` | Want basic life insurance — Yes |
| `Basic N` | Want basic life insurance — No |
| `Full` | Receive full living benefit (terminally ill) |
| `75%` | Want 75% reduction in basic insurance |
| `50%` | Want 50% reduction in basic insurance |
| `None` | Want no reduction in basic insurance |
| `Option A Y` | Standard Optional Insurance — Yes |
| `Option A N` | Standard Optional Insurance — No |
| `No Option A` | Standard Optional Insurance — Not available |
| `Option B Y` | Additional Optional Insurance — Yes |
| `Option B N` | Additional Optional Insurance — No |
| `No Option B` | Additional Optional Insurance — Not available |
| `Option C Y` | Family Optional Insurance — Yes |
| `Option C N` | Family Optional Insurance — No |
| `No Option C` | Family Optional Insurance — Not available |

### Dropdown (1)

| PDF Field Name | Description |
|---|---|
| `Print copies` | Select which part to print (Part 1 Agency / Part 2 Employee) |

---

## SF-3107 — FERS Application for Immediate Retirement (473 fields)

### Section A — Identifying Information

| PDF Field Name | Type | Description |
|---|---|---|
| `Name` | Text | Applicant name (last, first, middle) |
| `Other Names` | Text | All other names used |
| `Address` | Text | Street number and name |
| `Address line 2` | Text | Apartment or suite number |
| `Address line 3` | Text | City, state and ZIP code |
| `phone number` | Text | Daytime telephone number after retirement |
| `time to call` | Text | Best time to reach applicant |
| `email` | Text | Home email address |
| `fax` | Text | FAX number |
| `DOB` | Text | Date of birth (MM/DD/YYYY) |
| `SSN` | Text | ⛔ FINRA — Social Security Number |
| `USA Y` | Checkbox | US citizen — Yes |
| `USA N` | Checkbox | US citizen — No |
| `disability y` | Checkbox | Disability retirement — Yes |
| `disability n` | Checkbox | Disability retirement — No |

### Section B — Federal Service

| PDF Field Name | Type | Description |
|---|---|---|
| `dept` | Text | Department/agency retiring from |
| `dept2` | Text | Department address line 1 |
| `dept3` | Text | Department city, state, ZIP |
| `sep date` | Text | Date of final separation |
| `title` | Text | Title of position retiring from |
| `pay plan` | Text | Pay plan and occupational series |
| `armed forces y` | Checkbox | Military service — Yes |
| `armed forces n` | Checkbox | Military service — No |
| `military retired pay y` | Checkbox | Receiving military retired pay — Yes |
| `military retired pay n` | Checkbox | Receiving military retired pay — No |

### Section C — Marital Information

| PDF Field Name | Type | Description |
|---|---|---|
| `married y` | Checkbox | Currently married — Yes |
| `married n` | Checkbox | Currently married — No |
| `Spouse's Name` | Text | Spouse name (last, first, middle) |
| `Spouse's DOB` | Text | Spouse date of birth |
| `Spouse's SSN` | Text | ⛔ FINRA — Spouse SSN |
| `Place of marriage` | Text | City/state where married |
| `marriage date` | Text | Date of marriage |
| `clergy y` | Checkbox | Married by clergy — Yes |
| `clergy n` | Checkbox | Married by clergy — No |
| `1f.  Other marriage` | Text | Explanation if not married by clergy/JP |
| `living former spouse y` | Checkbox | Have living former spouse — Yes |
| `living former spouse n` | Checkbox | Have living former spouse — No |

### Section D — Annuity Election

| PDF Field Name | Type | Description |
|---|---|---|
| `Name Insurable` | Text | Person with insurable interest — Name |
| `relationship` | Text | Insurable interest — Relationship |
| `DOB I I` | Text | Insurable interest — DOB |
| `SSN I I` | Text | ⛔ FINRA — Insurable interest SSN |
| `former spouse annuity (name) 1` | Text | Former spouse 1 — Name |
| `former spouse annuity (address) 1` | Text | Former spouse 1 — Address |
| `marriage date (Former 1)` | Text | Former spouse 1 — Marriage date |
| `divorce date (Former 1)` | Text | Former spouse 1 — Divorce date |
| `DOB (Former 1)` | Text | Former spouse 1 — DOB |
| `SSN (Former 1)` | Text | ⛔ FINRA — Former spouse 1 SSN |
| `survivor annuity  (Former 1)` | Text | Former spouse 1 — Survivor annuity amount |
| `former spouse annuity (name) 2` | Text | Former spouse 2 — Name |
| `former spouse annuity (address) 2` | Text | Former spouse 2 — Address |
| `marriage date (Former 2)` | Text | Former spouse 2 — Marriage date |
| `divorce date (Former 2)` | Text | Former spouse 2 — Divorce date |
| `DOB (Former 2` | Text | Former spouse 2 — DOB |
| `SSN (Former 2)` | Text | ⛔ FINRA — Former spouse 2 SSN |
| `survivor annuity  (Former 2)` | Text | Former spouse 2 — Survivor annuity amount |
| `Total survivor annuity` | Text | Total former survivor annuity (25% or 50%) |

### Section E — Insurance Information

| PDF Field Name | Type | Description |
|---|---|---|
| `FEHB Y` | Checkbox | Enrolled in FEHB — Yes |
| `FEHB N` | Checkbox | Enrolled in FEHB — No |
| `provide FEHB Y` | Checkbox | Provide FEHB in retirement — Yes |
| `provide FEHB N` | Checkbox | Provide FEHB in retirement — No |
| `FEGLI Y` | Checkbox | Eligible to continue FEGLI — Yes |
| `FEGLI N` | Checkbox | Eligible to continue FEGLI — No |
| `FEDVIP Y` | Checkbox | Enrolled in FEDVIP — Yes |
| `FEDVIP N` | Checkbox | Enrolled in FEDVIP — No |
| `LTC Y` | Checkbox | Enrolled in LTC — Yes |
| `LTC N` | Checkbox | Enrolled in LTC — No |

### Section F — Other Claim Information

| PDF Field Name | Type | Description |
|---|---|---|
| `OWCP Y` | Checkbox | Applied for/receiving OWCP — Yes |
| `OWCP N` | Checkbox | Applied for/receiving OWCP — No |
| `filed y` | Checkbox | Previously filed application — Yes |
| `filed n` | Checkbox | Previously filed application — No |
| `Refund` | Checkbox | Filed for — Refund |
| `deposit/redeposit` | Checkbox | Filed for — Deposit/Redeposit |
| `Retirement` | Checkbox | Filed for — Retirement |
| `return` | Checkbox | Filed for — Return |
| `VC` | Checkbox | Filed for — Voluntary Contribution |
| `claim` | Text | Previous claim number 1 |
| `claim2` | Text | Previous claim number 2 |

### Section G — Dependent Children (8 slots)

| PDF Field Name | Type | Description |
|---|---|---|
| `dependent 1` through `dependent 8` | Text | Child name (first, middle, last) |
| `dependent 1 DOB` through `dependent 8 DOB` | Text | Child date of birth |
| `diabled child 1` through `diabled child 8` | Checkbox | Child is disabled |

### Section H — Payment Instructions

| PDF Field Name | Type | Description |
|---|---|---|
| `to checking` | Checkbox | Direct deposit — to checking |
| `hardship` | Checkbox | Hardship exception |
| `outside` | Checkbox | Living outside US |
| `checking account` | Checkbox | Account type — Checking |
| `savings account` | Checkbox | Account type — Savings |
| `routing number` | Text | Financial institution routing number |
| `checking/savings` | Text | Account number |
| `FI telephone number` | Text | Financial institution phone |
| `financial inst name` | Text | Financial institution name |
| `financial inst address` | Text | Financial institution street address |
| `financial inst line 2 address` | Text | Financial institution city/state/ZIP |
| `income Y` | Checkbox | Income tax withholding — Yes |
| `income N` | Checkbox | Income tax withholding — No |
| `Rate Y` | Checkbox | Specific tax rate — Yes |
| `Rate N` | Checkbox | Specific tax rate — No |

### Section I — Certification

| PDF Field Name | Type | Description |
|---|---|---|
| `date signed I` | Text | Date applicant signed certification |

### Applicant's Checklist (Y/N/NA pattern)

| Field Base | Yes | No | N/A |
|---|---|---|---|
| Schedule A (Military) | `schedule A Y` | `schedule A N` | `schedule A NA` |
| Military Cert | `cert Y` | `cert N` | `cert NA` |
| Schedule B (Retired Pay) | `schedule B Y` | `schedule B N` | `schedule B NA` |
| Notice | `notice Y` | `notice N` | `notice NA` |
| Waiver | `waiver Y` | `waiver N` | `waiver NA` |
| SF-3107-2 | `3107-2 Y` | `3107-2 N` | `3107-2 NA` |
| SF-2818 | `2818 Y` | `2818 N` | `2818 NA` |
| OWCP | `OWCP Yes` | `OWCP No` | `OWCP NA` |
| W-4 | `W4 Yes` | `W4 No` | `W4 NA` |
| Court Orders | `Orders Yes` | `Orders No` | `Orders NA` |

### Schedules A, B, C — Header

| PDF Field Name | Type | Description |
|---|---|---|
| `schedule Name` | Text | Name (last, first, middle) |
| `schedule DOB` | Text | Date of birth |
| `schedule SSN` | Text | ⛔ FINRA — SSN |

### Schedule A — Military Service (3 tour slots)

| PDF Field Name | Type | Tour |
|---|---|---|
| `Branch Service` / `Branch Service 2` / `Branch Service 3` | Text | Tour 1/2/3 |
| `serial number` / `serial number 2` / `serial number 3` | Text | Tour 1/2/3 |
| `active duty from` / `active duty from 2` / `active duty from 3` | Text | Tour 1/2/3 |
| `active duty to` / `active duty to 2` / `active duty to 3` | Text | Tour 1/2/3 |
| `grade` / `grade 2` / `grade 3` | Text | Tour 1/2/3 |
| `deposit paid y` / `deposit paid n` | Checkbox | Military deposit paid |

### Schedule B — Military Retired Pay

| PDF Field Name | Type | Description |
|---|---|---|
| `retired/retainer y` / `retired/retainer n` | Checkbox | Receiving retired/retainer pay |
| `reserve y` / `reserve n` | Checkbox | Reserve component |
| `retired pay y` / `retired pay n` | Checkbox | Receiving retired pay |
| `waiving retired y` / `waiving retired n` | Checkbox | Waiving retired pay |

### Schedule C — OWCP/Compensation

| PDF Field Name | Type | Description |
|---|---|---|
| `injury y` / `injury n` | Checkbox | Job-related injury |
| `comp claim no` | Text | Compensation claim number |
| `bene rec from` / `bene rec to` | Text | Benefits received period |
| `comp claim no 2` | Text | Second claim number |
| `bene rec from 2` / `bene rec to 2` | Text | Second benefits period |
| `scheduled award 1` / `other 1` / `disability 1` | Checkbox | Line 1 type |
| `scheduled award 2` / `other 2` / `disability 2` | Checkbox | Line 2 type |
| `not receiving` / `claim denied` | Checkbox | Awaiting OWCP decision |
| `comp claim no 3` | Text | Pending claim number |
| `comp claim no 4` | Text | Denied claim work comp number |
| `claim denied date` | Text | Date claim denied |
| `notify yes` / `notify no` | Checkbox | Will notify OPM |
| `collect yes` / `collect no` | Checkbox | Will collect OWCP |
| `schedules cert date` | Text | Schedules certification date |

### Certified Summary of Federal Service — Section A (Identification)

| PDF Field Name | Type | Description |
|---|---|---|
| `Identification - name` | Text | Employee name |
| `Identification DOB` | Text | Employee DOB |
| `identification SSN` | Text | ⛔ FINRA — Employee SSN |
| `other names used` | Text | Other names used |
| `other birth dates used` | Text | Other birth dates (1) |
| `other birth dates used 2` | Text | Other birth dates (2) |
| `military serial number 4` | Text | Military serial number |
| `SCD` | Text | Service computation date |
| `effective date` | Text | FERS transfer effective date |
| `transfer y` / `transfer n` | Checkbox | Elected to transfer to FERS |
| `part csrs y` / `part csrs n` | Checkbox | Part CSRS |
| `military retired pay received y` / `n` | Checkbox | Receiving military retired pay |
| `waived military retired pay y` / `n` | Checkbox | Waived military retired pay |

### Certified Summary — Section B (Service History, 5 row slots)

Each row has: `Fed Ag or Mil Ser Br [N]`, `From - Dates of Service [N]`, `To - Dates of Service [N]`, `Retirement Systems [N]`, `Remarks [N]`  
Where `[N]` = blank for row 1, then `2`, `3`, `4`, `5`.

### Certified Summary — Section C (Civilian Service, 9 row slots)

Each row has: `Nature of Action [N]`, `Effective Date [N]`, `Basic Salary Rate [N]`, `Salary basis [N]`, `LWOP [N]`, `Basic salary From Date [N]`, `Basic salary To Date [N]`, `Total earned [N]`  
Where `[N]` = blank for row 1, then `2` through `9`.

### Certified Summary — Sections D & E

| PDF Field Name | Type | Description |
|---|---|---|
| `sec d name address` | Text | Agency name/address |
| `sec d official title` | Text | Official title |
| `Section D date` | Text | Section D certification date |
| `Section E cert date` | Text | Employee certification date |
| `service complete` | Checkbox | Service record complete |
| `additional service` | Checkbox | Additional service to add |

### Spouse's Consent to Survivor Election

| PDF Field Name | Type | Description |
|---|---|---|
| `consent Name` | Text | Retiring employee name |
| `consent DOB` | Text | Employee DOB |
| `consent SSN` | Text | ⛔ FINRA — Employee SSN |
| `no regular` | Checkbox | No regular survivor annuity |
| `insurable` | Checkbox | Insurable interest |
| `partial` | Checkbox | Partial survivor annuity |
| `maximum` | Checkbox | Maximum survivor annuity |
| `partial survivor 1` / `partial survivor 2` | Checkbox | Partial survivor options |
| `former spouse 1` / `2` / `3` | Text | Former spouse names |

### Agency Checklist (large section — 150+ checkboxes)

> [!TIP]
> The Agency Checklist section contains ~150 checkbox fields following the pattern `[item] attached` / `[item] n/a` (e.g., `3107 attached`, `3107 n/a`, `DD 214 attached`, `DD 214 n/a`). These are primarily agency-side fields that the advisor would not auto-fill from client data.

### Payroll Office Checklist

| PDF Field Name | Type | Description |
|---|---|---|
| `forwarded to` | Text | Where records forwarded |
| `SF 3103 number` | Text | SF-3103 number |
| `SF 3103 date` | Text | SF-3103 date |
| `Section B. 12 Remarks` | Text | Payroll remarks |
| `payroll tele` | Text | Payroll office phone |
| `payroll date signed` | Text | Payroll date signed |
| `payroll fax` | Text | Payroll FAX |
| `payroll office number` | Text | Payroll office number |
| `payroll email address` | Text | Payroll email |

---

## SF-3108 — Application to Make Service Credit Payment (274 fields)

### Part A — Applicant Section

| PDF Field Name | Type | Description |
|---|---|---|
| `name` | Text | Last, first, middle name |
| `other names` | Text | Other names used |
| `birthdate` | Text | Date of birth (MM/DD/YYYY) |
| `Applicant's Address1` | Text | Street address |
| `Applicant's Address2` | Text | City, state, ZIP |
| `Last employed agency name` | Text | Current/last employing agency |
| `Applicant's SSN` | Text | ⛔ FINRA — Social Security Number |
| `Last employed agency location` | Text | City/state of agency |
| `Applicant's Job position` | Text | Title of position |
| `claim number(s)` | Text | Previous claim numbers |
| `area code` | Text | Phone area code |
| `telephone number` | Text | Daytime phone number |
| `Email Address` | Text | Email address |
| `separation date` | Text | Date of separation (if not currently employed) |
| `date signed` | Text | Date signed |
| `filed yes` / `filed no` | Checkbox | Previously filed application |
| `service` / `refund` / `return` / `retirement` | Checkbox | Type of previous filing |
| `deductions Y` / `deductions N` | Checkbox | Deductions currently being withheld |

### Part A — Service History (5 row slots)

Each row (`0`–`4`) has these fields with dot-notation:

| Pattern | Type | Description |
|---|---|---|
| `agency name 1.[0-4]` | Text | Department/agency name |
| `agency location 1.[0-4]` | Text | Location (city, state) |
| `Job position 1.[0-4]` | Text | Title of position |
| `Period of Service Beginning Date 1.[0-4]` | Text | Service start date |
| `Period of Service Ending Date 1.[0-4]` | Text | Service end date |
| `10. CS` / `10. MS` | Checkbox | Civilian Service / Military Service |
| `not withheld [1-5]` | Checkbox | Deductions not withheld |
| `withheld/refunded [1-5]` | Checkbox | Deductions withheld and refunded |
| `withheld not refunded [1-5]` | Checkbox | Deductions withheld, not refunded |
| `period of service.[0-4]` | Checkbox | Elect to pay for this period |

### Part B — Agency Certification

| PDF Field Name | Type | Description |
|---|---|---|
| `transfer Y` / `transfer N` | Checkbox | Employee elected to transfer to FERS |
| `Effective Date of Federal Employees Retirement System Election` | Text | FERS election effective date |
| `agency.[0-3]` | Text | Verified service — Agency name (4 rows) |
| `retirement system.[0-3]` | Text | Retirement system (4 rows) |
| `beginning period of service.[0-3]` | Text | Service begin date (4 rows) |
| `ending period of service.[0-3]` | Text | Service end date (4 rows) |
| `Comments` | Text | Comments |
| `agency address` | Text | Agency address |
| `Signature Date` | Text | Certification date |
| `Official Title` | Text | Certifier's title |
| `Agency Area Code` | Text | Agency area code |
| `Agency's Telephone Number` | Text | Agency phone |
| `Agency FAX Area Code` | Text | Agency FAX area code |
| `Agency's FAX Number` | Text | Agency FAX number |
| `Agency cert email address` | Text | Agency certifier email |

### Part B — Section 3: Civilian Service Not Under FERS/SIRS (9 row slots)

Each row (`0`–`8`) uses dot-notation:

| Pattern | Type |
|---|---|
| `Nature of Action1.[0-8]` | Text |
| `Effective Date of Action1.[0-8]` | Text |
| `Basic Salary Rate1.[0-8]` | Text |
| `Salary Basis1.[0-8]` | Text |
| `Leave Without Pay1.[0-8]` | Text |
| `BS Beginning1.[0-8]` | Text |
| `BS Ending1.[0-8]` | Text |
| `Salary Total1.[0-8]` | Text |

### Military Deposit Application (nested arrays)

| PDF Field Name | Type | Description |
|---|---|---|
| `name employee's` | Text | Employee name |
| `birthdate employee's` | Text | Employee DOB |
| `SSN Employee's` | Text | ⛔ FINRA — Employee SSN |
| `Branch of Military.0.0` | Text | Branch — 1st entry, tour 1 |
| `Branch of Military.1.0.[0-3]` | Text | Branch — additional entries |
| `Military service beginning.0.0` | Text | Service start — tour 1 |
| `Military service ending.0.0` | Text | Service end — tour 1 |
| `IAD.[0-5]` | Text | Initial active duty dates |
| `CSRS.[0-5]` | Checkbox | CSRS coverage (6 slots) |
| `FERS.[0-5]` | Checkbox | FERS coverage (6 slots) |
| `ADC yes.[0-5]` / `ADC no.[0-5]` | Checkbox | Active duty commitment |
| `military application agency official signature date` | Text | Agency official signature date |
| `Signature Date employee` | Text | Employee signature date |
| `employees Telephone Number2` | Text | Employee phone (military section) |
| `employee's Area Code2` | Text | Employee area code (military section) |
| `email address 2` | Text | Employee email (military section) |

---

## Mapping Priority — What to Wire First

> [!TIP]
> Focus on the **high-value client-facing fields** first. The Agency/Payroll checklist sections can wait since those are typically filled by the agency, not the advisor.

### Immediate Impact Fields (wire these first)

**From Act! CRM → PDF:**
- `Name` / `employee name` / `name` → `firstname` + `lastname`
- `DOB` / `birthdate` → `dateofbirth` (needs date formatting)
- `Address` / `Applicant's Address1` → `homeaddressstreet`
- `Address line 3` / `Applicant's Address2` → `homeaddresscity` + `homeaddressstate` + `homeaddresszip`
- `phone number` / `telephone number` → `homephone` or `workphone`
- `email` / `Email Address` → `emailaddress`
- `Spouse's Name` → `spousename`
- `Spouse's DOB` → `spousedob`
- `dept` / `Department` / `Last employed agency name` → employer fields
