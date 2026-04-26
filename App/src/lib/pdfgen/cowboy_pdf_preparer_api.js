/**
 * (c) 2026 Cowboy & Associates LLC. All Rights Reserved.
 * Cowboy PDF Preparer API
 */

const fs = require("fs");
const path = require("path");

const FINAL_CALCULATION_CRM_FIELDS = [
    "federalpension",
    "socialsecurityincome",
    "ferssupplement",
    "militarypension",
    "vadisabilitynet",
    "spousessnet",
    "spousepensionnet",
    "survisorbenetit",
    "survivorbenefit",
    "feglinetcost",
    "add_total",
    "minus_total",
    "annualleavepayout"
];

const PDF_Preparer_API = {
    // --- 1. DATA UTILITIES ---
    normalizeRateRows: function(rows) {
        if (!Array.isArray(rows)) return [];

        return rows.map((row) => {
            if (!row || typeof row !== "object" || Array.isArray(row)) return {};

            const normalized = {};
            Object.entries(row).forEach(([key, value]) => {
                const normalizedKey = String(key || "").trim().toLowerCase();
                if (!normalizedKey) return;

                if (typeof value === "number") {
                    normalized[normalizedKey] = value;
                    return;
                }

                if (typeof value === "string") {
                    const trimmedValue = value.trim();
                    normalized[normalizedKey] = trimmedValue === "" || Number.isNaN(Number(trimmedValue))
                        ? trimmedValue
                        : parseFloat(trimmedValue);
                    return;
                }

                normalized[normalizedKey] = value;
            });

            return normalized;
        });
    },

    parseRates: function(input) {
        if (!input) return [];

        if (Array.isArray(input)) {
            return this.normalizeRateRows(input);
        }

        if (typeof input === "object") {
            if (Array.isArray(input.rows)) return this.normalizeRateRows(input.rows);
            if (Array.isArray(input.data)) return this.normalizeRateRows(input.data);
            return this.normalizeRateRows([input]);
        }

        if (typeof input !== "string") return [];

        const trimmedInput = input.trim();
        if (trimmedInput === "") return [];

        if (trimmedInput.startsWith("{") || trimmedInput.startsWith("[")) {
            const parsedJson = JSON.parse(trimmedInput);
            if (Array.isArray(parsedJson)) return this.normalizeRateRows(parsedJson);
            if (parsedJson && typeof parsedJson === "object") {
                if (Array.isArray(parsedJson.rows)) return this.normalizeRateRows(parsedJson.rows);
                if (Array.isArray(parsedJson.data)) return this.normalizeRateRows(parsedJson.data);
                return this.normalizeRateRows([parsedJson]);
            }
            return [];
        }

        const lines = trimmedInput.split(/\r?\n/).filter(Boolean);
        if (lines.length === 0) return [];

        const headers = lines[0]
            .replace(/^\ufeff/, "")
            .split(",")
            .map((header) => header.trim().toLowerCase());

        return lines.slice(1).map((line) => {
            const values = line.split(",");
            const row = {};

            headers.forEach((header, index) => {
                const rawValue = values[index] ? values[index].trim() : "";
                row[header] = rawValue === "" || Number.isNaN(Number(rawValue))
                    ? rawValue
                    : parseFloat(rawValue);
            });

            return row;
        });
    },

    formatDate: function(dateInput) {
        if (!dateInput) return "";

        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const dateObj = new Date(dateInput);

        if (Number.isNaN(dateObj.getTime())) return "";

        return `${months[dateObj.getUTCMonth()]} ${dateObj.getUTCDate().toString().padStart(2, "0")}, ${dateObj.getUTCFullYear()}`;
    },

    formatDateMmDdYyyy: function(dateInput) {
        if (!dateInput) return "";

        const rawValue = String(dateInput).trim();
        if (rawValue === "") return "";

        const shortMatch = rawValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (shortMatch) {
            return `${shortMatch[1].padStart(2, "0")}/${shortMatch[2].padStart(2, "0")}/${shortMatch[3]}`;
        }

        const dateObj = new Date(rawValue);
        if (Number.isNaN(dateObj.getTime())) return rawValue;

        const month = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
        const day = String(dateObj.getUTCDate()).padStart(2, "0");
        const year = String(dateObj.getUTCFullYear());
        return `${month}/${day}/${year}`;
    },

    getAppointmentDateInput: function(actJson, fallbackDate) {
        const calendarResponse = Array.isArray(actJson.calendar) ? actJson.calendar : [];

        for (const dayEntry of calendarResponse) {
            if (
                dayEntry &&
                dayEntry.date &&
                Array.isArray(dayEntry.items) &&
                dayEntry.items.some((item) =>
                    item &&
                    item.title === "BP1"
                )
            ) {
                return dayEntry.date;
            }
        }

        for (const dayEntry of calendarResponse) {
            if (dayEntry && dayEntry.date) return dayEntry.date;
        }

        return fallbackDate;
    },

    toNumber: function(value, fallback = 0) {
        if (value === null || value === undefined || value === "") return fallback;
        const cleaned = String(value).replace(/[\$,\s]/g, "");
        const parsed = parseFloat(cleaned);
        return Number.isFinite(parsed) ? parsed : fallback;
    },

    roundMoney: function(value) {
        return Math.round((this.toNumber(value) + Number.EPSILON) * 100) / 100;
    },

    cloneJson: function(value) {
        return JSON.parse(JSON.stringify(value));
    },

    normalizeActInput: function(actJson) {
        const source = this.cloneJson(actJson || {});

        if (!source.customFields && source.fields) {
            source.customFields = this.cloneJson(source.fields);
        }

        source.customFields = source.customFields || {};

        if (!source.birthday && source.customFields.birthday) {
            source.birthday = source.customFields.birthday;
        }

        if (!source.fullName) {
            source.fullName =
                source.customFields.fullname ||
                this.joinSpaceSeparated([
                    source.customFields.firstname,
                    source.customFields.middlename,
                    source.customFields.lastname
                ]);
        }

        if (!source.editedBy && source.customFields.editedby) {
            source.editedBy = source.customFields.editedby;
        }

        if (!source.homeAddress && source.customFields.homeaddress) {
            source.homeAddress = this.cloneJson(source.customFields.homeaddress);
        }

        if (!source.businessAddress && source.customFields.businessaddress) {
            source.businessAddress = this.cloneJson(source.customFields.businessaddress);
        }

        if (!source.rep && source.customFields.recordmanager) {
            source.rep = {
                name: source.customFields.recordmanager || "",
                email: source.customFields.emailaddress || "",
                phone: source.customFields.businessphone || source.customFields.mobilephone || ""
            };
        }

        return source;
    },

    joinSpaceSeparated: function(parts) {
        return (parts || [])
            .map((value) => String(value === null || value === undefined ? "" : value).trim())
            .filter((value) => value !== "")
            .join(" ");
    },

    formatNameLastFirst: function(lastName, firstName, middleName) {
        const last = String(lastName || "").trim();
        const first = String(firstName || "").trim();
        const middle = String(middleName || "").trim();
        const firstBlock = this.joinSpaceSeparated([first, middle]);

        if (last && firstBlock) return `${last}, ${firstBlock}`;
        return last || firstBlock;
    },

    buildClientNameLastFirst: function(actJson) {
        const customFields = actJson.customFields || {};
        return this.formatNameLastFirst(
            customFields.lastname,
            customFields.firstname,
            customFields.middlename
        );
    },

    buildSpouseNameLastFirst: function(actJson) {
        const customFields = actJson.customFields || {};
        return this.formatNameLastFirst(
            customFields.spouse,
            customFields.spouse_first,
            customFields.spouse_middle
        );
    },

    formatPhoneDigits: function(phoneValue) {
        const digits = String(phoneValue || "").replace(/\D/g, "");

        if (digits.length === 10) {
            return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
        }

        return String(phoneValue || "").trim();
    },

    buildSingleLineAddress: function(address) {
        if (!address || typeof address !== "object") return "";

        return this.joinSpaceSeparated([
            address.line1,
            address.line2,
            address.line3
        ]);
    },

    buildCityStateZip: function(address) {
        if (!address || typeof address !== "object") return "";

        const city = String(address.city || "").trim();
        const state = String(address.state || "").trim();
        const postalCode = String(address.postalCode || address.postalcode || "").trim();
        const cityState = city && state ? `${city}, ${state}` : (city || state);

        if (cityState && postalCode) return `${cityState} ${postalCode}`;
        if (address.line3 && !cityState && !postalCode) return String(address.line3).trim();
        return cityState || postalCode;
    },

    buildPreferredPhone: function(actJson) {
        const customFields = actJson.customFields || {};
        return this.formatPhoneDigits(
            customFields.mobilephone ||
            customFields.homephone ||
            customFields.businessphone ||
            customFields.spousecellnumber
        );
    },

    buildPreferredEmail: function(actJson) {
        const customFields = actJson.customFields || {};
        return String(
            customFields.personalemailaddress ||
            customFields.emailaddress ||
            customFields.altemailaddress ||
            ""
        ).trim();
    },

    buildAgencyName: function(actJson) {
        const customFields = actJson.customFields || {};
        return String(
            customFields.department ||
            customFields.federalagency ||
            customFields.company ||
            ""
        ).trim();
    },

    buildAgencyLocation: function(actJson) {
        const businessAddress = actJson.businessAddress || {};
        const customFields = actJson.customFields || {};
        const businessLocation = this.buildCityStateZip(businessAddress);

        if (businessLocation) return businessLocation;
        if (customFields.businessaddress && typeof customFields.businessaddress === "object") {
            return this.buildCityStateZip(customFields.businessaddress);
        }

        return this.buildCityStateZip(actJson.homeAddress || {});
    },

    buildAgencyNameAndLocation: function(actJson) {
        return [this.buildAgencyName(actJson), this.buildAgencyLocation(actJson)]
            .filter(Boolean)
            .join(", ");
    },

    buildChildName: function(customFields, index) {
        const childName = String(customFields[`c0${index}_name`] || customFields[`c${index}_name`] || "").trim();
        const childFirst = String(customFields[`c0${index}_first`] || customFields[`c${index}_first`] || "").trim();
        const childLast = String(customFields[`c0${index}_last`] || customFields[`c${index}_last`] || "").trim();

        if (childName && childLast) return this.formatNameLastFirst(childLast, childName, "");
        if (childLast && childFirst) return this.formatNameLastFirst(childLast, childFirst, "");
        return childName || childFirst || childLast;
    },

    getBeneficiaryRows: function(actJson) {
        const customFields = actJson.customFields || {};
        const rows = [];
        const spouseName = this.buildSpouseNameLastFirst(actJson);
        const homeAddress = actJson.homeAddress || {};
        const homeAddressSingleLine = this.buildSingleLineAddress(homeAddress);
        const homeCityStateZip = this.buildCityStateZip(homeAddress);
        const share = String(customFields.whatpercentage || "100").trim() || "100";

        if (spouseName) {
            rows.push({
                name: spouseName,
                relationship: "Spouse",
                share,
                address: [homeAddressSingleLine, homeCityStateZip].filter(Boolean).join(", ")
            });
        }

        for (let index = 1; index <= 6; index += 1) {
            const childName = this.buildChildName(customFields, index);
            if (!childName) continue;

            rows.push({
                name: childName,
                relationship: "Child",
                share: "",
                address: ""
            });
        }

        return rows.slice(0, 6);
    },

    parseCsvLine: function(line) {
        const values = [];
        let current = "";
        let inQuotes = false;

        for (let index = 0; index < line.length; index += 1) {
            const char = line[index];
            const nextChar = line[index + 1];

            if (char === "\"") {
                if (inQuotes && nextChar === "\"") {
                    current += "\"";
                    index += 1;
                } else {
                    inQuotes = !inQuotes;
                }
                continue;
            }

            if (char === "," && !inQuotes) {
                values.push(current);
                current = "";
                continue;
            }

            current += char;
        }

        values.push(current);
        return values.map((value) => value.trim());
    },

    loadDocumentFieldMap: function(mapFileName) {
        const mapPath = path.join(__dirname, "..", "Resources", "unsorted", mapFileName);
        const csvText = fs.readFileSync(mapPath, "utf8");
        const lines = csvText.split(/\r?\n/).filter((line) => line.trim() !== "");

        return lines.slice(1).map((line) => {
            const [pdfField, crmField] = this.parseCsvLine(line);
            return {
                pdfField,
                crmField: crmField || ""
            };
        });
    },

    getNestedValue: function(source, keyPath) {
        if (!source || !keyPath) return undefined;

        const segments = String(keyPath)
            .split(".")
            .map((segment) => segment.trim())
            .filter(Boolean);

        let current = source;
        for (const segment of segments) {
            if (current === null || current === undefined) return undefined;
            current = this.getObjectPropertyInsensitive(current, segment);
        }

        return current;
    },

    getObjectPropertyInsensitive: function(source, key) {
        if (!source || typeof source !== "object") return undefined;
        if (Object.prototype.hasOwnProperty.call(source, key)) return source[key];

        const targetKey = String(key || "").toLowerCase();
        const sourceKeys = Object.keys(source);

        for (const sourceKey of sourceKeys) {
            if (String(sourceKey).toLowerCase() === targetKey) {
                return source[sourceKey];
            }
        }

        return undefined;
    },

    splitMappingExpression: function(mappingKey) {
        return String(mappingKey || "")
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean);
    },

    getPathTail: function(pathValue) {
        const normalizedPath = String(pathValue || "").trim();
        if (normalizedPath === "") return "";

        const segments = normalizedPath.split(".");
        return String(segments[segments.length - 1] || "").trim().toLowerCase();
    },

    getDirectMappedValue: function(actJson, mappingKey) {
        const directValue = this.getNestedValue(actJson, mappingKey);
        if (directValue !== undefined && directValue !== null) {
            return typeof directValue === "object" ? "" : String(directValue);
        }

        const customFieldValue = this.getNestedValue(actJson.customFields || {}, mappingKey);
        if (customFieldValue !== undefined && customFieldValue !== null) {
            return typeof customFieldValue === "object" ? "" : String(customFieldValue);
        }

        return "";
    },

    isNameExpression: function(parts) {
        const supportedNameTails = new Set([
            "firstname",
            "lastname",
            "middlename",
            "first",
            "last",
            "spouse",
            "spouse_first",
            "spouse_middle"
        ]);

        return parts.length > 1 && parts.every((part) => supportedNameTails.has(this.getPathTail(part)));
    },

    resolveNameExpression: function(actJson, parts) {
        const resolvedByTail = {};

        parts.forEach((part) => {
            resolvedByTail[this.getPathTail(part)] = this.getDirectMappedValue(actJson, part);
        });

        if (resolvedByTail.spouse || resolvedByTail.spouse_first || resolvedByTail.spouse_middle) {
            return this.formatNameLastFirst(
                resolvedByTail.spouse,
                resolvedByTail.spouse_first,
                resolvedByTail.spouse_middle
            );
        }

        return this.formatNameLastFirst(
            resolvedByTail.lastname || resolvedByTail.last,
            resolvedByTail.firstname || resolvedByTail.first,
            resolvedByTail.middlename
        );
    },

    isPhoneExpression: function(pdfField, parts) {
        const phoneTails = new Set([
            "mobilephone",
            "homephone",
            "businessphone",
            "spousecellnumber",
            "spousephonenumber_phone",
            "phone",
            "telephone",
            "telephonenumber"
        ]);
        const fieldName = String(pdfField || "").toLowerCase();

        return fieldName.includes("phone") || parts.some((part) => phoneTails.has(this.getPathTail(part)));
    },

    resolvePhoneExpression: function(actJson, parts) {
        const preferredPhoneOrder = [
            "mobilephone",
            "homephone",
            "businessphone",
            "spousephonenumber_phone",
            "spousecellnumber"
        ];
        const availableValues = {};

        parts.forEach((part) => {
            availableValues[this.getPathTail(part)] = this.getDirectMappedValue(actJson, part);
        });

        for (const preferredKey of preferredPhoneOrder) {
            if (availableValues[preferredKey]) {
                return this.formatPhoneDigits(availableValues[preferredKey]);
            }
        }

        const firstValue = Object.values(availableValues).find((value) => String(value || "").trim() !== "");
        return this.formatPhoneDigits(firstValue || "");
    },

    isDateExpression: function(pdfField, parts) {
        const dateTails = new Set(["birthday", "spousedob", "dob", "birthdate"]);
        const fieldName = String(pdfField || "").toLowerCase();

        return fieldName.includes("dob") || fieldName.includes("birthdate") || parts.some((part) => dateTails.has(this.getPathTail(part)));
    },

    resolveDateExpression: function(actJson, parts) {
        for (const part of parts) {
            const resolvedValue = this.getDirectMappedValue(actJson, part);
            if (String(resolvedValue || "").trim() !== "") {
                return this.formatDateMmDdYyyy(resolvedValue);
            }
        }

        return "";
    },

    isAddressExpression: function(parts) {
        const addressTails = new Set(["line1", "line2", "line3", "city", "state", "postalcode", "postalCode".toLowerCase()]);
        return parts.length > 1 && parts.every((part) => addressTails.has(this.getPathTail(part)));
    },

    resolveAddressExpression: function(actJson, parts, formKey) {
        const valuesByTail = {};

        parts.forEach((part) => {
            valuesByTail[this.getPathTail(part)] = this.getDirectMappedValue(actJson, part);
        });

        const line1 = String(valuesByTail.line1 || "").trim();
        const line2 = String(valuesByTail.line2 || "").trim();
        const line3 = String(valuesByTail.line3 || "").trim();
        const city = String(valuesByTail.city || "").trim();
        const state = String(valuesByTail.state || "").trim();
        const postalCode = String(valuesByTail.postalcode || "").trim();
        const cityState = city && state ? `${city}, ${state}` : (city || state);
        const cityStateZip = cityState && postalCode ? `${cityState}, ${postalCode}` : (cityState || postalCode);

        if (formKey === "sf3102" || formKey === "sf3102_2022_10_508_1") {
            return [line1, cityStateZip].filter(Boolean).join("\n");
        }

        return [line1, line2, line3, cityStateZip].filter(Boolean).join(", ");
    },

    resolvePrefillToken: function(actJson, token, pdfField, formKey) {
        const customFields = actJson.customFields || {};
        const homeAddress = actJson.homeAddress || {};
        const beneficiaryRows = this.getBeneficiaryRows(actJson);
        const normalizedToken = String(token || "").trim().toLowerCase();
        const hasFegli = String(customFields.feglicodeactive || "").trim().toUpperCase() !== "B0";
        const hasFehb = this.getMonthlyValueFromCustomFields(
            customFields,
            ["cust_fehbpermonth_023844547"],
            ["fehbperpayperiod", "healthinsuranceperpayperiod"]
        ) > 0;
        const hasMilitaryService = this.toNumber(customFields.yrsofmilitaryservice) > 0 || String(customFields.branch || "").trim() !== "";
        const hasMilitaryRetiredPay = this.toNumber(customFields.militarypension) > 0;
        const isMarried = String(customFields.maritalstatus || "").toLowerCase() === "married";
        const survivorElection = this.determineSurvivorElection(customFields, isMarried);
        const reduction = String(customFields.feglireduction || "75");
        const hasOptionA = this.parseBoolean(customFields.optiona_retire !== undefined ? customFields.optiona_retire : customFields.optiona);
        const optionB = Math.max(0, parseInt(customFields.optionb_retire !== undefined ? customFields.optionb_retire : customFields.optionb, 10) || 0);
        const optionC = Math.max(0, parseInt(customFields.optionc_retire !== undefined ? customFields.optionc_retire : customFields.optionc, 10) || 0);
        const hasLtc = this.getMonthlyValueFromCustomFields(
            customFields,
            ["cust_ltcpermonth_062304353"],
            ["ltcperpayperiod"]
        ) > 0;
        const hasPreviousClaim = String(customFields.claimnumber || customFields.claimnumbers || "").trim() !== "";

        if (/^@beneficiary_[1-6]_(name|relationship|share|address)$/.test(normalizedToken)) {
            const tokenMatch = normalizedToken.match(/^@beneficiary_([1-6])_(name|relationship|share|address)$/);
            const row = beneficiaryRows[parseInt(tokenMatch[1], 10) - 1] || {};
            return String(row[tokenMatch[2]] || "");
        }

        if (/^@child_[1-8]_(name|dob|phone|email)$/.test(normalizedToken)) {
            const tokenMatch = normalizedToken.match(/^@child_([1-8])_(name|dob|phone|email)$/);
            const index = parseInt(tokenMatch[1], 10);
            const property = tokenMatch[2];

            if (property === "name") return this.buildChildName(customFields, index);
            if (property === "dob") return String(customFields[`c0${index}_dob`] || customFields[`c${index}_dob`] || "");
            if (property === "phone") return this.formatPhoneDigits(customFields[`c0${index}_phone_phone`] || customFields[`c${index}_phone_phone`]);
            if (property === "email") return String(customFields[`c0${index}_email_email`] || customFields[`c${index}_email_email`] || "");
        }

        switch (normalizedToken) {
        case "@full_name_last_first":
            return this.buildClientNameLastFirst(actJson);
        case "@spouse_name_last_first":
            return this.buildSpouseNameLastFirst(actJson);
        case "@birthday":
            return this.formatDateMmDdYyyy(actJson.birthday || "");
        case "@spouse_dob":
            return this.formatDateMmDdYyyy(customFields.spousedob || "");
        case "@home_address_line1":
            return String(homeAddress.line1 || "");
        case "@home_address_line2":
            return String(homeAddress.line2 || "");
        case "@home_address_line3":
            return String(homeAddress.line3 || "");
        case "@home_address_single_line":
            return this.buildSingleLineAddress(homeAddress);
        case "@home_city_state_zip":
            return this.buildCityStateZip(homeAddress);
        case "@preferred_phone":
            return this.buildPreferredPhone(actJson);
        case "@preferred_email":
            return this.buildPreferredEmail(actJson);
        case "@spouse_phone":
            return this.formatPhoneDigits(customFields.spousephonenumber_phone || customFields.spousecellnumber);
        case "@spouse_email":
            return String(customFields.spouseemail_email || "");
        case "@agency_name_and_location":
            return this.buildAgencyNameAndLocation(actJson);
        case "@agency_name":
            return this.buildAgencyName(actJson);
        case "@agency_location":
            return this.buildAgencyLocation(actJson);
        case "@return_address":
            if (formKey === "sf3102" || formKey === "sf3102_2022_10_508_1") {
                return [
                    String(homeAddress.line1 || "").trim(),
                    this.buildCityStateZip(homeAddress)
                ].filter(Boolean).join("\n");
            }
            return [this.buildSingleLineAddress(homeAddress), this.buildCityStateZip(homeAddress)].filter(Boolean).join(", ");
        case "@job_title":
            return String(customFields.jobtitle || "");
        case "@child_relationship":
            return "Child";
        case "@spouse_relationship":
            return "Spouse";
        case "@married_yes":
            return isMarried ? "Yes" : "Off";
        case "@married_no":
            return isMarried ? "Off" : "Yes";
        case "@military_service_yes":
            return hasMilitaryService ? "Yes" : "Off";
        case "@military_service_no":
            return hasMilitaryService ? "Off" : "Yes";
        case "@military_retired_pay_yes":
            return hasMilitaryRetiredPay ? "Yes" : "Off";
        case "@military_retired_pay_no":
            return hasMilitaryRetiredPay ? "Off" : "Yes";
        case "@fehb_yes":
            return hasFehb ? "Yes" : "Off";
        case "@fehb_no":
            return hasFehb ? "Off" : "Yes";
        case "@fegli_yes":
            return hasFegli ? "Yes" : "Off";
        case "@fegli_no":
            return hasFegli ? "Off" : "Yes";
        case "@ltc_no":
            return hasLtc ? "Off" : "Yes";
        case "@claim_filed_yes":
            return hasPreviousClaim ? "Yes" : "Off";
        case "@claim_filed_no":
            return hasPreviousClaim ? "Off" : "Yes";
        case "@survivor_none":
            return survivorElection.percent === 0 ? "Yes" : "Off";
        case "@survivor_partial":
            return survivorElection.percent === 25 ? "Yes" : "Off";
        case "@survivor_max":
            return survivorElection.percent === 50 ? "Yes" : "Off";
        case "@fers_deductions_yes":
            return this.parseBoolean(customFields.retiredyn) ? "Off" : "Yes";
        case "@fers_deductions_no":
            return this.parseBoolean(customFields.retiredyn) ? "Yes" : "Off";
        case "@fegli_basic_yes":
            return hasFegli ? "Yes" : "Off";
        case "@fegli_basic_no":
            return hasFegli ? "Off" : "Yes";
        case "@fegli_reduction_75":
            return reduction === "75" ? "Yes" : "Off";
        case "@fegli_reduction_50":
            return reduction === "50" ? "Yes" : "Off";
        case "@fegli_reduction_0":
            return reduction === "0" ? "Yes" : "Off";
        case "@option_a_yes":
            return hasOptionA ? "Yes" : "Off";
        case "@option_a_no":
            return hasOptionA ? "Off" : "Yes";
        case "@option_a_not_carried":
            return hasOptionA ? "Off" : "Yes";
        case "@option_b_yes":
            return optionB > 0 ? "Yes" : "Off";
        case "@option_b_no":
            return optionB > 0 ? "Off" : "Yes";
        case "@option_b_not_carried":
            return optionB > 0 ? "Off" : "Yes";
        case "@option_b_no_reduction_multiples":
            return String(optionB);
        case "@option_b_full_reduction_multiples":
            return "0";
        case "@option_c_yes":
            return optionC > 0 ? "Yes" : "Off";
        case "@option_c_no":
            return optionC > 0 ? "Off" : "Yes";
        case "@option_c_not_carried":
            return optionC > 0 ? "Off" : "Yes";
        case "@option_c_no_reduction_multiples":
            return String(optionC);
        case "@option_c_full_reduction_multiples":
            return "0";
        case "@retirement_system_fers":
            return "Yes";
        case "@employee_type_retired":
            return this.parseBoolean(customFields.retiredyn) ? "Yes" : "Off";
        default:
            return "";
        }
    },

    resolveMappedValue: function(actJson, mappingKey, pdfField, formKey) {
        if (!mappingKey) return "";

        if (String(mappingKey).trim().startsWith("@")) {
            return this.resolvePrefillToken(actJson, mappingKey, pdfField, formKey);
        }

        const expressionParts = this.splitMappingExpression(mappingKey);

        if (this.isNameExpression(expressionParts)) {
            return this.resolveNameExpression(actJson, expressionParts);
        }

        if (this.isPhoneExpression(pdfField, expressionParts)) {
            return this.resolvePhoneExpression(actJson, expressionParts);
        }

        if (this.isDateExpression(pdfField, expressionParts)) {
            return this.resolveDateExpression(actJson, expressionParts);
        }

        if (this.isAddressExpression(expressionParts)) {
            return this.resolveAddressExpression(actJson, expressionParts, formKey);
        }

        if (expressionParts.length > 1) {
            for (const part of expressionParts) {
                const resolvedValue = this.getDirectMappedValue(actJson, part);
                if (String(resolvedValue || "").trim() !== "") return resolvedValue;
            }
            return "";
        }

        return this.getDirectMappedValue(actJson, mappingKey);
    },

    buildMappedDocumentFields: function(actJson, mapFileName, formKey) {
        const normalizedActJson = this.normalizeActInput(actJson);
        const mapRows = this.loadDocumentFieldMap(mapFileName);
        const mappedFields = {};
        const mappedFieldRows = [];
        const unmappedFields = [];

        mapRows.forEach((row) => {
            if (!row.pdfField) return;

            if (!row.crmField) {
                unmappedFields.push(row.pdfField);
                return;
            }

            const resolvedValue = this.resolveMappedValue(normalizedActJson, row.crmField, row.pdfField, formKey);
            mappedFieldRows.push({
                pdfField: row.pdfField,
                crmField: row.crmField,
                value: resolvedValue
            });

            if (resolvedValue !== "") {
                mappedFields[row.pdfField] = resolvedValue;
            }
        });

        return {
            formKey,
            mapFile: mapFileName,
            totalFields: mapRows.length,
            mappedFieldCount: mappedFieldRows.length,
            populatedFieldCount: Object.keys(mappedFields).length,
            mappedFields,
            mappingRows: mappedFieldRows,
            unmappedFields
        };
    },

    executeUnsortedForm: function(formKey, actJson) {
        const formMapFiles = {
            fw4p: "fw4p_pdf-map.csv",
            sf2809: "sf2809_pdf-map.csv",
            sf2818: "sf2818_pdf-map.csv",
            sf2823: "sf2823_pdf-map.csv",
            sf3102: "sf3102_pdf-map.csv",
            sf3102_2022_10_508_1: "sf3102_2022_10_508_1_pdf-map.csv",
            sf3107: "sf3107_pdf-map.csv",
            sf3108: "sf3108_pdf-map.csv"
        };
        const mapFileName = formMapFiles[formKey];

        if (!mapFileName) {
            throw new Error(`Unknown unsorted form key: ${formKey}`);
        }

        return this.buildMappedDocumentFields(actJson, mapFileName, formKey);
    },

    buildFw4pPrefill: function(actJson) {
        return this.executeUnsortedForm("fw4p", actJson);
    },

    buildSf2809Prefill: function(actJson) {
        return this.executeUnsortedForm("sf2809", actJson);
    },

    buildSf2818Prefill: function(actJson) {
        return this.executeUnsortedForm("sf2818", actJson);
    },

    buildSf2823Prefill: function(actJson) {
        return this.executeUnsortedForm("sf2823", actJson);
    },

    buildSf3102Prefill: function(actJson) {
        return this.executeUnsortedForm("sf3102", actJson);
    },

    buildSf3102_2022_10_508_1Prefill: function(actJson) {
        return this.executeUnsortedForm("sf3102_2022_10_508_1", actJson);
    },

    buildSf3107Prefill: function(actJson) {
        return this.executeUnsortedForm("sf3107", actJson);
    },

    buildSf3108Prefill: function(actJson) {
        return this.executeUnsortedForm("sf3108", actJson);
    },

    formatCrmDecimal: function(value, decimals = 2) {
        return this.roundMoney(value).toFixed(decimals);
    },

    formatCrmWholeNumber: function(value) {
        return Math.round(this.toNumber(value)).toString();
    },

    formatCurrency: function(value) {
        return this.roundMoney(value).toLocaleString("en-US", {
            style: "currency",
            currency: "USD"
        });
    },

    formatWholeCurrency: function(value) {
        return this.toNumber(value).toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
    },

    formatAccountingCurrency: function(value) {
        const amount = this.roundMoney(Math.abs(value)).toLocaleString("en-US", {
            style: "currency",
            currency: "USD"
        });
        return `(${amount})`;
    },

    formatCount: function(value, decimals = 0) {
        return this.toNumber(value).toLocaleString("en-US", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    },

    formatPercent: function(value, decimals = 1) {
        return `${this.toNumber(value).toLocaleString("en-US", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        })}%`;
    },

    formatTaxPercent: function(rateDecimal) {
        return this.formatCount(this.toNumber(rateDecimal) * 100, 1);
    },

    formatServiceDisplay: function(years, months) {
        const safeYears = Math.max(0, parseInt(years, 10) || 0);
        const safeMonths = Math.max(0, parseInt(months, 10) || 0);

        if (safeYears === 0 && safeMonths === 0) return "N/A";
        return `${safeYears}yr ${safeMonths}mo`;
    },

    formatTemplate2ServiceDisplay: function(years, months) {
        const safeYears = Math.max(0, parseInt(years, 10) || 0);
        const safeMonths = Math.max(0, parseInt(months, 10) || 0);
        return `${safeYears}yrs ${safeMonths}mos`;
    },

    formatTemplate2HoursDisplay: function(hours) {
        return `${Math.round(this.toNumber(hours)).toString()} hrs`;
    },

    formatTemplate2DurationFromYears: function(decimalYears) {
        const totalMonths = this.convertYearsToWholeMonths(decimalYears);
        const years = Math.floor(totalMonths / 12);
        const months = totalMonths % 12;
        return this.formatTemplate2ServiceDisplay(years, months);
    },

    convertYearsToWholeMonths: function(decimalYears) {
        const yearsValue = Math.max(0, this.toNumber(decimalYears));
        return Math.floor((yearsValue * 12) + 0.000001);
    },

    getMonthlyValueFromCustomFields: function(customFields, monthlyKeys, perPayPeriodKeys = []) {
        for (const key of monthlyKeys) {
            if (this.hasExplicitValue(customFields, key)) {
                return this.roundMoney(this.toNumber(customFields[key]));
            }
        }

        for (const key of perPayPeriodKeys) {
            if (this.hasExplicitValue(customFields, key)) {
                return this.roundMoney((this.toNumber(customFields[key]) * 26) / 12);
            }
        }

        return 0;
    },

    formatTemplate2Rate: function(rateDecimal, includePercentSign = false) {
        const percentage = this.toNumber(rateDecimal) * 100;
        const roundedToTenth = Math.round(percentage * 10) / 10;
        const roundedToHundredth = Math.round(percentage * 100) / 100;
        const useTwoDecimals = Math.abs(roundedToTenth - roundedToHundredth) > 0.0001;
        const fractionDigits = useTwoDecimals ? 2 : 1;
        const formatted = this.toNumber(percentage).toLocaleString("en-US", {
            minimumFractionDigits: fractionDigits,
            maximumFractionDigits: fractionDigits
        });

        return includePercentSign ? `${formatted}%` : formatted;
    },

    formatTemplate2PlainNumber: function(value) {
        return this.formatCount(value, 0);
    },

    joinMultilineText: function(lines) {
        return lines
            .map((line) => String(line === null || line === undefined ? "" : line).trim())
            .filter((line) => line !== "")
            .join("\n");
    },

    buildAdvisorField: function(rep) {
        const safeRep = rep && typeof rep === "object" ? rep : {};
        const contactLine = [safeRep.email, safeRep.phone]
            .map((value) => String(value === null || value === undefined ? "" : value).trim())
            .filter((value) => value !== "")
            .join(" | ");

        return this.joinMultilineText([safeRep.name, contactLine]);
    },

    buildNotesField: function(customFields) {
        const noteKeys = [
            "change2fegli",
            "beneficiaries",
            "otherincomesources",
            "otherpensions",
            "tsptraditionalbalancenote",
            "tsprothbalancenote",
            "tsptotalbalancenote",
            "liquidnote",
            "debtbox",
            "other40ksiranote",
            "inheritedaccountsnote",
            "brokerageaccountsnqnote",
            "stocksbondsnote",
            "otherassetsnote"
        ];
        const noteLines = [];

        for (const key of noteKeys) {
            if (!this.hasExplicitValue(customFields, key)) continue;
            noteLines.push(customFields[key]);
        }

        return this.joinMultilineText(noteLines);
    },

    isComplexStateTaxText: function(text) {
        const normalized = String(text || "").trim().toLowerCase();
        if (normalized === "") return false;

        return normalized.includes("partial") ||
            normalized.includes("age-based") ||
            normalized.includes("income-dependent") ||
            normalized.includes("phasing") ||
            normalized.includes("phaseout") ||
            normalized.includes("exemption") ||
            normalized.includes("exemptions") ||
            normalized.includes("credit");
    },

    buildCrmStateTaxGuidance: function(state, taxYear, stateTaxProfile, stateRule) {
        const safeState = String(state || "").trim();
        const flatRate = this.toNumber(stateTaxProfile ? stateTaxProfile.flatRate : 0);
        const pensionRule = String(stateRule ? stateRule.tax_on_pensions || "" : "").trim().toLowerCase();
        const socialSecurityRule = String(stateRule ? stateRule.tax_on_social_security || "" : "").trim().toLowerCase();
        const iraRule = String(stateRule ? stateRule.tax_on_ira_distributions || "" : "").trim().toLowerCase();

        const hasComplexRule = this.isComplexStateTaxText(stateRule ? stateRule.tax_on_pensions_text : "") ||
            this.isComplexStateTaxText(stateRule ? stateRule.tax_on_social_security_text : "") ||
            this.isComplexStateTaxText(stateRule ? stateRule.tax_on_ira_distributions_text : "");
        const hasRateThreshold = safeState === "Mississippi" || safeState === "Ohio";
        const isExactConfidence = !!safeState &&
            stateTaxProfile &&
            stateTaxProfile.method === "flat" &&
            !hasComplexRule &&
            !hasRateThreshold;

        const exactOrZero = (ruleValue) => (
            isExactConfidence && ruleValue === "yes"
                ? flatRate
                : 0
        );

        return {
            state: safeState,
            taxYear,
            sourceType: isExactConfidence
                ? (flatRate === 0 ? "no_tax_exact" : "flat_tax_exact")
                : "advisory_only",
            disclaimerRequired: !isExactConfidence,
            disclaimerMessage: !isExactConfidence
                ? "State taxes may apply; consult a tax professional for state-specific treatment."
                : "",
            pensionTaxability: pensionRule || "unknown",
            socialSecurityTaxability: socialSecurityRule || "unknown",
            iraTaxability: iraRule || "unknown",
            pensionRate: exactOrZero(pensionRule),
            socialSecurityRate: exactOrZero(socialSecurityRule),
            iraRate: exactOrZero(iraRule),
            stateFlatRate: isExactConfidence ? flatRate : 0
        };
    },

    buildCrmUpdatePayload: function({
        output,
        clientState,
        taxYear,
        stateTaxProfile,
        stateRetirementTaxRule,
        activeCode,
        retireCode,
        grossFERS,
        netFERS,
        socialSecurityGross,
        netSocialSecurity,
        age62SocialSecurityEstimate,
        grossBridge,
        netBridge,
        tspTraditional,
        tspRoth,
        tspTotal,
        tspBalanceUsed,
        taxableTspMonthly,
        tspGrossMonthly,
        netTsp,
        projectedNetMonthly,
        currentMonthlyNet,
        pensionYearlyGross,
        monthlyFegli,
        healthInsuranceMonthly,
        dentalInsuranceMonthly,
        visionInsuranceMonthly,
        ltcInsuranceMonthly,
        distributionRate,
        federalMarginalRate,
        stateTaxRate,
        stateTaxCalculation,
        bridgeActive,
        hasIncomeGap,
        survivorReductionMonthly,
        militaryPensionNet,
        vaDisabilityNet,
        spouseSocialSecurityNet,
        spousePensionNet,
        annualLeavePayout
    }) {
        const stateTaxGuidance = this.buildCrmStateTaxGuidance(
            clientState,
            taxYear,
            stateTaxProfile,
            stateRetirementTaxRule
        );

        const roundedGrossFERS = Math.round(grossFERS);
        const roundedNetFERS = Math.round(netFERS);
        const roundedSocialSecurityGross = Math.round(socialSecurityGross);
        const roundedNetSocialSecurity = Math.round(netSocialSecurity);
        const roundedAge62SocialSecurityEstimate = Math.round(age62SocialSecurityEstimate);
        const roundedGrossBridge = Math.round(grossBridge);
        const roundedNetBridge = Math.round(netBridge);
        const roundedTspTraditional = Math.round(tspTraditional);
        const roundedTspRoth = Math.round(tspRoth);
        const roundedTspTotal = Math.round(tspTotal);
        const roundedTspBalanceUsed = Math.round(tspBalanceUsed);
        const roundedTaxableTspMonthly = Math.round(taxableTspMonthly);
        const roundedTspGrossMonthly = Math.round(tspGrossMonthly);
        const roundedNetTsp = Math.round(netTsp);
        const roundedProjectedNetMonthly = Math.round(projectedNetMonthly);
        const roundedCurrentMonthlyNet = Math.round(currentMonthlyNet);
        const roundedPensionYearlyGross = Math.round(pensionYearlyGross);
        const roundedMonthlyFegli = Math.round(monthlyFegli);
        const roundedHealthInsuranceMonthly = Math.round(healthInsuranceMonthly);
        const roundedDentalInsuranceMonthly = Math.round(dentalInsuranceMonthly);
        const roundedVisionInsuranceMonthly = Math.round(visionInsuranceMonthly);
        const roundedLtcInsuranceMonthly = Math.round(ltcInsuranceMonthly);
        const roundedDistributionRate = Math.round(distributionRate);
        const roundedFederalMarginalRate = Math.round(federalMarginalRate * 100);
        const roundedStateTaxRate = Math.round(stateTaxRate * 100);
        const roundedStateTaxRateFers = Math.round((stateTaxCalculation.effectiveRates || {}).fers * 100);
        const roundedStateTaxRateSocialSecurity = Math.round((stateTaxCalculation.effectiveRates || {}).socialSecurity * 100);
        const roundedStateTaxRateBridge = Math.round((stateTaxCalculation.effectiveRates || {}).bridge * 100);
        const roundedStateTaxRateTsp = Math.round((stateTaxCalculation.effectiveRates || {}).tsp * 100);
        const roundedStatePensionRate = Math.round(stateTaxGuidance.pensionRate * 100);
        const roundedStateSocialSecurityRate = Math.round(stateTaxGuidance.socialSecurityRate * 100);
        const roundedStateIraRate = Math.round(stateTaxGuidance.iraRate * 100);
        const roundedStateFlatRate = Math.round(stateTaxGuidance.stateFlatRate * 100);
        const roundedMilitaryPensionNet = Math.round(militaryPensionNet);
        const roundedVaDisabilityNet = Math.round(vaDisabilityNet);
        const roundedSpouseSocialSecurityNet = Math.round(spouseSocialSecurityNet);
        const roundedSpousePensionNet = Math.round(spousePensionNet);
        const roundedSurvivorBenefitCost = Math.round(survivorReductionMonthly);
        const roundedAnnualLeavePayout = Math.round(annualLeavePayout);

        const fersSupplement = bridgeActive ? this.formatCrmWholeNumber(roundedNetBridge) : "";
        const federalPension = this.formatCrmWholeNumber(roundedNetFERS);
        const socialSecurityNetIncome = this.formatCrmWholeNumber(roundedNetSocialSecurity);
        const fegliMonthlyCost = this.formatCrmWholeNumber(roundedMonthlyFegli);
        const survivorBenefitCost = this.formatCrmWholeNumber(roundedSurvivorBenefitCost);
        const addTotal = this.formatCrmWholeNumber(
            roundedNetFERS +
            roundedNetSocialSecurity +
            (bridgeActive ? roundedNetBridge : 0) +
            roundedMilitaryPensionNet +
            roundedVaDisabilityNet +
            roundedSpouseSocialSecurityNet +
            roundedSpousePensionNet
        );
        const minusTotal = this.formatCrmWholeNumber(
            roundedHealthInsuranceMonthly +
            roundedDentalInsuranceMonthly +
            roundedVisionInsuranceMonthly +
            roundedLtcInsuranceMonthly +
            roundedMonthlyFegli +
            roundedSurvivorBenefitCost
        );

        return {
            customFields: {
                calculatedfeglicodeactive: activeCode,
                calculatedfeglicoderetire: retireCode,
                calculatedgrossfersmonthly: this.formatCrmWholeNumber(roundedGrossFERS),
                calculatednetfersmonthly: this.formatCrmWholeNumber(roundedNetFERS),
                calculatedgrosssocialsecuritymonthly: this.formatCrmWholeNumber(roundedSocialSecurityGross),
                calculatednetsocialsecuritymonthly: this.formatCrmWholeNumber(roundedNetSocialSecurity),
                calculatedage62socialsecurity: bridgeActive ? this.formatCrmWholeNumber(roundedAge62SocialSecurityEstimate) : "",
                calculatedgrossbridgemonthly: bridgeActive ? this.formatCrmWholeNumber(roundedGrossBridge) : "",
                calculatednetbridgemonthly: bridgeActive ? this.formatCrmWholeNumber(roundedNetBridge) : "",
                calculatedtsptraditionalbalance: this.formatCrmWholeNumber(roundedTspTraditional),
                calculatedtsprothbalance: this.formatCrmWholeNumber(roundedTspRoth),
                calculatedtsptotalbalance: this.formatCrmWholeNumber(roundedTspTotal),
                calculatedtspbalanceused: this.formatCrmWholeNumber(roundedTspBalanceUsed),
                calculatedtaxabletspmonthly: this.formatCrmWholeNumber(roundedTaxableTspMonthly),
                calculatedtspgrossmonthly: this.formatCrmWholeNumber(roundedTspGrossMonthly),
                calculatednettspmonthly: this.formatCrmWholeNumber(roundedNetTsp),
                calculatedprojectedsocialsecuritymonthly: bridgeActive
                    ? this.formatCrmWholeNumber(roundedNetBridge)
                    : this.formatCrmWholeNumber(roundedNetSocialSecurity),
                calculatednetretirementincomemonthly: this.formatCrmWholeNumber(roundedProjectedNetMonthly),
                calculatedprojectednetmonthly: this.formatCrmWholeNumber(roundedProjectedNetMonthly),
                calculatedcurrentmonthlynet: this.formatCrmWholeNumber(roundedCurrentMonthlyNet),
                calculatedpensionyearlygross: this.formatCrmWholeNumber(roundedPensionYearlyGross),
                calculatedlessfegli: this.formatCrmWholeNumber(roundedMonthlyFegli),
                calculatedlesshealthinsurancemonthly: this.formatCrmWholeNumber(roundedHealthInsuranceMonthly),
                calculatedlessdentalinsurancemonthly: this.formatCrmWholeNumber(roundedDentalInsuranceMonthly),
                calculatedlessvisioninsurancemonthly: this.formatCrmWholeNumber(roundedVisionInsuranceMonthly),
                calculatedlessltcmonthly: this.formatCrmWholeNumber(roundedLtcInsuranceMonthly),
                calculatedannualleavepayout: this.formatCrmWholeNumber(roundedAnnualLeavePayout),
                calculateddistributionrate: this.formatCrmWholeNumber(roundedDistributionRate),
                calculatedfederalmarginalrate: this.formatCrmWholeNumber(roundedFederalMarginalRate),
                calculatedstateeffectiverate: this.formatCrmWholeNumber(roundedStateTaxRate),
                calculatedstateeffectiveratefers: this.formatCrmWholeNumber(roundedStateTaxRateFers),
                calculatedstateeffectiveratesocialsecurity: this.formatCrmWholeNumber(roundedStateTaxRateSocialSecurity),
                calculatedstateeffectiveratebridge: this.formatCrmWholeNumber(roundedStateTaxRateBridge),
                calculatedstateeffectiveratetsp: this.formatCrmWholeNumber(roundedStateTaxRateTsp),
                calculatedgapstatus: hasIncomeGap ? "Yes" : "No",
                calculatedstatepensiontaxability: stateTaxGuidance.pensionTaxability,
                calculatedstatesocialsecuritytaxability: stateTaxGuidance.socialSecurityTaxability,
                calculatedstateirataxability: stateTaxGuidance.iraTaxability,
                calculatedstatepensionrate: this.formatCrmWholeNumber(roundedStatePensionRate),
                calculatedstatesocialsecurityrate: this.formatCrmWholeNumber(roundedStateSocialSecurityRate),
                calculatedstateirarate: this.formatCrmWholeNumber(roundedStateIraRate),
                calculatedstateflatrate: this.formatCrmWholeNumber(roundedStateFlatRate),
                calculatedstatetaxsourcetype: stateTaxGuidance.sourceType,
                calculatedstatetaxdisclaimerrequired: stateTaxGuidance.disclaimerRequired ? "Yes" : "No",
                calculatedstatetaxdisclaimer: stateTaxGuidance.disclaimerMessage,
                federalpension: federalPension,
                socialsecuritynetincome: socialSecurityNetIncome,
                socialsecurityincome: socialSecurityNetIncome,
                ferssupplement: fersSupplement,
                militarypensionnet: this.formatCrmWholeNumber(roundedMilitaryPensionNet),
                militarypension: this.formatCrmWholeNumber(roundedMilitaryPensionNet),
                vadisabilitynet: this.formatCrmWholeNumber(roundedVaDisabilityNet),
                spousesocialsecuritynet: this.formatCrmWholeNumber(roundedSpouseSocialSecurityNet),
                spousessnet: this.formatCrmWholeNumber(roundedSpouseSocialSecurityNet),
                spouse_pension_net: this.formatCrmWholeNumber(roundedSpousePensionNet),
                spousepensionnet: this.formatCrmWholeNumber(roundedSpousePensionNet),
                survisorbenetit: survivorBenefitCost,
                survivorbenefit: survivorBenefitCost,
                fegli: fegliMonthlyCost,
                feglinetcost: fegliMonthlyCost,
                cust_add_total_051152328: addTotal,
                cust_minus_total_052407686: minusTotal,
                add_total: addTotal,
                minus_total: minusTotal,
                annualleavepayout: this.formatCrmWholeNumber(roundedAnnualLeavePayout)
            },
            stateTaxGuidance,
            displayFields: {
                "Gross FERS": output["Gross FERS"],
                "Net FERS": output["Net FERS"],
                "Gross Social Security": output["Gross Social Security"],
                "Net Social Security": output["Net Social Security"],
                "Projected Social Security": output["Projected Social Security"],
                "Summary Net SS": output["Summary Net SS"],
                "Age 62 Social Security": output["Age 62 Social Security"],
                "Gross Bridge": output["Gross Bridge"],
                "Net Bridge": output["Net Bridge"],
                "TSP Gross Monthly": output["TSP Gross Monthly"],
                "Net TSP": output["Net TSP"],
                "Projected Net Monthly": output["Projected Net Monthly"],
                "Current Monthly Net": output["Current Monthly Net"],
                "less Health Insurance": output["less Health Insurance"],
                "less Dental Insurance": output["less Dental Insurance"],
                "less Vision Insurance": output["less Vision Insurance"],
                "FEGLI Basic Now": output["FEGLI Basic Now"],
                "FEGLI Basic Retire": output["FEGLI Basic Retire"],
                "less FEGLI": output["less FEGLI"],
                "Gap Yes": output["Gap Yes"],
                "Gap No": output["Gap No"]
            }
        };
    },

    getFinalCalculationFieldList: function(options = {}) {
        const includeCompatibilityFields = options.includeCompatibilityFields === true;
        const baseFields = FINAL_CALCULATION_CRM_FIELDS.slice();

        if (!includeCompatibilityFields) {
            return baseFields;
        }

        return baseFields.concat([
            "calculatedfeglicodeactive",
            "calculatedfeglicoderetire",
            "calculatedgrossfersmonthly",
            "calculatednetfersmonthly",
            "calculatedgrosssocialsecuritymonthly",
            "calculatednetsocialsecuritymonthly",
            "calculatedage62socialsecurity",
            "calculatedgrossbridgemonthly",
            "calculatednetbridgemonthly",
            "calculatedtsptraditionalbalance",
            "calculatedtsprothbalance",
            "calculatedtsptotalbalance",
            "calculatedtspbalanceused",
            "calculatedtaxabletspmonthly",
            "calculatedtspgrossmonthly",
            "calculatednettspmonthly",
            "calculatedprojectedsocialsecuritymonthly",
            "calculatednetretirementincomemonthly",
            "calculatedprojectednetmonthly",
            "calculatedcurrentmonthlynet",
            "calculatedpensionyearlygross",
            "calculatedlessfegli",
            "calculatedlesshealthinsurancemonthly",
            "calculatedlessdentalinsurancemonthly",
            "calculatedlessvisioninsurancemonthly",
            "calculatedlessltcmonthly",
            "calculatedannualleavepayout",
            "calculateddistributionrate",
            "calculatedfederalmarginalrate",
            "calculatedstateeffectiverate",
            "calculatedstateeffectiveratefers",
            "calculatedstateeffectiveratesocialsecurity",
            "calculatedstateeffectiveratebridge",
            "calculatedstateeffectiveratetsp",
            "calculatedgapstatus",
            "calculatedstatepensiontaxability",
            "calculatedstatesocialsecuritytaxability",
            "calculatedstateirataxability",
            "calculatedstatepensionrate",
            "calculatedstatesocialsecurityrate",
            "calculatedstateirarate",
            "calculatedstateflatrate",
            "calculatedstatetaxsourcetype",
            "calculatedstatetaxdisclaimerrequired",
            "calculatedstatetaxdisclaimer"
        ]);
    },

    buildFinalCalculationResponse: function(output) {
        const crmPayload = output && output.crmUpdatePayload ? this.cloneJson(output.crmUpdatePayload) : {
            customFields: {},
            stateTaxGuidance: {},
            displayFields: {}
        };

        const finalCalculationCustomFields = {};
        for (const fieldName of FINAL_CALCULATION_CRM_FIELDS) {
            finalCalculationCustomFields[fieldName] = crmPayload.customFields[fieldName] || "";
        }

        return {
            customFields: finalCalculationCustomFields,
            crmUpdatePayload: crmPayload,
            fieldList: this.getFinalCalculationFieldList(),
            compatibilityFieldList: this.getFinalCalculationFieldList({ includeCompatibilityFields: true }),
            stateTaxGuidance: crmPayload.stateTaxGuidance || {},
            displayFields: crmPayload.displayFields || {}
        };
    },

    parseInjectedNumber: function(value) {
        if (value === null || value === undefined) return 0;
        const normalized = String(value).replace(/[^0-9.\-]/g, "");
        return this.toNumber(normalized, 0);
    },

    yearsBetween: function(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;

        const millisecondsPerYear = 365.2425 * 24 * 60 * 60 * 1000;
        return Math.max(0, (end.getTime() - start.getTime()) / millisecondsPerYear);
    },

    ageOnDate: function(dateOfBirth, onDate) {
        const dob = new Date(dateOfBirth);
        const target = new Date(onDate);

        if (Number.isNaN(dob.getTime()) || Number.isNaN(target.getTime())) return 0;

        let age = target.getUTCFullYear() - dob.getUTCFullYear();
        const birthdayHasOccurred = (
            target.getUTCMonth() > dob.getUTCMonth() ||
            (target.getUTCMonth() === dob.getUTCMonth() && target.getUTCDate() >= dob.getUTCDate())
        );

        if (!birthdayHasOccurred) age -= 1;
        return Math.max(0, age);
    },

    parseBoolean: function(value) {
        if (value === true || value === false) return value;
        const normalized = String(value || "").trim().toLowerCase();
        return normalized === "true" || normalized === "yes" || normalized === "y" || normalized === "1";
    },

    hasExplicitValue: function(source, key) {
        if (!source || typeof source !== "object") return false;
        if (!Object.prototype.hasOwnProperty.call(source, key)) return false;
        return source[key] !== null && source[key] !== undefined && source[key] !== "";
    },

    getSickLeaveHours: function(customFields) {
        const candidates = [
            "sickleavehours",
            "unusedsickleavehours",
            "sickleave",
            "unusedsickleave",
            "sickleave_balance"
        ];

        for (const key of candidates) {
            if (customFields[key] !== undefined && customFields[key] !== null && customFields[key] !== "") {
                return this.toNumber(customFields[key]);
            }
        }

        return 0;
    },

    calculateOPMService: function(startDate, retirementDate) {
        const start = new Date(startDate);
        const end = new Date(retirementDate);

        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            return {
                years: 0,
                months: 0,
                days: 0,
                totalMonths: 0,
                decimalYears: 0
            };
        }

        let startYear = start.getUTCFullYear();
        let startMonth = start.getUTCMonth() + 1;
        let startDay = Math.min(start.getUTCDate(), 30);
        let endYear = end.getUTCFullYear();
        let endMonth = end.getUTCMonth() + 1;
        let endDay = end.getUTCDate() + 1;

        if (endDay > 30) {
            endDay -= 30;
            endMonth += 1;
        }

        if (endMonth > 12) {
            endMonth -= 12;
            endYear += 1;
        }

        if (endDay < startDay) {
            endDay += 30;
            endMonth -= 1;
        }

        if (endMonth < startMonth) {
            endMonth += 12;
            endYear -= 1;
        }

        const years = Math.max(0, endYear - startYear);
        const months = Math.max(0, endMonth - startMonth);
        const days = Math.max(0, endDay - startDay);
        const totalMonths = (years * 12) + months;
        const decimalYears = this.roundMoney(years + (months / 12) + (days / 360));

        return {
            years,
            months,
            days,
            totalMonths,
            decimalYears
        };
    },

    determineSurvivorElection: function(customFields, isMarried) {
        const rawValue = String(
            customFields.surviborbenefits ||
            customFields.survisorbenetit ||
            customFields.survivorbenefit ||
            customFields.survivorelection ||
            customFields.survivor_election ||
            customFields.survivorbenefitelection ||
            customFields.survivor_option ||
            ""
        ).trim().toLowerCase();

        const numericValue = parseInt(rawValue.replace(/[^0-9]/g, ""), 10);
        if (numericValue === 25) return { percent: 25, reductionRate: 0.05 };
        if (numericValue === 50) return { percent: 50, reductionRate: 0.10 };
        if (numericValue === 0) return { percent: 0, reductionRate: 0 };

        if (customFields.survivor50 === true || String(customFields.survivor50).toLowerCase() === "true") {
            return { percent: 50, reductionRate: 0.10 };
        }
        if (customFields.survivor25 === true || String(customFields.survivor25).toLowerCase() === "true") {
            return { percent: 25, reductionRate: 0.05 };
        }
        if (customFields.survivor0 === true || String(customFields.survivor0).toLowerCase() === "true") {
            return { percent: 0, reductionRate: 0 };
        }

        if (rawValue.includes("25")) return { percent: 25, reductionRate: 0.05 };
        if (rawValue.includes("0") || rawValue.includes("waive") || rawValue.includes("none")) {
            return { percent: 0, reductionRate: 0 };
        }
        if (rawValue.includes("50")) return { percent: 50, reductionRate: 0.10 };

        return isMarried
            ? { percent: 50, reductionRate: 0.10 }
            : { percent: 0, reductionRate: 0 };
    },

    determineSocialSecurityTaxability: function({ filingStatus, pensionGrossMonthly, taxableTspMonthly, socialSecurityGrossMonthly }) {
        const provisionalIncomeAnnual =
            (this.roundMoney(pensionGrossMonthly) * 12) +
            (this.roundMoney(taxableTspMonthly) * 12) +
            ((this.roundMoney(socialSecurityGrossMonthly) * 12) * 0.5);

        const isMarried = filingStatus === "married";
        const lowerThreshold = isMarried ? 32000 : 25000;
        const upperThreshold = isMarried ? 44000 : 34000;

        let taxablePercent = 0;
        if (provisionalIncomeAnnual > upperThreshold) taxablePercent = 85;
        else if (provisionalIncomeAnnual > lowerThreshold) taxablePercent = 50;

        return {
            provisionalIncomeAnnual: this.roundMoney(provisionalIncomeAnnual),
            taxablePercent
        };
    },

    calculateTaxFromBrackets: function(taxableIncome, bracketRows) {
        const income = Math.max(0, this.roundMoney(taxableIncome));
        if (income <= 0 || !Array.isArray(bracketRows) || bracketRows.length === 0) return 0;

        let tax = 0;

        for (const row of bracketRows) {
            const floor = this.toNumber(row.floor);
            const ceiling = this.toNumber(row.ceiling, Number.MAX_SAFE_INTEGER);
            const rate = this.toNumber(row.rate);

            if (income <= floor) continue;

            const taxableSlice = Math.min(income, ceiling) - floor;
            if (taxableSlice > 0) {
                tax += taxableSlice * rate;
            }

            if (income <= ceiling) break;
        }

        return this.roundMoney(tax);
    },

    getMarginalTaxRate: function(taxableIncome, bracketRows) {
        const income = Math.max(0, this.roundMoney(taxableIncome));
        if (income <= 0 || !Array.isArray(bracketRows) || bracketRows.length === 0) return 0;

        const match = bracketRows.find((row) => {
            const floor = this.toNumber(row.floor);
            const ceiling = this.toNumber(row.ceiling, Number.MAX_SAFE_INTEGER);
            return income >= floor && income <= ceiling;
        });

        if (!match) {
            return this.toNumber(bracketRows[bracketRows.length - 1].marginal_rate);
        }

        return this.toNumber(match.marginal_rate);
    },

    calculateTaxableSocialSecurityAnnual: function(benefitsAnnual, otherIncomeAnnual, filingStatus) {
        const benefits = Math.max(0, this.roundMoney(benefitsAnnual));
        const otherIncome = Math.max(0, this.roundMoney(otherIncomeAnnual));
        const isMarried = filingStatus === "married";
        const baseAmount = isMarried ? 32000 : 25000;
        const adjustedBaseAmount = isMarried ? 44000 : 34000;
        const secondTierCap = isMarried ? 6000 : 4500;
        const provisionalIncome = otherIncome + (benefits * 0.5);

        if (provisionalIncome <= baseAmount) {
            return {
                provisionalIncome: this.roundMoney(provisionalIncome),
                taxableAmount: 0,
                taxablePercent: 0
            };
        }

        if (provisionalIncome <= adjustedBaseAmount) {
            const taxableAmount = Math.min((provisionalIncome - baseAmount) * 0.5, benefits * 0.5);
            return {
                provisionalIncome: this.roundMoney(provisionalIncome),
                taxableAmount: this.roundMoney(taxableAmount),
                taxablePercent: 50
            };
        }

        const baseTaxableAmount = Math.min(secondTierCap, benefits * 0.5);
        const taxableAmount = Math.min(
            ((provisionalIncome - adjustedBaseAmount) * 0.85) + baseTaxableAmount,
            benefits * 0.85
        );

        return {
            provisionalIncome: this.roundMoney(provisionalIncome),
            taxableAmount: this.roundMoney(taxableAmount),
            taxablePercent: 85
        };
    },

    allocateTaxByShare: function(totalTaxAnnual, components) {
        const totalTax = Math.max(0, this.roundMoney(totalTaxAnnual));
        const totalBase = Object.values(components).reduce((sum, amount) => sum + Math.max(0, this.roundMoney(amount)), 0);
        const allocation = {};

        if (totalTax === 0 || totalBase === 0) {
            Object.keys(components).forEach((key) => {
                allocation[key] = 0;
            });
            return allocation;
        }

        const keys = Object.keys(components);
        let allocatedTotal = 0;

        keys.forEach((key, index) => {
            const base = Math.max(0, this.roundMoney(components[key]));
            const share = index === keys.length - 1
                ? this.roundMoney(totalTax - allocatedTotal)
                : this.roundMoney(totalTax * (base / totalBase));

            allocation[key] = share;
            allocatedTotal += share;
        });

        return allocation;
    },

    getStateRetirementTaxRule: function(state, stateRetirementTaxRules) {
        const normalizedState = String(state || "").trim().toLowerCase();
        if (!normalizedState || !Array.isArray(stateRetirementTaxRules)) return null;

        return stateRetirementTaxRules.find((row) => String(row.state || "").trim().toLowerCase() === normalizedState) || null;
    },

    getTargetTaxYear: function(dateInput) {
        const date = new Date(dateInput);
        if (!Number.isNaN(date.getTime())) return date.getUTCFullYear();
        return new Date().getUTCFullYear();
    },

    getStateTaxRowsForYear: function(state, explicitStateRates, taxYear) {
        const normalizedState = String(state || "").trim().toLowerCase();
        if (!normalizedState || !Array.isArray(explicitStateRates)) return [];

        const stateRows = explicitStateRates.filter(
            (row) => String(row.state || "").trim().toLowerCase() === normalizedState
        );
        if (stateRows.length === 0) return [];

        const exactRows = stateRows.filter((row) => parseInt(row.taxyear, 10) === taxYear);
        if (exactRows.length > 0) return exactRows;

        const rowsWithYear = stateRows.filter((row) => Number.isFinite(parseInt(row.taxyear, 10)));
        if (rowsWithYear.length === 0) return stateRows;

        const availableYears = [...new Set(rowsWithYear.map((row) => parseInt(row.taxyear, 10)))].sort((a, b) => a - b);
        const fallbackYear = availableYears.filter((year) => year <= taxYear).pop() || availableYears[availableYears.length - 1];
        return rowsWithYear.filter((row) => parseInt(row.taxyear, 10) === fallbackYear);
    },

    getStateBracketRows: function(stateRows, filingStatus) {
        if (!Array.isArray(stateRows) || stateRows.length === 0) return [];

        const nestedBracketRows = stateRows.flatMap((row) => {
            if (!Array.isArray(row.brackets)) return [];

            return this.normalizeRateRows(row.brackets).map((bracketRow) => ({
                ...bracketRow,
                filingstatus: bracketRow.filingstatus || row.filingstatus || ""
            }));
        });

        const directBracketRows = stateRows.filter((row) =>
            row.floor !== undefined && row.floor !== null && row.rate !== undefined && row.rate !== null
        );

        return directBracketRows
            .concat(nestedBracketRows)
            .filter((row) => {
                const rowFilingStatus = String(row.filingstatus || "").trim().toLowerCase();
                return rowFilingStatus === "" || rowFilingStatus === filingStatus;
            })
            .sort((a, b) => this.toNumber(a.floor) - this.toNumber(b.floor));
    },

    getStateTaxProfile: function(state, explicitStateRates, stateRule, taxYear, filingStatus) {
        const selectedRows = this.getStateTaxRowsForYear(state, explicitStateRates, taxYear);
        const bracketRows = this.getStateBracketRows(selectedRows, filingStatus);
        const flatRow = selectedRows.find((row) => row.rate !== undefined && row.rate !== null);
        const flatRate = bracketRows.length > 0
            ? 0
            : (flatRow && flatRow.rate !== undefined && flatRow.rate !== null
                ? this.toNumber(flatRow.rate)
                : this.toNumber(stateRule ? stateRule.flat_income_tax_rate : 0));

        return {
            selectedRows,
            bracketRows,
            flatRate,
            method: bracketRows.length > 0 ? "brackets" : "flat"
        };
    },

    calculateStateTax: function(stateTaxableComponentsAnnual, stateTaxProfile) {
        const annualComponents = Object.fromEntries(
            Object.entries(stateTaxableComponentsAnnual).map(([key, value]) => [key, Math.max(0, this.roundMoney(value))])
        );
        const totalTaxableAnnual = Object.values(annualComponents).reduce((sum, value) => sum + value, 0);

        if (stateTaxProfile && stateTaxProfile.bracketRows && stateTaxProfile.bracketRows.length > 0) {
            const totalTaxAnnual = this.calculateTaxFromBrackets(totalTaxableAnnual, stateTaxProfile.bracketRows);
            const allocationAnnual = this.allocateTaxByShare(totalTaxAnnual, annualComponents);
            const effectiveRates = {};

            Object.keys(annualComponents).forEach((key) => {
                effectiveRates[key] = annualComponents[key] > 0
                    ? this.roundMoney(allocationAnnual[key] / annualComponents[key])
                    : 0;
            });

            return {
                method: "brackets",
                totalTaxableAnnual,
                totalTaxAnnual,
                allocationAnnual,
                effectiveRates,
                overallEffectiveRate: totalTaxableAnnual > 0 ? this.roundMoney(totalTaxAnnual / totalTaxableAnnual) : 0
            };
        }

        const flatRate = this.toNumber(stateTaxProfile ? stateTaxProfile.flatRate : 0);
        const allocationAnnual = {};
        const effectiveRates = {};

        Object.keys(annualComponents).forEach((key) => {
            allocationAnnual[key] = this.roundMoney(annualComponents[key] * flatRate);
            effectiveRates[key] = annualComponents[key] > 0 ? flatRate : 0;
        });

        return {
            method: "flat",
            totalTaxableAnnual,
            totalTaxAnnual: this.roundMoney(totalTaxableAnnual * flatRate),
            allocationAnnual,
            effectiveRates,
            overallEffectiveRate: totalTaxableAnnual > 0 ? flatRate : 0
        };
    },

    getStateTaxRate: function(state, explicitStateRates, stateRule) {
        const normalizedState = String(state || "").trim().toLowerCase();
        if (stateRule && stateRule.flat_income_tax_rate !== undefined && stateRule.flat_income_tax_rate !== null) {
            return this.toNumber(stateRule.flat_income_tax_rate);
        }

        const explicitRateRow = Array.isArray(explicitStateRates)
            ? explicitStateRates.find((row) => String(row.state || "").trim().toLowerCase() === normalizedState)
            : null;

        if (explicitRateRow && explicitRateRow.rate !== undefined && explicitRateRow.rate !== null) {
            return this.toNumber(explicitRateRow.rate);
        }

        return 0;
    },

    getTaxableAmountForStateRule: function(amount, ruleValue) {
        const normalizedRule = String(ruleValue || "").trim().toLowerCase();
        if (normalizedRule === "no") return 0;
        if (normalizedRule === "yes") return this.roundMoney(amount);

        // Partial states still tax some portion of the category; until we model each
        // state-specific exemption formula, treat them as taxable and preserve the
        // source note in the payload.
        if (normalizedRule === "partial") return this.roundMoney(amount);

        return this.roundMoney(amount);
    },

    lookupRate: function(rateTable, age) {
        return rateTable.find((row) => age >= row.age_min && age <= row.age_max) || null;
    },

    // --- 2. OPM LOGIC SUB-ENGINES ---
    calculateBIA: function(salary) {
        const salaryNumber = this.toNumber(salary);
        if (salaryNumber <= 0) {
            return { base: 0, total: 0 };
        }

        const base = Math.ceil(salaryNumber / 1000) * 1000;
        return { base, total: base + 2000 };
    },

    getOPMLetter: function(hasA, bMult, hasC) {
        const map = {
            0: ["C", "D", "E", "F"],
            1: ["G", "H", "I", "J"],
            2: ["K", "L", "M", "N"],
            3: ["9", "P", "Q", "R"],
            4: ["S", "T", "U", "V"],
            5: ["W", "X", "Y", "Z"]
        };
        const safeBMult = Math.min(5, Math.max(0, parseInt(bMult, 10) || 0));
        const col = !hasA && !hasC ? 0 : (hasA && !hasC ? 1 : (!hasA && hasC ? 2 : 3));
        return map[safeBMult][col];
    },

    getComponentsFromLetter: function(letter) {
        const normalizedLetter = String(letter || "").trim().toUpperCase();
        const components = {
            hasA: "DFHJLNPRTVXZ".includes(normalizedLetter),
            hasC: "EFIJMNQRUVYZ".includes(normalizedLetter),
            bMult: 0
        };

        if ("GHIJ".includes(normalizedLetter)) components.bMult = 1;
        else if ("KLMN".includes(normalizedLetter)) components.bMult = 2;
        else if ("9PQR".includes(normalizedLetter)) components.bMult = 3;
        else if ("STUV".includes(normalizedLetter)) components.bMult = 4;
        else if ("WXYZ".includes(normalizedLetter)) components.bMult = 5;

        return components;
    },

    getFegliComponentsFromElectionFields: function(customFields, prefix = "") {
        const normalizedPrefix = String(prefix || "");
        const optionAKey = `${normalizedPrefix}optiona`;
        const optionBKey = `${normalizedPrefix}optionb`;
        const optionCKey = `${normalizedPrefix}optionc`;

        const hasAnyElectionField = this.hasExplicitValue(customFields, optionAKey) ||
            this.hasExplicitValue(customFields, optionBKey) ||
            this.hasExplicitValue(customFields, optionCKey);

        if (!hasAnyElectionField) {
            return null;
        }

        return {
            hasA: this.parseBoolean(customFields[optionAKey]),
            bMult: Math.min(5, Math.max(0, parseInt(customFields[optionBKey], 10) || 0)),
            cMult: Math.min(5, Math.max(0, parseInt(customFields[optionCKey], 10) || 0))
        };
    },

    decipherActiveCode: function(salary, age, biWeeklyCost, employeeRates) {
        const rate = this.lookupRate(employeeRates, age);
        if (!rate) return "C0";

        const targetCost = this.toNumber(biWeeklyCost);
        if (targetCost <= 0) return "C0";

        const bia = this.calculateBIA(salary);
        const basicPremium = (bia.total / 1000) * this.toNumber(rate.basic);
        let bestMatch = "C0";
        let smallestDiff = Number.MAX_SAFE_INTEGER;

        for (let bMult = 0; bMult <= 5; bMult += 1) {
            for (let cMult = 0; cMult <= 5; cMult += 1) {
                for (let hasAIndex = 0; hasAIndex <= 1; hasAIndex += 1) {
                    const hasA = hasAIndex === 1;
                    const hasC = cMult > 0;
                    const testedPremium = basicPremium +
                        (hasA ? this.toNumber(rate.opt_a) : 0) +
                        (bMult * (bia.base / 1000) * this.toNumber(rate.opt_b)) +
                        (hasC ? cMult * this.toNumber(rate.opt_c) : 0);

                    if (testedPremium > targetCost + 0.05) continue;

                    const diff = targetCost - testedPremium;
                    if (diff < smallestDiff) {
                        smallestDiff = diff;
                        bestMatch = `${this.getOPMLetter(hasA, bMult, hasC)}${cMult}`;
                    }
                }
            }
        }

        return bestMatch;
    },

    resolveRetireeFegliElection: function(customFields, activeCode) {
        const hasRetireFieldInputs = this.hasExplicitValue(customFields, "optiona_retire") ||
            this.hasExplicitValue(customFields, "optionb_retire") ||
            this.hasExplicitValue(customFields, "optionc_retire");
        const requestedRetireChange = this.parseBoolean(customFields.change2fegli);
        if (!hasRetireFieldInputs) {
            return {
                hasA: false,
                bMult: 0,
                cMult: 0,
                code: "A0",
                fallbackReason: "missing_retire_fields"
            };
        }

        const hasRetireOverrides = requestedRetireChange || hasRetireFieldInputs;

        const hasA = hasRetireOverrides ? this.parseBoolean(customFields.optiona_retire) : false;
        const bMult = hasRetireOverrides
            ? Math.min(5, Math.max(0, parseInt(customFields.optionb_retire, 10) || 0))
            : 0;
        const cMult = hasRetireOverrides
            ? Math.min(5, Math.max(0, parseInt(customFields.optionc_retire, 10) || 0))
            : 0;

        return {
            hasA,
            bMult,
            cMult,
            code: `${this.getOPMLetter(hasA, bMult, cMult > 0)}${cMult}`,
            fallbackReason: ""
        };
    },

    calculateActiveFEGLI: function({ salary, age, code }, employeeRates) {
        const bia = this.calculateBIA(salary);
        const rate = this.lookupRate(employeeRates, age);
        if (!rate) {
            return {
                basicCoverage: 0,
                optACoverage: 0,
                optBCoverage: 0,
                optCCoverage: 0,
                basicPremium: 0,
                optAPremium: 0,
                optBPremium: 0,
                optCPremium: 0
            };
        }

        const letter = (code || "C0").charAt(0).toUpperCase();
        const cMultiple = parseInt(String(code || "C0").slice(1), 10) || 0;
        const components = this.getComponentsFromLetter(letter);

        return {
            basicCoverage: this.roundMoney(bia.total),
            optACoverage: this.roundMoney(components.hasA ? 10000 : 0),
            optBCoverage: this.roundMoney(components.bMult * bia.base),
            optCCoverage: this.roundMoney(components.hasC ? cMultiple * 5000 : 0),
            basicPremium: this.roundMoney((bia.total / 1000) * this.toNumber(rate.basic)),
            optAPremium: this.roundMoney(components.hasA ? this.toNumber(rate.opt_a) : 0),
            optBPremium: this.roundMoney(components.bMult * (bia.base / 1000) * this.toNumber(rate.opt_b)),
            optCPremium: this.roundMoney(components.hasC ? cMultiple * this.toNumber(rate.opt_c) : 0)
        };
    },

    calculateRetireeFEGLI: function({ salary, age, reduction, hasA, bMult, cMult }, annuitantRates) {
        const bia = this.calculateBIA(salary);
        const rate = this.lookupRate(annuitantRates, age);
        if (!rate) {
            return {
                basicCoverage: 0,
                optACoverage: 0,
                optBCoverage: 0,
                optCCoverage: 0,
                basicPremium: 0,
                optAPremium: 0,
                optBPremium: 0,
                optCPremium: 0
            };
        }

        const reductionSuffix = reduction === "50" ? "50" : (reduction === "0" ? "0" : "75");
        const basicKey = `basic_${reductionSuffix}`;
        const reductionPercent = reduction === "0" ? 1.0 : (reduction === "50" ? 0.5 : 0.25);
        const safeBMult = Math.min(5, Math.max(0, parseInt(bMult, 10) || 0));
        const safeCMult = Math.min(5, Math.max(0, parseInt(cMult, 10) || 0));

        return {
            basicCoverage: this.roundMoney(bia.base * reductionPercent),
            optACoverage: this.roundMoney(hasA ? 2500 : 0),
            optBCoverage: this.roundMoney(safeBMult * bia.base),
            optCCoverage: this.roundMoney(safeCMult * 5000),
            basicPremium: this.roundMoney((bia.base / 1000) * this.toNumber(rate[basicKey])),
            optAPremium: this.roundMoney(hasA ? this.toNumber(rate.opt_a) : 0),
            optBPremium: this.roundMoney(safeBMult * (bia.base / 1000) * this.toNumber(rate.opt_b)),
            optCPremium: this.roundMoney(safeCMult * this.toNumber(rate.opt_c))
        };
    },

    buildFegliResult: function(actJson, empRateInput, annuitantRateInput) {
        actJson = this.normalizeActInput(actJson);
        const c = actJson.customFields || {};
        const today = new Date();
        const retirementDate = c.retiredate || today.toISOString();
        const employeeRates = this.parseRates(empRateInput);
        const annuitantRates = this.parseRates(annuitantRateInput);
        const clientAge = parseInt(c.cust_age_033220843, 10) || this.ageOnDate(actJson.birthday, today);
        const retireAge = this.ageOnDate(actJson.birthday, retirementDate);
        const salary = this.toNumber(c.salaryamount);
        const explicitActiveCode = (c.feglicodeactive || "").trim().toUpperCase();
        const decodedActiveCode = this.decipherActiveCode(salary, clientAge, c.fegliperpayperiod, employeeRates);
        const activeCode = explicitActiveCode || decodedActiveCode || "C0";
        const reduction = String(c.feglireduction || "75");
        const retireeElection = this.resolveRetireeFegliElection(c, activeCode);
        const activeIsWaived = activeCode === "B0";
        const retireIsIneligible = retireeElection.code === "A0";
        const retireIsWaived = retireeElection.code === "B0" || activeIsWaived;
        const activeElection = this.getComponentsFromLetter(activeCode.charAt(0));
        const activeOptionCMultiple = Math.min(5, Math.max(0, parseInt(String(activeCode).slice(1), 10) || 0));
        const activeFegli = this.calculateActiveFEGLI({
            salary,
            age: clientAge,
            code: activeCode
        }, employeeRates);
        const retireeFegli = this.calculateRetireeFEGLI({
            salary,
            age: retireAge,
            reduction,
            hasA: retireeElection.hasA,
            bMult: retireeElection.bMult,
            cMult: retireeElection.cMult
        }, annuitantRates);
        const monthlyFegli = (retireIsIneligible || retireIsWaived)
            ? 0
            : this.roundMoney(
                retireeFegli.basicPremium +
                retireeFegli.optAPremium +
                retireeFegli.optBPremium +
                retireeFegli.optCPremium
            );

        return {
            clientAge,
            retireAge,
            salary,
            reduction,
            activeCode,
            decodedActiveCode,
            explicitActiveCode,
            activeElection,
            activeOptionCMultiple,
            retireeElection,
            activeIsWaived,
            retireIsIneligible,
            retireIsWaived,
            activeFegli,
            retireeFegli,
            monthlyFegli,
            employeeRates,
            annuitantRates
        };
    },

    buildFegliOnlyResponse: function(actJson, fegliResult) {
        const output = {};
        const customFields = this.cloneJson(actJson.customFields || {});

        customFields.feglicodeactive = fegliResult.activeCode;
        customFields.basiclife = this.formatCrmWholeNumber(fegliResult.activeFegli.basicCoverage);
        customFields.optiona = fegliResult.activeElection.hasA;
        customFields.optionb = String(fegliResult.activeElection.bMult);
        customFields.optionc = String(fegliResult.activeOptionCMultiple);
        customFields.calculatedfeglicodeactive = fegliResult.activeCode;
        customFields.calculatedfeglicoderetire = fegliResult.retireeElection.code;
        customFields.calculatedlessfegli = this.formatCrmWholeNumber(fegliResult.monthlyFegli);
        customFields.fegli = this.formatCrmWholeNumber(fegliResult.monthlyFegli);

        output["FEGLI Code"] = fegliResult.activeCode;
        output["FEGLI Code Retire"] = fegliResult.retireeElection.code;
        output["FEGLI Basic Now"] = fegliResult.activeIsWaived ? "Waived" : this.formatCurrency(fegliResult.activeFegli.basicCoverage);
        output["FEGLI A Now"] = fegliResult.activeIsWaived ? "Waived" : this.formatCurrency(fegliResult.activeFegli.optACoverage);
        output["FEGLI B Now"] = fegliResult.activeIsWaived ? "Waived" : this.formatCurrency(fegliResult.activeFegli.optBCoverage);
        output["FEGLI C Now"] = fegliResult.activeIsWaived ? "Waived" : this.formatCurrency(fegliResult.activeFegli.optCCoverage);
        output["FEGLI Basic Retire"] = fegliResult.retireIsWaived ? "Waived" : (fegliResult.retireIsIneligible ? "Ineligible" : this.formatCurrency(fegliResult.retireeFegli.basicCoverage));
        output["FEGLI A Retire"] = fegliResult.retireIsWaived ? "Waived" : (fegliResult.retireIsIneligible ? "Ineligible" : this.formatCurrency(fegliResult.retireeFegli.optACoverage));
        output["FEGLI B Retire"] = fegliResult.retireIsWaived ? "Waived" : (fegliResult.retireIsIneligible ? "Ineligible" : this.formatCurrency(fegliResult.retireeFegli.optBCoverage));
        output["FEGLI C Retire"] = fegliResult.retireIsWaived ? "Waived" : (fegliResult.retireIsIneligible ? "Ineligible" : this.formatCurrency(fegliResult.retireeFegli.optCCoverage));
        output["FEGLI 75"] = fegliResult.reduction === "75" ? "Yes" : "Off";
        output["FEGLI 50"] = fegliResult.reduction === "50" ? "Yes" : "Off";
        output["FEGLI 0"] = fegliResult.reduction === "0" ? "Yes" : "Off";
        output["less FEGLI"] = (fegliResult.retireIsIneligible || fegliResult.retireIsWaived)
            ? "N/A"
            : this.formatAccountingCurrency(fegliResult.monthlyFegli);

        return {
            customFields,
            displayFields: {
                "FEGLI Code": output["FEGLI Code"],
                "FEGLI Code Retire": output["FEGLI Code Retire"],
                "FEGLI Basic Now": output["FEGLI Basic Now"],
                "FEGLI A Now": output["FEGLI A Now"],
                "FEGLI B Now": output["FEGLI B Now"],
                "FEGLI C Now": output["FEGLI C Now"],
                "FEGLI Basic Retire": output["FEGLI Basic Retire"],
                "FEGLI A Retire": output["FEGLI A Retire"],
                "FEGLI B Retire": output["FEGLI B Retire"],
                "FEGLI C Retire": output["FEGLI C Retire"],
                "FEGLI 75": output["FEGLI 75"],
                "FEGLI 50": output["FEGLI 50"],
                "FEGLI 0": output["FEGLI 0"],
                "less FEGLI": output["less FEGLI"]
            },
            fegliSummary: {
                clientAge: fegliResult.clientAge,
                retireAge: fegliResult.retireAge,
                activeCode: fegliResult.activeCode,
                retireCode: fegliResult.retireeElection.code,
                monthlyFegliCost: fegliResult.monthlyFegli,
                activeDecodedFromPremium: !fegliResult.explicitActiveCode && !!fegliResult.decodedActiveCode
            },
            ...output
        };
    },

    executeFegli: function(actJson, empRateInput, annuitantRateInput) {
        const fegliResult = this.buildFegliResult(actJson, empRateInput, annuitantRateInput);
        return this.buildFegliOnlyResponse(actJson, fegliResult);
    },

    // --- 3. MAIN EXECUTION ENGINE ---
    execute: function(actJson, empCsv, annuitantCsv, federalTaxCsv, stateTaxCsv, stateRetirementTaxRulesInput) {
        actJson = this.normalizeActInput(actJson);
        const c = actJson.customFields || {};
        const output = {};

        const today = new Date();
        const appointmentDateInput = this.getAppointmentDateInput(actJson, today.toISOString());
        const retirementDate = c.retiredate || today.toISOString();
        const employeeRates = this.parseRates(empCsv);
        const annuitantRates = this.parseRates(annuitantCsv);
        const federalTaxRates = this.parseRates(federalTaxCsv);
        const stateTaxRates = this.parseRates(stateTaxCsv);
        const stateRetirementTaxRules = this.parseRates(stateRetirementTaxRulesInput);

        const clientAge = parseInt(c.cust_age_033220843, 10) || this.ageOnDate(actJson.birthday, today);
        const spouseAge = c.cust_spouseage_074349200
            ? parseInt(c.cust_spouseage_074349200, 10) || 0
            : this.ageOnDate(c.spousedob, today);
        const retireAge = this.ageOnDate(actJson.birthday, retirementDate);

        const salary = this.toNumber(c.salaryamount);
        const high3Salary = this.toNumber(c.high3avgsalary, salary);
        const militaryTime = this.toNumber(c.yrsofmilitaryservice);
        const militaryMonths = this.convertYearsToWholeMonths(militaryTime);
        const sickLeaveHours = this.getSickLeaveHours(c);
        const sickLeaveMonths = Math.floor(sickLeaveHours / 174);
        const opmService = this.calculateOPMService(c.servicecomputationdate, retirementDate);
        const serviceMonthsWithMilitary = opmService.totalMonths + militaryMonths;
        const serviceMonthsWithSickLeave = serviceMonthsWithMilitary + sickLeaveMonths;
        const bridgeServiceMonths = Math.max(0, opmService.totalMonths + sickLeaveMonths);
        const yearsOfService = this.roundMoney(serviceMonthsWithSickLeave / 12);
        const bridgeYears = this.roundMoney(bridgeServiceMonths / 12);
        const hasEnhancedMultiplier = retireAge >= 62 && (serviceMonthsWithMilitary >= (20 * 12));
        const multiplierPercent = hasEnhancedMultiplier ? 1.1 : 1.0;

        const pensionYearlyGross = this.roundMoney(high3Salary * yearsOfService * (multiplierPercent / 100));
        const grossFERS = this.roundMoney(pensionYearlyGross / 12);

        const isMarried = String(c.maritalstatus || "").toLowerCase() === "married";
        const survivorElection = this.determineSurvivorElection(c, isMarried);
        const survivorReductionMonthly = this.roundMoney(grossFERS * survivorElection.reductionRate);

        const healthInsuranceMonthly = this.getMonthlyValueFromCustomFields(
            c,
            ["cust_fehbpermonth_023844547"],
            ["fehbperpayperiod", "healthinsuranceperpayperiod"]
        );
        const dentalInsuranceMonthly = this.getMonthlyValueFromCustomFields(
            c,
            ["cust_dentalinsurancepermonth_030554373"],
            ["dentalinsuranceperpayperiod"]
        );
        const visionInsuranceMonthly = this.getMonthlyValueFromCustomFields(
            c,
            ["cust_visioninsurancepermonth_032424647"],
            ["visioninsuranceperpayperiod"]
        );
        const ltcInsuranceMonthly = this.getMonthlyValueFromCustomFields(
            c,
            ["cust_ltcpermonth_062304353"],
            ["ltcperpayperiod"]
        );
        const annualLeaveHours = this.toNumber(c.annualleave);
        const annualLeavePayout = this.roundMoney((salary / 2080) * annualLeaveHours);

        const fegliResult = this.buildFegliResult(actJson, employeeRates, annuitantRates);
        const activeCode = fegliResult.activeCode;
        const reduction = fegliResult.reduction;
        const retireCode = fegliResult.retireeElection.code;
        const retireFallbackReason = fegliResult.retireeElection.fallbackReason || "";
        const activeIsWaived = fegliResult.activeIsWaived;
        const retireIsIneligible = fegliResult.retireIsIneligible;
        const retireIsWaived = fegliResult.retireIsWaived;
        const activeFegli = fegliResult.activeFegli;
        const retireeFegli = fegliResult.retireeFegli;
        const monthlyFegli = fegliResult.monthlyFegli;

        const bridgeActive = retireAge < 62;
        const socialSecurityActive = retireAge >= 62;
        const socialSecurityInput = this.roundMoney(c.socialsecurityincome);
        const age62EstimateInput = this.roundMoney(c.age62socialsecurityestimate);
        const age62SocialSecurityEstimate = bridgeActive ? age62EstimateInput : 0;
        const socialSecurityGross = socialSecurityInput;
        const requestedDistributionRate = this.toNumber(
            c.tspdistributionrate ||
            c.tspwithdrawalrate ||
            c.tsp_rate ||
            c.fourpctruleyrmo,
            0
        );
        const defaultDistributionRate = retireAge >= 72 ? 5 : 4;
        const distributionRate = requestedDistributionRate > 0 ? requestedDistributionRate : defaultDistributionRate;
        const tspTraditional = this.roundMoney(c.tsptraditionalbalance);
        const tspRoth = this.roundMoney(c.tsprothbalance);
        const tspTotal = this.roundMoney(tspTraditional + tspRoth);
        const requestedTspBalanceUsed = this.toNumber(c.tspbalanceused, tspTotal);
        const tspBalanceUsed = this.roundMoney(
            requestedTspBalanceUsed > 0
                ? requestedTspBalanceUsed
                : tspTotal
        );
        const tspGrossYearly = this.roundMoney(tspBalanceUsed * (distributionRate / 100));
        const tspGrossMonthly = this.roundMoney(tspGrossYearly / 12);
        const taxableTspBase = Math.min(tspTraditional, tspBalanceUsed);
        const taxableTspYearly = this.roundMoney(taxableTspBase * (distributionRate / 100));
        const taxableTspMonthly = this.roundMoney(taxableTspYearly / 12);
        const grossBridge = bridgeActive
            ? this.roundMoney((bridgeYears / 40) * age62SocialSecurityEstimate)
            : 0;
        const grossBridgeYearly = this.roundMoney(grossBridge * 12);
        const filingStatus = isMarried ? "married" : "single";
        const clientState = actJson.homeAddress && actJson.homeAddress.state
            ? actJson.homeAddress.state
            : (actJson.businessAddress && actJson.businessAddress.state
                ? actJson.businessAddress.state
                : "");
        const taxYear = this.getTargetTaxYear(retirementDate);
        const stateRetirementTaxRule = this.getStateRetirementTaxRule(clientState, stateRetirementTaxRules);
        const federalBracketRows = federalTaxRates.filter((row) => String(row.filing_status || "").toLowerCase() === filingStatus);
        const defaultStandardDeduction = filingStatus === "married" ? 30500 : 15250;
        const standardDeduction = federalBracketRows.length > 0 && federalBracketRows[0].standard_deduction !== undefined
            ? this.toNumber(federalBracketRows[0].standard_deduction)
            : defaultStandardDeduction;
        const federalOtherIncomeAnnual = this.roundMoney((grossFERS * 12) + grossBridgeYearly + taxableTspYearly);
        const socialSecurityTaxability = this.calculateTaxableSocialSecurityAnnual(
            socialSecurityGross * 12,
            federalOtherIncomeAnnual,
            filingStatus
        );
        const taxableSocialSecurityYearly = socialSecurityTaxability.taxableAmount;
        const taxableSocialSecurityMonthly = this.roundMoney(taxableSocialSecurityYearly / 12);
        const federalAdjustedGrossIncome = this.roundMoney(federalOtherIncomeAnnual + taxableSocialSecurityYearly);
        const federalTaxableIncome = this.roundMoney(Math.max(0, federalAdjustedGrossIncome - standardDeduction));
        const federalMarginalRate = this.getMarginalTaxRate(federalTaxableIncome, federalBracketRows);

        const pensionTaxableBaseAnnual = this.getTaxableAmountForStateRule(
            grossFERS * 12,
            stateRetirementTaxRule ? stateRetirementTaxRule.tax_on_pensions : "yes"
        );
        const tspTaxableBaseAnnual = this.getTaxableAmountForStateRule(
            taxableTspYearly,
            stateRetirementTaxRule ? stateRetirementTaxRule.tax_on_ira_distributions : "yes"
        );
        const socialSecurityTaxableBaseAnnual = this.getTaxableAmountForStateRule(
            socialSecurityGross * 12,
            stateRetirementTaxRule ? stateRetirementTaxRule.tax_on_social_security : "no"
        );
        const stateTaxableComponentsAnnual = {
            fers: Math.max(0, this.roundMoney(pensionTaxableBaseAnnual)),
            bridge: Math.max(0, grossBridgeYearly),
            tsp: Math.max(0, tspTaxableBaseAnnual),
            socialSecurity: Math.max(0, socialSecurityTaxableBaseAnnual)
        };
        const stateTaxProfile = this.getStateTaxProfile(clientState, stateTaxRates, stateRetirementTaxRule, taxYear, filingStatus);
        const stateTaxCalculation = this.calculateStateTax(stateTaxableComponentsAnnual, stateTaxProfile);
        const stateTaxAllocationAnnual = stateTaxCalculation.allocationAnnual;
        const stateTaxRate = stateTaxCalculation.overallEffectiveRate;

        const fersFedTax = this.roundMoney(grossFERS * federalMarginalRate);
        const fersStateTax = this.roundMoney(stateTaxAllocationAnnual.fers / 12);
        const socialSecurityFedTax = this.roundMoney(taxableSocialSecurityMonthly * federalMarginalRate);
        const socialSecurityStateTax = this.roundMoney(stateTaxAllocationAnnual.socialSecurity / 12);
        const bridgeFedTax = this.roundMoney(grossBridge * federalMarginalRate);
        const bridgeStateTax = this.roundMoney(stateTaxAllocationAnnual.bridge / 12);
        const tspFedTax = this.roundMoney(taxableTspMonthly * federalMarginalRate);
        const tspStateTax = this.roundMoney(stateTaxAllocationAnnual.tsp / 12);
        const fersTaxMonthly = this.roundMoney(fersFedTax + fersStateTax);
        const socialSecurityTaxMonthly = this.roundMoney(socialSecurityFedTax + socialSecurityStateTax);
        const bridgeTaxMonthly = this.roundMoney(bridgeFedTax + bridgeStateTax);
        const tspTaxMonthly = this.roundMoney(tspFedTax + tspStateTax);

        const netSocialSecurity = this.roundMoney(socialSecurityGross - socialSecurityTaxMonthly);

        const netFERS = this.roundMoney(
            grossFERS -
            survivorReductionMonthly -
            healthInsuranceMonthly -
            dentalInsuranceMonthly -
            visionInsuranceMonthly -
            monthlyFegli -
            ltcInsuranceMonthly -
            fersTaxMonthly
        );

        const netTsp = this.roundMoney(tspGrossMonthly - tspTaxMonthly);
        const netBridge = this.roundMoney(grossBridge - bridgeTaxMonthly);
        const projectedNetMonthly = this.roundMoney(netFERS + netSocialSecurity + netTsp + netBridge);
        const currentBiWeeklyNet = this.roundMoney(c.currentnetincomeperpayperiod);
        const currentYearlyNet = this.roundMoney(currentBiWeeklyNet * 26);
        const currentMonthlyNet = this.roundMoney(currentYearlyNet / 12);
        const hasIncomeGap = projectedNetMonthly < currentMonthlyNet;
        const militaryPensionNet = this.roundMoney(c.militarypension);
        const vaDisabilityNet = this.roundMoney(c.vadisabilitymonthlyamt);
        const spouseSocialSecurityNet = this.roundMoney(c.spousesocialsecurityincome);
        const spousePensionNet = this.roundMoney(c.spouse_pension);

        const formattedCurrentSalary = this.formatWholeCurrency(salary);
        const formattedHigh3Salary = this.formatWholeCurrency(high3Salary);
        const formattedCurrentBiWeeklyNet = this.formatCurrency(currentBiWeeklyNet);
        const formattedCurrentYearlyNet = this.formatCurrency(currentYearlyNet);
        const formattedCurrentMonthlyNet = this.formatCurrency(currentMonthlyNet);
        const formattedYearsOfService = this.formatServiceDisplay(
            Math.floor(serviceMonthsWithSickLeave / 12),
            serviceMonthsWithSickLeave % 12
        );
        const formattedBridgeYears = bridgeActive
            ? this.formatServiceDisplay(
                Math.floor(bridgeServiceMonths / 12),
                bridgeServiceMonths % 12
            )
            : "";
        const formattedMultiplier = hasEnhancedMultiplier ? "1" : "0";
        const formattedMilitaryTime = this.formatServiceDisplay(
            Math.floor(militaryMonths / 12),
            militaryMonths % 12
        );

        // A. IDENTITY
        output["Client Name"] = actJson.fullName || "";
        output["FRC Name"] = actJson.editedBy || "";
        output["Client State"] = clientState;

        // B. DATES & AGES
        output["Client DOB"] = this.formatDate(actJson.birthday);
        output["Appt Date"] = this.formatDate(appointmentDateInput);
        output["Hire Date"] = this.formatDate(c.servicecomputationdate);
        output["Retire Date"] = this.formatDate(retirementDate);
        output["Client Age"] = clientAge;
        output["Spouse Age"] = spouseAge;
        output["Retire Age"] = retireAge;

        // C. CAREER DATA
        output["Current Salary"] = formattedCurrentSalary;
        output["High 3 Salary"] = formattedHigh3Salary;
        output["Military Time"] = formattedMilitaryTime;
        output["Sick Leave"] = this.formatCount(sickLeaveHours, 0);
        output["Years of Service"] = formattedYearsOfService;
        output["Bridge Years of Service"] = formattedBridgeYears;
        output["Multiplier"] = formattedMultiplier;

        // D. FEGLI CODES AND PREMIUMS
        output["FEGLI Code"] = activeCode;
        output["FEGLI Code Retire"] = retireCode;
        output["FEGLI Basic Now"] = activeIsWaived ? "Waived" : this.formatCurrency(activeFegli.basicCoverage);
        output["FEGLI A Now"] = activeIsWaived ? "Waived" : this.formatCurrency(activeFegli.optACoverage);
        output["FEGLI B Now"] = activeIsWaived ? "Waived" : this.formatCurrency(activeFegli.optBCoverage);
        output["FEGLI C Now"] = activeIsWaived ? "Waived" : this.formatCurrency(activeFegli.optCCoverage);
        output["FEGLI Basic Retire"] = retireIsWaived ? "Waived" : (retireIsIneligible ? "Ineligible" : this.formatCurrency(retireeFegli.basicCoverage));
        output["FEGLI A Retire"] = retireIsWaived ? "Waived" : (retireIsIneligible ? "Ineligible" : this.formatCurrency(retireeFegli.optACoverage));
        output["FEGLI B Retire"] = retireIsWaived ? "Waived" : (retireIsIneligible ? "Ineligible" : this.formatCurrency(retireeFegli.optBCoverage));
        output["FEGLI C Retire"] = retireIsWaived ? "Waived" : (retireIsIneligible ? "Ineligible" : this.formatCurrency(retireeFegli.optCCoverage));

        // E. CHECKBOXES
        output["Survivor 50"] = survivorElection.percent === 50 ? "Yes" : "Off";
        output["Survivor 25"] = survivorElection.percent === 25 ? "Yes" : "Off";
        output["Survivor 0"] = survivorElection.percent === 0 ? "Yes" : "Off";
        output["FEGLI 75"] = reduction === "75" ? "Yes" : "Off";
        output["FEGLI 50"] = reduction === "50" ? "Yes" : "Off";
        output["FEGLI 0"] = reduction === "0" ? "Yes" : "Off";
        output["Social Security 85 Fed"] = socialSecurityTaxability.taxablePercent === 85 ? "Yes" : "Off";
        output["Social Security 50 Fed"] = socialSecurityTaxability.taxablePercent === 50 ? "Yes" : "Off";
        output["Social Security State"] = stateRetirementTaxRule && String(stateRetirementTaxRule.tax_on_social_security || "").trim().toLowerCase() !== "no"
            ? "Yes"
            : "Off";

        // F. INCOME PROJECTION
        output["Pension Yearly Gross"] = this.formatCurrency(pensionYearlyGross);
        output["Gross FERS"] = this.formatCurrency(grossFERS);
        output["less Survivor Benefit"] = this.formatAccountingCurrency(survivorReductionMonthly);
        output["less Health Insurance"] = this.formatAccountingCurrency(healthInsuranceMonthly);
        output["less Dental Insurance"] = this.formatAccountingCurrency(dentalInsuranceMonthly);
        output["less Vision Insurance"] = this.formatAccountingCurrency(visionInsuranceMonthly);
        output["less FEGLI"] = (retireIsIneligible || retireIsWaived) ? "N/A" : this.formatAccountingCurrency(monthlyFegli);
        output["Fed Tax"] = this.formatTaxPercent(federalMarginalRate);
        output["State Tax"] = this.formatTaxPercent(stateTaxCalculation.effectiveRates.fers);
        output["less Taxes"] = this.formatAccountingCurrency(fersTaxMonthly);
        output["Net FERS"] = this.formatCurrency(netFERS);

        output["Age 62 Social Security"] = bridgeActive ? this.formatCurrency(age62SocialSecurityEstimate) : "";
        output["Gross Social Security"] = this.formatCurrency(socialSecurityGross);
        output["Fed Tax Social Security"] = this.formatTaxPercent(federalMarginalRate);
        output["less Fed Tax Social Security"] = this.formatAccountingCurrency(socialSecurityFedTax);
        output["State Tax Social Security"] = this.formatTaxPercent(stateTaxCalculation.effectiveRates.socialSecurity);
        output["less State Tax Social Security"] = this.formatAccountingCurrency(socialSecurityStateTax);
        output["Projected Social Security"] = bridgeActive
            ? this.formatCurrency(netBridge)
            : this.formatCurrency(netSocialSecurity);
        output["Net Social Security"] = this.formatCurrency(netSocialSecurity);
        output["Summary Net SS"] = bridgeActive
            ? this.formatCurrency(netBridge)
            : (socialSecurityActive ? this.formatCurrency(netSocialSecurity) : "");

        output["Gross Bridge"] = bridgeActive ? this.formatCurrency(grossBridge) : "";
        output["Bridge Fed Tax"] = bridgeActive ? this.formatTaxPercent(federalMarginalRate) : "";
        output["Bridge State Tax"] = bridgeActive ? this.formatTaxPercent(stateTaxCalculation.effectiveRates.bridge) : "";
        output["less Taxes Bridge"] = bridgeActive ? this.formatAccountingCurrency(bridgeTaxMonthly) : "";
        output["Net Bridge"] = bridgeActive ? this.formatCurrency(netBridge) : "";

        // G. TSP AND CURRENT CASH FLOW
        output["Current Bi-Weekly Net"] = formattedCurrentBiWeeklyNet;
        output["Current Yearly Net"] = formattedCurrentYearlyNet;
        output["Current Monthly Net"] = formattedCurrentMonthlyNet;
        output["TSP Traditional Balance"] = this.formatCurrency(tspTraditional);
        output["TSP Roth Balance"] = this.formatCurrency(tspRoth);
        output["TSP Total Balance"] = this.formatCurrency(tspTotal);
        output["TSP Balance Used"] = this.formatCurrency(tspBalanceUsed);
        output["Distribution Rate"] = this.formatPercent(distributionRate, 0);
        output["TSP Gross Yearly"] = this.formatCurrency(tspGrossYearly);
        output["TSP Gross Monthly"] = this.formatCurrency(tspGrossMonthly);
        output["Gross Taxable TSP"] = this.formatCurrency(taxableTspMonthly);
        output["Fed Tax TSP"] = this.formatTaxPercent(federalMarginalRate);
        output["State Tax TSP"] = this.formatTaxPercent(stateTaxCalculation.effectiveRates.tsp);
        output["less Federal Taxes TSP"] = this.formatAccountingCurrency(tspTaxMonthly);
        output["Net TSP"] = this.formatCurrency(netTsp);
        output["Projected FERS"] = this.formatCurrency(netFERS);
        output["Projected Net Monthly"] = this.formatCurrency(projectedNetMonthly);
        output["Net Retirement Income"] = this.formatCurrency(projectedNetMonthly);
        output["Gap Yes"] = hasIncomeGap ? "Yes" : "Off";
        output["Gap No"] = hasIncomeGap ? "Off" : "Yes";
        output["projected_net_gap_flag"] = hasIncomeGap;

        // H. PAGE 3 ASSET MAPPING
        output["Bank Liquid"] = this.formatCurrency(
            this.roundMoney(this.toNumber(c.bank) + this.toNumber(c.emergencysavings))
        );
        output["CDs or Bonds"] = this.formatCurrency(this.roundMoney(this.toNumber(c.cds) + this.toNumber(c.bonds)));
        output["Brokerage Account"] = this.formatCurrency(this.roundMoney(c.brokerageaccountsnq));
        output["Stocks NQ"] = this.formatCurrency(this.roundMoney(c.stocks));
        output["Other 401ks and IRAs"] = this.formatCurrency(this.roundMoney(c.other40ksira));
        output["Home Value"] = this.formatCurrency(this.roundMoney(c.homevalue));
        output["Mortgage"] = this.formatCurrency(this.roundMoney(c.mortgage || c.mortage));
        output["Notes"] = this.buildNotesField(c);
        output["Advisor"] = this.buildAdvisorField(actJson.rep);

        for (let index = 1; index <= 12; index += 1) {
            output[`Check Box ${index}`] = "Off";
        }

        // I. DATA PAYLOAD
        output["fegli_rate_payload"] = JSON.stringify({
            active: employeeRates,
            retire: annuitantRates,
            tax: {
                federal: federalTaxRates,
                state: stateTaxRates,
                retirement_rules: stateRetirementTaxRules,
                applied_state_rule: stateRetirementTaxRule,
                applied_state_tax_profile: {
                    tax_year: taxYear,
                    method: stateTaxCalculation.method,
                    selected_rows: stateTaxProfile.selectedRows,
                    bracket_rows: stateTaxProfile.bracketRows
                },
                applied_rates: {
                    federal_marginal_rate: federalMarginalRate,
                    state_rate: stateTaxRate,
                    state_effective_rates: stateTaxCalculation.effectiveRates
                }
            }
        });

        output.crmUpdatePayload = this.buildCrmUpdatePayload({
            output,
            clientState,
            taxYear,
            stateTaxProfile,
            stateRetirementTaxRule,
            activeCode,
            retireCode,
            grossFERS,
            netFERS,
            socialSecurityGross,
            netSocialSecurity,
            age62SocialSecurityEstimate,
            grossBridge,
            netBridge,
            tspTraditional,
            tspRoth,
            tspTotal,
            tspBalanceUsed,
            taxableTspMonthly,
            tspGrossMonthly,
            netTsp,
            projectedNetMonthly,
            currentMonthlyNet,
            pensionYearlyGross,
            monthlyFegli,
            healthInsuranceMonthly,
            dentalInsuranceMonthly,
            visionInsuranceMonthly,
            ltcInsuranceMonthly,
            distributionRate,
            federalMarginalRate,
            stateTaxRate,
            stateTaxCalculation,
            bridgeActive,
            hasIncomeGap,
            survivorReductionMonthly,
            militaryPensionNet,
            vaDisabilityNet,
            spouseSocialSecurityNet,
            spousePensionNet,
            annualLeavePayout
        });
        output["crm_update_payload"] = JSON.stringify(output.crmUpdatePayload);

        return output;
    },

    executeFinalCalculation: function(actJson, empCsv, annuitantCsv, federalTaxCsv, stateTaxCsv, stateRetirementTaxRulesInput) {
        const output = this.execute(
            actJson,
            empCsv,
            annuitantCsv,
            federalTaxCsv,
            stateTaxCsv,
            stateRetirementTaxRulesInput
        );

        return this.buildFinalCalculationResponse(output);
    },

    executeTemplate2: function(actJson, empCsv, annuitantCsv, federalTaxCsv, stateTaxCsv, stateRetirementTaxRulesInput) {
        const c = actJson.customFields || {};
        const output = this.execute(
            actJson,
            empCsv,
            annuitantCsv,
            federalTaxCsv,
            stateTaxCsv,
            stateRetirementTaxRulesInput
        );
        const payload = JSON.parse(output["fegli_rate_payload"] || "{}");
        const appliedRates = payload.tax && payload.tax.applied_rates ? payload.tax.applied_rates : {};

        const retirementDate = c.retiredate || new Date().toISOString();
        const retireAge = this.ageOnDate(actJson.birthday, retirementDate);
        const opmService = this.calculateOPMService(c.servicecomputationdate, retirementDate);
        const militaryTime = this.toNumber(c.yrsofmilitaryservice);
        const militaryMonths = this.convertYearsToWholeMonths(militaryTime);
        const sickLeaveHours = this.getSickLeaveHours(c);
        const sickLeaveMonths = Math.floor(sickLeaveHours / 174);
        const serviceMonthsWithMilitary = opmService.totalMonths + militaryMonths;
        const serviceMonthsWithSickLeave = serviceMonthsWithMilitary + sickLeaveMonths;
        const bridgeServiceMonths = Math.max(0, opmService.totalMonths + sickLeaveMonths);
        const bridgeActive = retireAge < 62;
        const hasEnhancedMultiplier = retireAge >= 62 && (serviceMonthsWithMilitary >= (20 * 12));

        const wholeCurrencyFields = [
            "Current Salary",
            "High 3 Salary",
            "Gross FERS",
            "Age 62 Social Security",
            "Gross Bridge",
            "Net Bridge",
            "Gross Social Security",
            "Projected FERS",
            "Projected Social Security",
            "Current Bi-Weekly Net",
            "Current Yearly Net",
            "TSP Traditional Balance",
            "TSP Roth Balance",
            "TSP Total Balance",
            "TSP Gross Yearly",
            "TSP Gross Monthly",
            "less Health Insurance",
            "FEGLI Basic Now",
            "FEGLI A Now",
            "FEGLI B Now",
            "FEGLI C Now",
            "FEGLI C Retire",
            "FEGLI B Retire",
            "FEGLI A Retire",
            "FEGLI Basic Retire",
            "TSP Balance Used",
            "Summary Net SS",
            "Summary Net FERS",
            "Summary Net TSP",
            "Net Retirement Income",
            "Brokerage Account",
            "Other 401ks and IRAs",
            "Home Value",
            "Mortgage",
            "Cash Checking Savings",
            "CDs Money Market Bonds"
        ];

        wholeCurrencyFields.forEach((fieldName) => {
            if (output[fieldName] === undefined || output[fieldName] === "") return;
            if (typeof output[fieldName] === "string" && /[A-Za-z]/.test(output[fieldName])) return;
            output[fieldName] = this.formatWholeCurrency(this.parseInjectedNumber(output[fieldName]));
        });

        [
            "less Survivor Benefit",
            "less Health Insurance",
            "less Dental Insurance",
            "less Vision Insurance",
            "less FEGLI"
        ].forEach((fieldName) => {
            if (output[fieldName] === undefined || output[fieldName] === "") return;
            if (typeof output[fieldName] === "string" && /[A-Za-z]/.test(output[fieldName])) return;
            output[fieldName] = this.formatWholeCurrency(this.parseInjectedNumber(output[fieldName]));
        });

        [
            "Projected Net Monthly",
            "Net FERS",
            "Net Social Security",
            "Net TSP",
            "Current Monthly Net"
        ].forEach((fieldName) => {
            if (output[fieldName] === undefined || output[fieldName] === "") return;
            output[fieldName] = this.formatTemplate2PlainNumber(this.parseInjectedNumber(output[fieldName]));
        });

        output["Summary Net FERS"] = this.formatWholeCurrency(this.parseInjectedNumber(output["Net FERS"]));
        output["Summary Net TSP"] = this.formatWholeCurrency(this.parseInjectedNumber(output["Net TSP"]));

        output["Client State"] = actJson.homeAddress && actJson.homeAddress.state
            ? actJson.homeAddress.state
            : (actJson.businessAddress && actJson.businessAddress.state
                ? actJson.businessAddress.state
                : "");

        output["Sick Leave"] = this.formatTemplate2HoursDisplay(sickLeaveHours);
        output["Years of Service"] = this.formatTemplate2ServiceDisplay(
            Math.floor(serviceMonthsWithSickLeave / 12),
            serviceMonthsWithSickLeave % 12
        );
        output["Bridge Years of Service"] = bridgeActive
            ? this.formatTemplate2ServiceDisplay(
                Math.floor(bridgeServiceMonths / 12),
                bridgeServiceMonths % 12
            )
            : "";
        output["Military Time"] = this.formatTemplate2DurationFromYears(militaryTime);
        output["Multiplier"] = hasEnhancedMultiplier ? "1.1%" : "1.0%";
        output["Distribution Rate"] = this.formatTemplate2PlainNumber(this.parseInjectedNumber(output["Distribution Rate"]));

        output["Fed Tax"] = this.formatTemplate2Rate(
            appliedRates.federal_marginal_rate !== undefined
                ? appliedRates.federal_marginal_rate
                : (this.parseInjectedNumber(output["Fed Tax"]) / 100),
            true
        );
        output["State Tax"] = this.formatTemplate2Rate(
            appliedRates.state_effective_rates && appliedRates.state_effective_rates.fers !== undefined
                ? appliedRates.state_effective_rates.fers
                : (this.parseInjectedNumber(output["State Tax"]) / 100),
            true
        );
        output["Bridge Fed Tax"] = output["Bridge Fed Tax"] === ""
            ? ""
            : this.formatTemplate2Rate(
                appliedRates.federal_marginal_rate !== undefined
                    ? appliedRates.federal_marginal_rate
                    : (this.parseInjectedNumber(output["Bridge Fed Tax"]) / 100),
                false
            );
        output["Bridge State Tax"] = output["Bridge State Tax"] === ""
            ? ""
            : this.formatTemplate2Rate(
                appliedRates.state_effective_rates && appliedRates.state_effective_rates.bridge !== undefined
                    ? appliedRates.state_effective_rates.bridge
                    : (this.parseInjectedNumber(output["Bridge State Tax"]) / 100),
                false
            );
        output["Fed Tax Social Security"] = this.formatTemplate2Rate(
            appliedRates.federal_marginal_rate !== undefined
                ? appliedRates.federal_marginal_rate
                : (this.parseInjectedNumber(output["Fed Tax Social Security"]) / 100),
            false
        );
        output["State Tax Social Security"] = this.formatTemplate2Rate(
            appliedRates.state_effective_rates && appliedRates.state_effective_rates.socialSecurity !== undefined
                ? appliedRates.state_effective_rates.socialSecurity
                : (this.parseInjectedNumber(output["State Tax Social Security"]) / 100),
            false
        );
        output["Fed Tax TSP"] = this.formatTemplate2Rate(
            appliedRates.federal_marginal_rate !== undefined
                ? appliedRates.federal_marginal_rate
                : (this.parseInjectedNumber(output["Fed Tax TSP"]) / 100),
            false
        );
        output["State Tax TSP"] = this.formatTemplate2Rate(
            appliedRates.state_effective_rates && appliedRates.state_effective_rates.tsp !== undefined
                ? appliedRates.state_effective_rates.tsp
                : (this.parseInjectedNumber(output["State Tax TSP"]) / 100),
            false
        );

        output["Ensuring"] = "Yes";
        output["Protecting"] = "Yes";
        output["Making"] = "Yes";
        output["Creating"] = "Yes";
        output["Understanding"] = "Yes";
        output["Reducing"] = "Yes";
        output["Notes"] = this.buildNotesField(c);
        output["Advisor"] = this.buildAdvisorField(actJson.rep);

        return output;
    },

    buildBlueprintResponse: function(actJson, empCsv, annuitantCsv, federalTaxCsv, stateTaxCsv, stateRetirementTaxRulesInput) {
        return {
            templateFields: this.executeTemplate2(
                actJson,
                empCsv,
                annuitantCsv,
                federalTaxCsv,
                stateTaxCsv,
                stateRetirementTaxRulesInput
            )
        };
    }
};

if (typeof module !== "undefined") {
    module.exports = PDF_Preparer_API;
}
