# CRM Handoff Package

This folder is the turnover package for the ACT-connected agent and any reviewer agent such as Maria.

Use the ACT payload keys shown here exactly. The API reads ACT root fields plus `customFields`, performs the retirement math, returns CRM write-back values, and returns template-field payloads for PDF filling.

This package is the contract for:

- what ACT fields to read from the contact record
- which internal function to call for each ACT button
- what response fields to write back into ACT CRM
- how blueprint and unsorted PDF field payloads are returned
- how generated blueprint files should be named

## Files

- `ACT_AGENT_TURNOVER.md`
  - Primary human-readable turnover document for the ACT-connected agent.
  - Includes the button menu, request rules, write-back rules, and integration notes.

- `ACT_BUTTON_FUNCTIONS.json`
  - Machine-friendly contract for each button/function pairing.
  - Good handoff file for another agent that needs exact function names and expected return shapes.

- `MARIA_REVIEW_CHECKLIST.md`
  - Short checklist for Maria to verify coverage before implementation starts.

- `CRM_REQUEST_MINIMUM_SAMPLE.json`
  - Minimum ACT-style request body for the main engine path.

- `CRM_RESPONSE_EXPECTED_SAMPLE.json`
  - Matching response for the older main-engine sample path.
  - Still useful as a compatibility reference, but the ACT-connected agent should now prefer the explicit button contracts in `ACT_AGENT_TURNOVER.md` and `ACT_BUTTON_FUNCTIONS.json`.

- `CRM_FIELDS_TO_ADD.json`
  - The CRM fields that should exist for this integration.
  - Split into ACT root fields used by the API, inbound custom fields, and outbound CRM update fields.

- `CRM_REQUEST_PARTNER_DEMO.json`
  - A more realistic ACT payload for partner review.

- `CRM_RESPONSE_PARTNER_DEMO.json`
  - The response generated from the partner demo payload.

## Request Contract

- Use the real ACT root keys such as `firstName`, `lastName`, `fullName`, `birthday`, `editedBy`, and `homeAddress.state`.
- `firstName` and `lastName` are required for the generated PDF filename so the output saves as `Last Name, First Name Blueprint.pdf`.
- Put the retirement/planning values under `customFields`.
- Send money, balances, and rates as strings.
- `surviborbenefits` is the survivor election input used by the API for PDF math.
- `tspbalanceused` is the advisor-selected TSP base the API should use for the PDF.
- `tspdistributionrate` is optional. If blank, the API defaults to `4` before age `72` and `5` at age `72` or older.
- `militarypension`, `vadisabilitymonthlyamt`, `spousesocialsecurityincome`, and `spouse_pension` are monthly pass-through values. The API returns them back in the CRM update payload without changing them.
- The blueprint template also supports top-level `rep` and `calendar` objects:
  - `rep.name`, `rep.email`, `rep.phone` populate the multiline `Advisor` field
  - `calendar[]` can drive `Appt Date`
- The `Notes` field is built from the note-source CRM fields listed in `pdf-map.csv`, not only `myconcerns` / `myrecomendations`.

## ACT Button / Agent Usage

- The ACT-connected agent should use `ACT_AGENT_TURNOVER.md` as the primary implementation document.
- The ACT-connected agent should use `ACT_BUTTON_FUNCTIONS.json` as the exact button-to-function contract.
- `Final Calculation` should call `executeFinalCalculation(...)` and write the returned `customFields` back into ACT.
- `Generate Blueprint` should call `buildBlueprintResponse(...)`, then fill the local blueprint template PDF using the returned `templateFields`.
- `Calculate Current FEGLI` should call `calculateCurrentButton(...)`.
- `Calculate Retirement FEGLI` should call `calculateRetirementButton(...)`.
- `FEGLI-only` calls can use `executeFegli(...)` if the integration needs the whole FEGLI snapshot without running the full blueprint flow.
- The unsorted advisor-form buttons should call the matching `build...Prefill(...)` wrapper and then apply the returned `mappedFields` to the implementation-provided PDF file path for that document.
- `CRM_FIELDS_TO_ADD.json` is primarily a developer verification checklist for confirming that the needed ACT fields exist; it does not need to be consumed by the ACT-connected agent at runtime.
- The ACT-side agent should expect the generated blueprint filename to follow `Last Name, First Name Blueprint.pdf`.

## Response Contract

- `executeFinalCalculation(...)` returns:
  - `customFields`
  - `crmUpdatePayload`
  - `fieldList`
  - `compatibilityFieldList`
  - `stateTaxGuidance`
  - `displayFields`
- `buildBlueprintResponse(...)` returns:
  - `templateFields`
- The generated blueprint filename follows `Last Name, First Name Blueprint.pdf` and is driven from the ACT root fields `lastName` and `firstName`.
- The clean CRM-facing output fields to use for ACT write-back are:
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
- The API still returns the older `calculated*` keys for backward compatibility, but the list above is the clean CRM contract to build against.
- `fieldList` is the authoritative clean write-back list for `Final Calculation`.
- `survisorbenetit` in the response is the monthly survivor cost, not the survivor election.
- `socialsecurityincome` in the response is the calculated net Social Security amount written back into the original CRM field.
- `militarypension` in the response is the returned net/pass-through military pension amount written back into the original CRM field.
- `feglinetcost` in the response is the monthly FEGLI cost.
- `annualleavepayout` is calculated as `(salaryamount / 2080) * annualleave`.
- The main engine now also exposes explicit split helpers:
  - `executeFinalCalculation(...)` -> returns only the CRM-focused response for ACT write-back
  - `buildBlueprintResponse(...)` -> returns the template field payload for blueprint generation

## TSP Rule

- `tspbalanceused` drives the gross TSP withdrawal shown in the PDF.
- Taxable TSP is still capped at the traditional balance actually used, so Roth dollars can increase the gross draw without increasing the taxable slice beyond the traditional portion used.

## Unsorted Forms

- The current unsorted-form wrappers return mapped field payloads, not finished PDFs.
- The ACT-connected agent or the downstream implementation layer should supply the source PDF file path for each unsorted form at runtime.
- The reviewed `Resources/unsorted/*_pdf-map.csv` files remain the source of truth for unsorted field mapping.
- Current unsorted wrappers:
  - `buildFw4pPrefill(...)`
  - `buildSf2809Prefill(...)`
  - `buildSf2818Prefill(...)`
  - `buildSf2823Prefill(...)`
  - `buildSf3102Prefill(...)`
  - `buildSf3102_2022_10_508_1Prefill(...)`
  - `buildSf3107Prefill(...)`
  - `buildSf3108Prefill(...)`

## Matching Test Files

These handoff files mirror the active repo fixtures:

- `test_inputs/crm_request_new.json`
- `test_outputs/crm_response.json`
- `test_inputs/crm_request_partner_demo.json`
- `test_outputs/crm_response_partner_demo.json`
- `test_inputs/crm_request_advisor_notes_demo.json`
- `test_outputs/button_functions/button_function_summary.json`
