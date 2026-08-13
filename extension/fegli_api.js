/**
 * (c) 2026 Cowboy & Associates LLC. All Rights Reserved. Version 37.2
 * FEGLI Intelligence Engine - Headless API
 *
 * Rate table is now fetched from the FEDSafe API as JSON.
 * Field names match the fegli_rates_employee table:
 *   age_min, age_max, basic, opt_a, opt_b, opt_c
 */

const FEGLI_API = {

    // --- 2. OPM CORE MATH ---
    calculateBIA: (salary) => {
        // Ensure salary is a float. 150001.00 / 1000 = 150.001
        // Math.ceil(150.001) = 151
        // 151 * 1000 = 151000 + 2000 = 153000
        const salaryNum = parseFloat(salary);
        const roundedBase = Math.ceil(salaryNum / 1000) * 1000;
        
        return { 
            base: roundedBase, 
            total: roundedBase + 2000 
        };
    },

    getOPMLetter: (hasA, bMult, hasC) => {
        const map = {
            0: ["C", "D", "E", "F"],
            1: ["G", "H", "I", "J"],
            2: ["K", "L", "M", "N"],
            3: ["9", "P", "Q", "R"],
            4: ["S", "T", "U", "V"],
            5: ["W", "X", "Y", "Z"]
        };
        const col = !hasA && !hasC ? 0 : (hasA && !hasC ? 1 : (!hasA && hasC ? 2 : 3));
        return map[bMult][col];
    },

    getComponentsFromLetter: (letter) => {
        let res = { bMult: 0, hasA: false, hasC: false };
        if ("CDEF".indexOf(letter) > -1) res.bMult = 0;
        else if ("GHIJ".indexOf(letter) > -1) res.bMult = 1;
        else if ("KLMN".indexOf(letter) > -1) res.bMult = 2;
        else if ("9PQR".indexOf(letter) > -1) res.bMult = 3;
        else if ("STUV".indexOf(letter) > -1) res.bMult = 4;
        else if ("WXYZ".indexOf(letter) > -1) res.bMult = 5;

        if ("DFHJLNPRTVXZ".indexOf(letter) > -1) res.hasA = true;
        if ("EFIJMNQRUVYZ".indexOf(letter) > -1) res.hasC = true;
        return res;
    },

    // --- 3. REVERSE DECODER ---
    // rateTable: JSON array from GET /api/fegli-rates-employee
    // Fields: age_min, age_max, basic, opt_a, opt_b, opt_c
    decipherActiveCode: function(salary, age, biWeeklyCost, rateTable) {
        const rates = rateTable.find(r => age >= r.age_min && age <= r.age_max);
        if (!rates) return "C0";

        const bia = this.calculateBIA(salary);
        const basicPrem = (bia.total / 1000) * rates.basic;

        let bestMatch = "C0";
        let minDiff = 9999;

        for (let b = 0; b <= 5; b++) {
            for (let c = 0; c <= 5; c++) {
                for (let a = 0; a <= 1; a++) {
                    const hasA = (a === 1);
                    const hasC = (c > 0);

                    let test = basicPrem + (a * rates.opt_a) + (b * (bia.base / 1000) * rates.opt_b) + (c * rates.opt_c);

                    if (test > biWeeklyCost + 0.05) continue;

                    let diff = biWeeklyCost - test;
                    if (diff < minDiff) {
                        minDiff = diff;
                        const letter = this.getOPMLetter(hasA, b, hasC);
                        bestMatch = letter + c;
                    }
                }
            }
        }
        return bestMatch;
    },

    // --- 4. MAIN API EXECUTION ---
    // actJson:   the payload from Act! (with customFields)
    // rateTable: JSON array from GET /api/fegli-rates-employee
    execute: function(actJson, rateTable) {
        let output = JSON.parse(JSON.stringify(actJson));
        const custom = output.customFields;
        const db = rateTable; // already parsed JSON — no CSV conversion needed

        // Standardizing inputs
        const salary = parseFloat(String(custom.salaryamount || '0').replace(/[$,]/g, '')) || 0;
        const age = parseInt(custom.age || custom.cust_age_033220843) || 0;
        const biWeeklyCost = parseFloat(custom.fegliperpayperiod) || 0;
        const existingCode = (custom.feglicodeactive || "").trim();

        // 1. Resolve Code
        let finalCode = "C0";
        if (existingCode !== "") {
            finalCode = existingCode.toUpperCase();
        } else if (biWeeklyCost > 0) {
            finalCode = this.decipherActiveCode(salary, age, biWeeklyCost, db);
        }

        // 2. Break down components
        const bia = this.calculateBIA(salary);
        const codeInfo = this.getComponentsFromLetter(finalCode[0]);
        const cMult = parseInt(finalCode[1]) || 0;

        // 3. Update the Act! Clone
        custom.feglicodeactive = finalCode;
        custom.basiclife = bia.total.toFixed(2);
        custom.optiona = codeInfo.hasA;
        custom.optionb = codeInfo.bMult.toString();
        custom.optionc = cMult.toString();

        return output;
    },
    // --- 5. VALID CODE GENERATOR ---
    // Generates the full list of valid OPM FEGLI codes using the letter map.
    // Same algorithm as the server's getValidFegliCodes() in fegli-engine.ts.
    // Used as a fallback when the /api/proxy/fegli-codes endpoint is unavailable.
    getValidCodes: function() {
        const codes = [];
        for (let bMult = 0; bMult <= 5; bMult++) {
            for (const hasA of [false, true]) {
                // xN codes: no option C (digit 0)
                codes.push(this.getOPMLetter(hasA, bMult, false) + '0');
                // xN codes: with option C (digits 1-5)
                for (let c = 1; c <= 5; c++) {
                    codes.push(this.getOPMLetter(hasA, bMult, true) + c);
                }
            }
        }
        codes.push('A0', 'B0', '99'); // OPM special codes
        return codes;
    }
};

if (typeof module !== 'undefined') { module.exports = FEGLI_API; }