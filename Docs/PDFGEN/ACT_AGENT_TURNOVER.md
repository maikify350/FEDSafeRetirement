# ACT Agent Turnover

This is the primary turnover document for the ACT-connected agent.

The ACT-side integration should treat the Cowboy engine as a function surface with separate button calls. Do not use one generic path for every button. Each button now has a specific function and a specific expected return shape.

## Core Rule

Build one ACT-style request object from the current contact record.

That request should include:

- ACT root fields such as `firstName`, `lastName`, `fullName`, `birthday`, `editedBy`
- `homeAddress`
- `businessAddress` if available
- `customFields`
- `rep` when blueprint advisor details are available
- `calendar` when appointment date should come from ACT calendar data

Use the same request shape for all button calls unless a smaller path is easier in the ACT layer.

## Button Map

### Final Calculation

Call:

`PDF_Preparer_API.executeFinalCalculation(actJson, employeeRates, annuitantRates, federalTaxRates, stateTaxRates, stateRetirementTaxRules)`

Write back:

- `customFields`

Expected clean write-back fields:

- `federalpension`
- `socialsecurityincome`
- `ferssupplement`
- `militarypension`
- `vadisabilitynet`
- `spousessnet`
- `spousepensionnet`
- `survisorbenetit`
- `survivorbenefit`
- `feglinetcost`
- `add_total`
- `minus_total`
- `annualleavepayout`

Notes:

- `fieldList` is returned and should be treated as the authoritative write-back field list.
- `crmUpdatePayload` is also returned if the ACT-side integration wants the broader compatibility payload.

### Generate Blueprint

Call:

`PDF_Preparer_API.buildBlueprintResponse(actJson, employeeRates, annuitantRates, federalTaxRates, stateTaxRates, stateRetirementTaxRules)`

Use:

- `templateFields`

Then:

- fill the blueprint template PDF with the returned `templateFields`
- save the generated file as `Last Name, First Name Blueprint.pdf`

Notes:

- `Advisor` is multiline:
  - line 1 = `rep.name`
  - line 2 = `rep.email | rep.phone`
- `Notes` is built from the mapped note-source CRM fields line by line

### Calculate Current FEGLI

Call:

`FEGLI_API.calculateCurrentButton(actJson, employeeRates)`

Returns `customFields` with:

- `feglicodeactive`
- `feglinetcost`
- `basiclife`
- `optiona`
- `optionb`
- `optionc`

Input rule:

- reads `feglicodeactive` or `fegliperpayperiodcalc`
- uses employee FEGLI rate table

### Calculate Retirement FEGLI

Call:

`FEGLI_API.calculateRetirementButton(actJson, annuitantRates)`

Returns `customFields` with:

- `basicliferetire`
- `optiona_retire`
- `optionb_retire`
- `optionc_retire`
- `lessfegliretire`

Input rule:

- reads `feglicostage`
- reads `feglireduction`
- uses retirement FEGLI election fields and annuitant FEGLI rate table

### FEGLI-only Snapshot

Call:

`PDF_Preparer_API.executeFegli(actJson, employeeRates, annuitantRates)`

Use this only when the ACT flow needs the full FEGLI display snapshot without running the full blueprint or final-calculation paths.

### Unsorted Advisor Forms

Calls:

- `buildFw4pPrefill(actJson)`
- `buildSf2809Prefill(actJson)`
- `buildSf2818Prefill(actJson)`
- `buildSf2823Prefill(actJson)`
- `buildSf3102Prefill(actJson)`
- `buildSf3102_2022_10_508_1Prefill(actJson)`
- `buildSf3107Prefill(actJson)`
- `buildSf3108Prefill(actJson)`

Return shape:

- `formKey`
- `mapFile`
- `mappedFields`
- `mappingRows`
- `unmappedFields`

Important:

- these functions currently return mapped field payloads, not finished PDFs
- the implementation will provide the source PDF file path at runtime
- the ACT-connected agent should pass the returned `mappedFields` into the PDF-fill layer for the supplied file path

## Input Reminders

- Prefer `homeAddress.state`
- Send money and balances as strings
- `annualleavepayout` is calculated from `salaryamount` and `annualleave`
- phone preference for unsorted forms is `mobilephone` over `homephone`
- name formatting for unsorted forms is `Last, First`
- birthdays for unsorted forms are `MM/DD/YYYY`
- SF3102 return address format is:
  - `homeAddress.line1`
  - `homeAddress.city, homeAddress.state, homeAddress.postalcode`

## Safe Write-Back Rules

- For `Final Calculation`, write back only the clean fields from `fieldList` unless the ACT integration explicitly needs compatibility fields.
- Do not overwrite unrelated ACT data from `displayFields`.
- Treat `displayFields` as UI/debug/support values, not the primary ACT write-back contract.
- Treat `stateTaxGuidance` as advisory metadata for the ACT layer or advisor-facing UI.

## Verified Status

The button regression at `test_outputs/button_functions/button_function_summary.json` passed on `2026-04-24` for:

- current FEGLI button
- retirement FEGLI button
- FEGLI-only path
- Final Calculation
- Generate Blueprint
- all 8 unsorted prefill wrappers
