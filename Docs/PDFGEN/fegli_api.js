/**
 * (c) 2026 Cowboy & Associates LLC. All Rights Reserved.
 * FEGLI Intelligence Engine - Headless API
 *
 * This module now delegates to the shared FEGLI path inside the main
 * PDF preparer API so button calls and full PDF generation stay in sync.
 */

const PDF_Preparer_API = require("./cowboy_pdf_preparer_api.js");

const FEGLI_API = {
    normalizeButtonInput: function(actJson) {
        const source = PDF_Preparer_API.cloneJson(actJson || {});

        if (!source.customFields && source.fields) {
            source.customFields = PDF_Preparer_API.cloneJson(source.fields);
        }

        source.customFields = source.customFields || {};

        if (!source.birthday && source.customFields.birthday) {
            source.birthday = source.customFields.birthday;
        }

        return source;
    },

    calculateCurrentButton: function(actJson, employeeRateInput) {
        const crmInput = this.normalizeButtonInput(actJson);
        const customFields = crmInput.customFields || {};
        const employeeRates = PDF_Preparer_API.parseRates(employeeRateInput);
        const salary = PDF_Preparer_API.toNumber(customFields.salaryamount);
        const currentAge = parseInt(customFields.cust_age_033220843, 10) || PDF_Preparer_API.ageOnDate(crmInput.birthday, new Date());
        const explicitCode = String(customFields.feglicodeactive || "").trim().toUpperCase();
        const payPeriodCost = PDF_Preparer_API.toNumber(customFields.fegliperpayperiodcalc || customFields.fegliperpayperiod);
        const resolvedCode = explicitCode || PDF_Preparer_API.decipherActiveCode(salary, currentAge, payPeriodCost, employeeRates) || "C0";
        const activeFegli = PDF_Preparer_API.calculateActiveFEGLI({
            salary,
            age: currentAge,
            code: resolvedCode
        }, employeeRates);
        const activeElection = PDF_Preparer_API.getComponentsFromLetter(resolvedCode.charAt(0));
        const optionCMultiple = Math.min(5, Math.max(0, parseInt(String(resolvedCode).slice(1), 10) || 0));
        const currentCost = PDF_Preparer_API.roundMoney(
            activeFegli.basicPremium +
            activeFegli.optAPremium +
            activeFegli.optBPremium +
            activeFegli.optCPremium
        );

        return {
            customFields: {
                feglicodeactive: resolvedCode,
                feglinetcost: PDF_Preparer_API.formatCrmDecimal(currentCost, 2),
                basiclife: PDF_Preparer_API.formatCrmWholeNumber(activeFegli.basicCoverage),
                optiona: activeElection.hasA ? "Yes" : "No",
                optionb: String(activeElection.bMult),
                optionc: String(optionCMultiple)
            },
            displayFields: {
                "FEGLI Code": resolvedCode,
                "Current FEGLI Cost": PDF_Preparer_API.formatCurrency(currentCost),
                "Basic Life": PDF_Preparer_API.formatCurrency(activeFegli.basicCoverage),
                "Option A": activeElection.hasA ? "Yes" : "No",
                "Option B": String(activeElection.bMult),
                "Option C": String(optionCMultiple)
            }
        };
    },

    calculateRetirementButton: function(actJson, annuitantRateInput) {
        const crmInput = this.normalizeButtonInput(actJson);
        const customFields = crmInput.customFields || {};
        const annuitantRates = PDF_Preparer_API.parseRates(annuitantRateInput);
        const salary = PDF_Preparer_API.toNumber(customFields.salaryamount);
        const retireAge = Math.max(0, parseInt(customFields.feglicostage, 10) || 0);
        const reduction = String(customFields.feglireduction || "75");
        const hasA = PDF_Preparer_API.parseBoolean(customFields.optiona_retire !== undefined ? customFields.optiona_retire : customFields.optiona);
        const bMult = Math.min(5, Math.max(0, parseInt(customFields.optionb_retire !== undefined ? customFields.optionb_retire : customFields.optionb, 10) || 0));
        const cMult = Math.min(5, Math.max(0, parseInt(customFields.optionc_retire !== undefined ? customFields.optionc_retire : customFields.optionc, 10) || 0));
        const retireeFegli = PDF_Preparer_API.calculateRetireeFEGLI({
            salary,
            age: retireAge,
            reduction,
            hasA,
            bMult,
            cMult
        }, annuitantRates);
        const retirementCost = PDF_Preparer_API.roundMoney(
            retireeFegli.basicPremium +
            retireeFegli.optAPremium +
            retireeFegli.optBPremium +
            retireeFegli.optCPremium
        );

        return {
            customFields: {
                basicliferetire: PDF_Preparer_API.formatCrmWholeNumber(retireeFegli.basicCoverage),
                optiona_retire: hasA ? "Yes" : "No",
                optionb_retire: String(bMult),
                optionc_retire: String(cMult),
                lessfegliretire: PDF_Preparer_API.formatCrmDecimal(retirementCost, 2)
            },
            displayFields: {
                "Projected FEGLI Age": String(retireAge),
                "Reduction": reduction,
                "Basic Life Retire": PDF_Preparer_API.formatCurrency(retireeFegli.basicCoverage),
                "Option A Retire": hasA ? "Yes" : "No",
                "Option B Retire": String(bMult),
                "Option C Retire": String(cMult),
                "Retired FEGLI Cost": PDF_Preparer_API.formatCurrency(retirementCost)
            }
        };
    },

    execute: function(actJson, employeeRateInput, annuitantRateInput) {
        return PDF_Preparer_API.executeFegli(this.normalizeButtonInput(actJson), employeeRateInput, annuitantRateInput);
    }
};

if (typeof module !== "undefined") {
    module.exports = FEGLI_API;
}
