
import json, datetime

TODAY = datetime.date.today().isoformat()

# ── helpers ──────────────────────────────────────────────────────────────────
def field(pdf_field, source, crm_key=None, transform=None, static_value=None,
          note=None, options=None):
    e = {"pdf_field": pdf_field, "source": source}
    if crm_key:       e["crm_key"]       = crm_key
    if transform:     e["transform"]     = transform
    if static_value is not None: e["static_value"] = static_value
    if note:          e["note"]          = note
    if options:       e["options"]       = options
    return e

def needs(pdf_field, note=""):
    return {"pdf_field": pdf_field, "source": "needs_mapping", "note": note}

# ── ACT CRM key references (from sample JSON) ─────────────────────────────
# Standard fields: firstName, lastName, middleName, fullName, homeAddress,
#   homeCity, homeState, homeZip, homePhone, email
# Custom fields (customFieldValues array, accessed by field name):
#   SSN, DateOfBirth, Department, Agency, RetirementSystem,
#   FEGLI_Basic, FEGLI_OptionA, FEGLI_OptionB, FEGLI_OptionC,
#   FEGLI_OptionB_Multiples, FEGLI_OptionC_Multiples,
#   SpouseName, SpouseSSN, SpouseDOB,
#   SeparationDate, JobTitle, PayPlan,
#   BankRoutingNumber, BankAccountNumber, BankAccountType,
#   Beneficiary1_Name, Beneficiary1_SSN, Beneficiary1_Address,
#   Beneficiary1_Relationship, Beneficiary1_Share,
#   Beneficiary2_Name, Beneficiary2_SSN, Beneficiary2_Address,
#   Beneficiary2_Relationship, Beneficiary2_Share,
#   Beneficiary3_Name, Beneficiary3_SSN, Beneficiary3_Address,
#   Beneficiary3_Relationship, Beneficiary3_Share

# ── SF-2818 ──────────────────────────────────────────────────────────────────
sf2818 = {
    "form_id":    "sf2818",
    "form_title": "Continuation of Life Insurance Coverage",
    "pdf_file":   "sf2818.pdf",
    "created":    TODAY,
    "fields": [
        field("employee name",            "crm", "fullName",          "last_first_mi"),
        field("DOB",                      "crm", "DateOfBirth",       "mm/dd/yyyy"),
        field("SSN",                      "crm", "SSN"),
        field("Department",               "crm", "Department"),
        field("work address",             "crm", "Agency"),
        field("claim number",             "crm", "ClaimNumber",       note="CSA/CSF claim#; leave blank if not retired"),
        field("signature date",           "derived", transform="today_date"),
        # Basic Life – checkbox group (one of: Basic Y, Basic N, Full)
        field("Basic Y",                  "crm", "FEGLI_Basic",       "check_if_eq:Y",  options=["Yes","No","Full"]),
        field("Basic N",                  "crm", "FEGLI_Basic",       "check_if_eq:N"),
        field("Full",                     "crm", "FEGLI_Basic",       "check_if_eq:Full"),
        # Reduction election (75%, 50%, None)
        field("75%",                      "crm", "FEGLI_BasicReduction", "check_if_eq:75"),
        field("50%",                      "crm", "FEGLI_BasicReduction", "check_if_eq:50"),
        field("None",                     "crm", "FEGLI_BasicReduction", "check_if_eq:None"),
        # Option A
        field("Option A Y",               "crm", "FEGLI_OptionA",    "check_if_eq:Y"),
        field("Option A N",               "crm", "FEGLI_OptionA",    "check_if_eq:N"),
        field("No Option A",              "crm", "FEGLI_OptionA",    "check_if_eq:Cancelled"),
        # Option B
        field("Option B Y",               "crm", "FEGLI_OptionB",    "check_if_eq:Y"),
        field("Option B N",               "crm", "FEGLI_OptionB",    "check_if_eq:N"),
        field("No Option B",              "crm", "FEGLI_OptionB",    "check_if_eq:Cancelled"),
        field("No reduction multiples",   "crm", "FEGLI_OptionB_NoReductionMultiples"),
        field("full reduction multiples", "crm", "FEGLI_OptionB_FullReductionMultiples"),
        # Option C
        field("Option C Y",               "crm", "FEGLI_OptionC",    "check_if_eq:Y"),
        field("Option C N",               "crm", "FEGLI_OptionC",    "check_if_eq:N"),
        field("No Option C",              "crm", "FEGLI_OptionC",    "check_if_eq:Cancelled"),
        field("Opt C No reduction multiples",   "crm", "FEGLI_OptionC_NoReductionMultiples"),
        field("Option C full reduction multiples", "crm", "FEGLI_OptionC_FullReductionMultiples"),
    ]
}

# ── SF-2823 ──────────────────────────────────────────────────────────────────
sf2823 = {
    "form_id":    "sf2823",
    "form_title": "Designation of Beneficiary – FEGLI",
    "pdf_file":   "sf2823.pdf",
    "created":    TODAY,
    "fields": [
        field("Name",                     "crm", "fullName",          "last_first_mi"),
        field("DOB",                      "crm", "DateOfBirth",       "mm/dd/yyyy"),
        field("SSN",                      "crm", "SSN"),
        field("Department",               "crm", "Department"),
        field("Bureau",                   "crm", "Bureau",            note="Bureau/division; may not exist in CRM yet"),
        field("Location",                 "crm", "Agency",            note="City, State, ZIP of workplace"),
        field("date signed",              "derived", transform="today_date"),
        field("Type of Insured",          "crm", "EmploymentStatus",  "radio:Employee=Employee,Retiree=Retiree,Compensationer=Compensationer"),
        field("I Am",                     "static", static_value="Insured"),
        # Beneficiaries 1-6
        *[field(f"Bene {i}.0",           "crm", f"Beneficiary{i}_Name")       for i in range(1,7)],
        *[field(f"SSN {i}.0",            "crm", f"Beneficiary{i}_SSN")        for i in range(1,7)],
        *[field(f"address {i}.0",        "crm", f"Beneficiary{i}_Address")    for i in range(1,7)],
        *[field(f"Relationship {i}.0",   "crm", f"Beneficiary{i}_Relationship") for i in range(1,7)],
        *[field(f"amount {i}.0",         "crm", f"Beneficiary{i}_Share")      for i in range(1,7)],
        field("Total",                    "derived", transform="sum_beneficiary_shares"),
        # Assignment section
        field("not assigned",             "static", static_value="Yes", note="Check unless client has assigned FEGLI"),
        needs("C. Name",    "Assignee name – only if assigned"),
        needs("C. Address line one", "Assignee address – only if assigned"),
        needs("C. Address line two", "Assignee address line 2"),
        needs("C. Address line three", "Assignee city/state/zip"),
        needs("witnessed",  "Check if witnesses signed below"),
        needs("no beneficiary", "Check if witnesses are not beneficiaries"),
        needs("Witness Address 1", "First witness address"),
        needs("Witness Address 2", "Second witness address"),
    ]
}

# ── SF-3102 ──────────────────────────────────────────────────────────────────
sf3102 = {
    "form_id":    "sf3102",
    "form_title": "Designation of Beneficiary – FERS",
    "pdf_file":   "sf3102.pdf",
    "created":    TODAY,
    "fields": [
        field("Name",                       "crm", "fullName",        "last_first_mi"),
        field("DOB",                        "crm", "DateOfBirth",     "mm/dd/yyyy"),
        field("SSN",                        "crm", "SSN"),
        field("Claim Number",               "crm", "ClaimNumber",     note="If retired"),
        field("Department",                 "crm", "Department"),
        field("Location",                   "crm", "Agency",          note="City, State, ZIP"),
        field("Type",                       "crm", "EmploymentStatus","radio:Employee=Employee,Retired/Applicant=Retiree,Former=Former"),
        field("Retirement System",          "crm", "RetirementSystem","radio:CSRS=CSRS,FERS=FERS"),
        field("date of designation",        "derived", transform="today_date"),
        # Beneficiaries 1-3
        field("Beneficiary 1.0.0",          "crm", "Beneficiary1_Name"),
        field("Beneficiary 1.0.1.0",        "crm", "Beneficiary2_Name"),
        field("Beneficiary 1.0.1.1.0",      "crm", "Beneficiary3_Name"),
        field("Address 1.0.0",              "crm", "Beneficiary1_Address"),
        field("Address 1.0.1.0",            "crm", "Beneficiary2_Address"),
        field("Address 1.0.1.1.0",          "crm", "Beneficiary3_Address"),
        field("Relationship 1.0.0",         "crm", "Beneficiary1_Relationship"),
        field("Relationship 1.0.1.0",       "crm", "Beneficiary2_Relationship"),
        field("Relationship 1.0.1.1.0",     "crm", "Beneficiary3_Relationship"),
        field("Share 1.0.0",                "crm", "Beneficiary1_Share"),
        field("Share 1.0.1.0",              "crm", "Beneficiary2_Share"),
        field("Share 1.0.1.1.0",            "crm", "Beneficiary3_Share"),
        needs("Return address",             "Mailing address of employee"),
        needs("Witness address1",           "First witness address"),
        needs("Witness address2",           "Second witness address"),
    ]
}

# ── SF-3107 (core auto-fillable fields only; checklists left as needs_mapping)
sf3107 = {
    "form_id":    "sf3107",
    "form_title": "Application for Immediate Retirement – FERS",
    "pdf_file":   "sf3107.pdf",
    "created":    TODAY,
    "fields": [
        # Section A – Identifying Information
        field("Name",             "crm", "fullName",       "last_first_mi"),
        field("Other Names",      "crm", "OtherNames",     note="Other names used; may not exist in CRM"),
        field("Address",          "crm", "homeAddress"),
        field("Address line 2",   "crm", "homeAddress2"),
        field("Address line 3",   "derived", transform="city_state_zip"),
        field("phone number",     "crm", "homePhone"),
        field("email",            "crm", "email"),
        field("DOB",              "crm", "DateOfBirth",    "mm/dd/yyyy"),
        field("SSN",              "crm", "SSN"),
        field("USA Y",            "crm", "USCitizen",      "check_if_true"),
        field("USA N",            "crm", "USCitizen",      "check_if_false"),
        field("disability y",     "crm", "Disability",     "check_if_true"),
        field("disability n",     "crm", "Disability",     "check_if_false"),
        # Section B – Federal Service
        field("dept",             "crm", "Department"),
        field("dept2",            "crm", "Agency"),
        field("dept3",            "derived", transform="agency_city_state_zip"),
        field("sep date",         "crm", "SeparationDate", "mm/dd/yyyy"),
        field("title",            "crm", "JobTitle"),
        field("pay plan",         "crm", "PayPlan"),
        field("6. pay plan",      "crm", "PayPlan"),
        field("armed forces y",   "crm", "MilitaryService","check_if_true"),
        field("armed forces n",   "crm", "MilitaryService","check_if_false"),
        field("military retired pay y", "crm", "MilitaryRetiredPay", "check_if_true"),
        field("military retired pay n", "crm", "MilitaryRetiredPay", "check_if_false"),
        # Section C – Marital
        field("married y",        "crm", "MaritalStatus",  "check_if_eq:Married"),
        field("married n",        "crm", "MaritalStatus",  "check_if_eq:Single"),
        field("Spouse's Name",    "crm", "SpouseName",     "last_first_mi"),
        field("Spouse's DOB",     "crm", "SpouseDOB",      "mm/dd/yyyy"),
        field("Spouse's SSN",     "crm", "SpouseSSN"),
        field("Place of marriage","crm", "PlaceOfMarriage",note="City and state"),
        field("marriage date",    "crm", "MarriageDate",   "mm/dd/yyyy"),
        # Section D – Annuity Election
        field("maximum",          "crm", "SurvivorElection","check_if_eq:Maximum"),
        field("partial",          "crm", "SurvivorElection","check_if_eq:Partial"),
        field("no regular",       "crm", "SurvivorElection","check_if_eq:None"),
        field("insurable",        "crm", "SurvivorElection","check_if_eq:InsurableInterest"),
        # Section E – Insurance
        field("FEHB Y",           "crm", "FEHB",           "check_if_true"),
        field("FEHB N",           "crm", "FEHB",           "check_if_false"),
        field("FEGLI Y",          "crm", "FEGLI_Basic",     "check_if_truthy"),
        field("FEGLI N",          "crm", "FEGLI_Basic",     "check_if_falsy"),
        # Section H – Payment / Direct Deposit
        field("to checking",      "crm", "BankAccountType","check_if_eq:Checking"),
        field("savings account",  "crm", "BankAccountType","check_if_eq:Savings"),
        field("checking account", "crm", "BankAccountType","check_if_eq:Checking"),
        field("routing number",   "crm", "BankRoutingNumber"),
        field("checking/savings", "crm", "BankAccountNumber"),
        field("financial inst name","crm","BankName"),
        field("date signed I",    "derived", transform="today_date"),
        # Dependents 1-8
        *[field(f"dependent {i}",     "crm", f"Dependent{i}_Name")  for i in range(1,9)],
        *[field(f"dependent {i} DOB", "crm", f"Dependent{i}_DOB",   "mm/dd/yyyy") for i in range(1,9)],
        # Schedule A/B/C – mostly agency-filled; mark needs_mapping
        needs("Branch Service",   "Military branch – Schedule A"),
        needs("serial number",    "Military serial # – Schedule A"),
        needs("active duty from", "Active duty start – Schedule A"),
        needs("active duty to",   "Active duty end – Schedule A"),
        needs("grade",            "Military grade – Schedule A"),
    ]
}

# ── SF-3108 ──────────────────────────────────────────────────────────────────
sf3108 = {
    "form_id":    "sf3108",
    "form_title": "Application to Make Deposit or Redeposit",
    "pdf_file":   "sf3108.pdf",
    "created":    TODAY,
    "fields": [
        field("name",                      "crm", "fullName",         "last_first_mi"),
        field("other names",               "crm", "OtherNames"),
        field("birthdate",                 "crm", "DateOfBirth",      "mm/dd/yyyy"),
        field("Applicant's Address1",      "crm", "homeAddress"),
        field("Applicant's Address2",      "derived", transform="city_state_zip"),
        field("Applicant's SSN",           "crm", "SSN"),
        field("Last employed agency name", "crm", "Department"),
        field("Last employed agency location","crm","Agency"),
        field("Applicant's Job position",  "crm", "JobTitle"),
        field("area code",                 "crm", "homePhone",        "extract_area_code"),
        field("telephone number",          "crm", "homePhone",        "extract_phone_number"),
        field("Email Address",             "crm", "email"),
        field("date signed",               "derived", transform="today_date"),
        field("separation date",           "crm", "SeparationDate",   "mm/dd/yyyy"),
        field("deductions Y",              "crm", "RetirementDeductions","check_if_true"),
        field("deductions N",              "crm", "RetirementDeductions","check_if_false"),
        # Service periods 1-5
        *[field(f"agency name 1.{i}",              "crm", f"ServicePeriod{i+1}_Agency")    for i in range(5)],
        *[field(f"agency location 1.{i}",          "crm", f"ServicePeriod{i+1}_Location")  for i in range(5)],
        *[field(f"Job position 1.{i}",             "crm", f"ServicePeriod{i+1}_JobTitle")  for i in range(5)],
        *[field(f"Period of Service Beginning Date 1.{i}", "crm", f"ServicePeriod{i+1}_StartDate","mm/dd/yyyy") for i in range(5)],
        *[field(f"Period of Service Ending Date 1.{i}",   "crm", f"ServicePeriod{i+1}_EndDate",  "mm/dd/yyyy") for i in range(5)],
        needs("claim number(s)",           "CSA/CSF claim number if retired"),
        needs("filed yes",                 "Has previously filed a claim?"),
        needs("filed no",                  "Has previously filed a claim?"),
    ]
}

# ── W-4P ─────────────────────────────────────────────────────────────────────
# IRS W-4P field mapping (XFA form – field names are positional)
# Page 1 fields based on IRS 2024 W-4P spec
fw4p = {
    "form_id":    "fw4p",
    "form_title": "Withholding Certificate for Pension or Annuity Payments (W-4P)",
    "pdf_file":   "fw4p.pdf",
    "created":    TODAY,
    "note":       "XFA form – fields have no tooltips; mapped by IRS W-4P 2024 field position",
    "fields": [
        # Step 1a – Name & Address
        field("topmostSubform[0].Page1[0].Step1a[0].f1_01[0]", "crm", "firstName",  note="First name / MI"),
        field("topmostSubform[0].Page1[0].Step1a[0].f1_02[0]", "crm", "lastName",   note="Last name"),
        field("topmostSubform[0].Page1[0].Step1a[0].f1_03[0]", "derived", transform="city_state_zip", note="City, State, ZIP"),
        field("topmostSubform[0].Page1[0].Step1a[0].f1_04[0]", "crm", "homeAddress",note="Street address"),
        # Step 1b – SSN
        field("topmostSubform[0].Page1[0].f1_05[0]",           "crm", "SSN"),
        # Step 1c – Filing status (radio: Single/MFS=c1_1[0], MFJ/QSS=c1_1[1], HoH=c1_1[2])
        field("topmostSubform[0].Page1[0].c1_1[0]",            "crm", "FilingStatus","check_if_eq:Single"),
        field("topmostSubform[0].Page1[0].c1_1[1]",            "crm", "FilingStatus","check_if_eq:MarriedFilingJointly"),
        field("topmostSubform[0].Page1[0].c1_1[2]",            "crm", "FilingStatus","check_if_eq:HeadOfHousehold"),
        # Step 2 – Multiple pensions
        field("topmostSubform[0].Page1[0].c1_2[0]",            "crm", "MultipleJobsOrSpouseWorks","check_if_true",
              note="Step 2(b) checkbox"),
        # Step 3 – Dependents / Credits (f1_06 = qualifying children * $2000, f1_07 = other dependents * $500, f1_08 = total)
        field("topmostSubform[0].Page1[0].f1_06[0]",           "crm", "ChildTaxCreditAmount",  note="Step 3: qualifying children credit"),
        field("topmostSubform[0].Page1[0].f1_07[0]",           "crm", "OtherDependentsCredit", note="Step 3: other dependents credit"),
        field("topmostSubform[0].Page1[0].f1_08[0]",           "derived", transform="sum_step3_credits"),
        # Step 4 – Other adjustments
        field("topmostSubform[0].Page1[0].Step3_ReadOrder[0].f1_09[0]", "crm", "OtherIncome",    note="Step 4a: other income not from jobs"),
        field("topmostSubform[0].Page1[0].Step3_ReadOrder[0].f1_10[0]", "crm", "Deductions",     note="Step 4b: deductions"),
        field("topmostSubform[0].Page1[0].Step3_ReadOrder[0].f1_11[0]", "crm", "ExtraWithholding",note="Step 4c: extra withholding per period"),
        # Page 4 – Worksheet (optional; pre-fill if data available)
        *[needs(f"topmostSubform[0].Page4[0].f4_{str(i).zfill(2)}[0]", "W-4P Page 4 worksheet – agent completes") for i in range(1,26)],
    ]
}

# ── SF-2809 ──────────────────────────────────────────────────────────────────
sf2809 = {
    "form_id":    "sf2809",
    "form_title": "Health Benefits Election Form",
    "pdf_file":   "sf2809.pdf",
    "created":    TODAY,
    "fields": [
        # Enrollee
        field("Name. Name",                    "crm", "fullName",        "last_first_mi"),
        field("SS. SS",                        "crm", "SSN"),
        field("DOB. DOB",                      "crm", "DateOfBirth",     "mm/dd/yyyy"),
        field("address 1. address 1",          "derived", transform="full_home_address"),
        field("Preferred telephone number. Preferred telephone number", "crm", "homePhone"),
        field("11 email address",              "crm", "email"),
        field("Sex1",                          "crm", "Gender",          "radio:Male=Male,Female=Female"),
        field("Married1",                      "crm", "MaritalStatus",   "radio:Yes=Married,No=Single"),
        field("OtherInsurance1",               "crm", "OtherInsurance",  "radio:Yes=true,No=false"),
        # Medicare
        field("Med A",                         "crm", "MedicarePartA",   "check_if_true"),
        field("Med B",                         "crm", "MedicarePartB",   "check_if_true"),
        field("Med D",                         "crm", "MedicarePartD",   "check_if_true"),
        field("  medical claim.  medical claim","crm", "MedicareBeneficiaryID"),
        # FEHB plan info
        field("current plan",                  "crm", "CurrentFEHBPlan"),
        field("enrollment code",               "crm", "CurrentFEHBCode"),
        field("New Plan Name",                 "crm", "NewFEHBPlan"),
        field("enrollment new",                "crm", "NewFEHBCode"),
        field("event",                         "crm", "LifeEventCode"),
        field("event date 1",                  "crm", "LifeEventDate",   "mm/dd/yyyy"),
        # Family member 1 (spouse)
        field("13. FM1 Name",                  "crm", "SpouseName",      "last_first_mi"),
        field("14. SS",                        "crm", "SpouseSSN"),
        field("15. DOB",                       "crm", "SpouseDOB",       "mm/dd/yyyy"),
        field(" relation. relation",           "static", static_value="01", note="01 = Spouse"),
        field("Sex2",                          "crm", "SpouseGender",    "radio:Male=Male,Female=Female"),
        # Family members 2-3
        needs("25 FM2 Name",                   "Family member 2 – not yet in CRM"),
        needs("26 SSN FM2",                    "FM2 SSN"),
        needs("27. DOB",                       "FM2 DOB"),
        needs("37 FM3 Name",                   "Family member 3 – not yet in CRM"),
        needs("38 SSn FM3",                    "FM3 SSN"),
        needs("39. DOB",                       "FM3 DOB"),
        # Other insurance
        needs("Policy number. Insurance Name", "Other insurance name"),
        needs("Policy number. Policy number",  "Other insurance policy#"),
    ]
}

# ── Combine & write ───────────────────────────────────────────────────────────
all_mappings = {
    "sf2818": sf2818,
    "sf2823": sf2823,
    "sf3102": sf3102,
    "sf3107": sf3107,
    "sf3108": sf3108,
    "fw4p":   fw4p,
    "sf2809": sf2809,
}

with open("ora_form_mappings.json", "w", encoding="utf-8") as f:
    json.dump(all_mappings, f, indent=2)

# Print summary
for fid, fdata in all_mappings.items():
    fields = fdata["fields"]
    mapped  = sum(1 for x in fields if x.get("source") not in ("needs_mapping",))
    pending = sum(1 for x in fields if x.get("source") == "needs_mapping")
    print(f"{fid:10s}  mapped={mapped:3d}  needs_mapping={pending:3d}  total={len(fields):3d}")

print("\nWrote ora_form_mappings.json")
