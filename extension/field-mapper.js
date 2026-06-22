/**
 * Act! CRM Field Mapper
 * Decodes Base64-encoded field IDs from the Act! web app DOM
 * and provides utilities to read/write field values.
 *
 * IMPORTANT: Content scripts run in an ISOLATED world — they share
 * the DOM with the page but NOT the JavaScript namespace. Act!'s
 * layout handlers (layoutOnChange, layoutBlur, etc.) live in the
 * PAGE's JS context. We trigger them by dispatching native DOM events,
 * which fire the inline event handlers (onchange, onfocus, etc.)
 * in the page's own context.
 *
 * Field ID pattern: Base64( "TBL_CONTACT.{CUST_}{FieldName}{LayoutSuffix}" )
 */

const ActFieldMapper = (() => {

    // ── Internal state ───────────────────────────────────
    let _fieldMap = {};        // fieldName → { id, element, decoded, isCustom, table }
    let _reverseMap = {};      // domId → fieldName
    let _scanCount = 0;

    // ── Base64 helpers ───────────────────────────────────
    function safeAtob(str) {
        try {
            const padded = str + '='.repeat((4 - str.length % 4) % 4);
            return atob(padded);
        } catch {
            return null;
        }
    }

    function safeBtoa(str) {
        try {
            return btoa(str).replace(/=+$/, '');
        } catch {
            return null;
        }
    }

    // ── Decode a single Act! element ID ──────────────────
    function decodeFieldId(encodedId) {
        const decoded = safeAtob(encodedId);
        if (!decoded) return null;

        // Pattern: TBL_CONTACT.CUST_FEGLICodeActiveE084820759
        //      or: TBL_CONTACT.TitleE084820759
        //      or: TBL_CONTACT.CUST_MyField_12345E084820759
        //      or: CUST_ContactTable1_021734.CUST_CalculatedLessFEGLI_012444044
        // The layout suffix is always E followed by 6+ digits at the end.
        // Table prefix can be TBL_ or CUST_ (custom tables).
        const match = decoded.match(/^(\w+)\.(CUST_)?(.+?)(?:E\d{6,})?$/);
        if (!match) return null;

        // Strip any remaining trailing _XXXXXXXX numeric suffixes from the field name
        // These are Act! internal layout/instance IDs
        let fieldName = match[3].replace(/_\d{6,}$/, '');

        return {
            raw: decoded,
            table: match[1],
            isCustom: !!match[2],
            fieldName: fieldName,
            layoutSuffix: match[4] || '',
        };
    }

    // ── Telerik RadDatePicker resolution ─────────────────
    // ACT date fields (Birth Date, SpouseDOB, RetireDate, SCD, …) render via a
    // Telerik RadDatePicker. The element whose id decodes to the field name
    // (class "AnnualEvent"/"Date") is ALWAYS EMPTY — the displayed value lives in
    // a separate visible input whose id embeds the field id as:
    //     [ctl00_viewPlaceHolder_]dtp_<base64FieldId>_dateInput
    // Find that input so we read/write the value the user actually sees.
    function findDatePickerInput(el) {
        if (!el || !el.id || !el.ownerDocument) return null;
        const doc = el.ownerDocument;
        const token = 'dtp_' + el.id;
        const direct = doc.getElementById(token + '_dateInput')
                    || doc.getElementById('ctl00_viewPlaceHolder_' + token + '_dateInput');
        if (direct) return direct;
        // General fallback: any *_dateInput whose id embeds dtp_<fieldId>
        const inputs = doc.querySelectorAll('input[id*="dtp_"][id$="_dateInput"]');
        for (const i of inputs) { if (i.id.indexOf(token) !== -1) return i; }
        return null;
    }

    // ── Effective value of a field element ───────────────
    // Returns the visible/meaningful value: the element's own value, or the
    // Telerik date-picker value when the element itself is an empty date field.
    function effectiveValue(el) {
        if (!el) return '';
        if (el.type === 'checkbox') return String(el.checked);
        const own = el.value;
        if (own && String(own).trim()) return own;
        const pick = findDatePickerInput(el);
        if (pick && String(pick.value).trim()) return pick.value;
        return own || '';
    }

    // ── Collect all documents (main + same-origin iframes) ──
    function collectDocuments() {
        const docs = [{ doc: document, label: 'main' }];
        function walkFrames(parentDoc, depth) {
            if (depth > 3) return; // safety limit
            try {
                parentDoc.querySelectorAll('iframe, frame').forEach(frame => {
                    try {
                        const fd = frame.contentDocument;
                        if (fd) {
                            docs.push({ doc: fd, label: `frame-d${depth}` });
                            walkFrames(fd, depth + 1);
                        }
                    } catch { /* cross-origin */ }
                });
            } catch {}
        }
        walkFrames(document, 1);
        return docs;
    }

    // ── Scan all inputs on the page + iframes ────────────
    function scanPage() {
        _fieldMap = {};
        _reverseMap = {};

        const docs = collectDocuments();
        let found = 0;

        for (const { doc, label } of docs) {
            const inputs = doc.querySelectorAll('input[id], select[id], textarea[id]');

            inputs.forEach(el => {
                if (!el.id || el.id.length < 10) return;

                const info = decodeFieldId(el.id);
                if (!info) return;

                const key = info.fieldName.toLowerCase();
                // Checkboxes: el.value is always "on" regardless of state —
                // capture el.checked instead so we know the actual toggle state.
                // Date fields: read the Telerik picker value (effectiveValue).
                const capturedValue = el.type === 'checkbox' ? String(el.checked) : effectiveValue(el);
                _fieldMap[key] = {
                    id: el.id,
                    element: el,
                    ownerDoc: doc,
                    frameLabel: label,
                    decoded: info.raw,
                    fieldName: info.fieldName,
                    isCustom: info.isCustom,
                    table: info.table,
                    layoutSuffix: info.layoutSuffix,
                    dateInputEl: findDatePickerInput(el),
                    value: capturedValue,
                };
                _reverseMap[el.id] = key;
                found++;
            });
        }

        _scanCount++;
        (typeof verboseDebug !== "undefined" ? verboseDebug : false) && console.log(`[ActFieldMapper] Scan #${_scanCount}: found ${found} Act! fields across ${docs.length} document(s)`);
        return _fieldMap;
    }

    // ── Get the current field map ────────────────────────
    function getFieldMap() {
        return { ..._fieldMap };
    }

    // ── Get a specific field's current value ─────────────
    function getFieldValue(fieldName) {
        if (!fieldName) return undefined;
        const entry = _fieldMap[fieldName.toLowerCase()];
        if (!entry) return undefined;
        // Checkboxes: return checked state, not the meaningless "on" value
        if (entry.element.type === 'checkbox') return String(entry.element.checked);
        // Date fields: resolve the Telerik picker value when the field is empty
        return effectiveValue(entry.element);
    }

    // ── Dispatch a native DOM event on an element ────────
    // This is the key trick: content scripts can't call page JS
    // functions directly, but dispatching events WILL trigger
    // inline handlers like onchange="layoutOnChange(this)"
    // because those handlers execute in the page's JS context.
    function fireEvent(el, eventName, opts = {}) {
        const defaults = { bubbles: true, cancelable: true };
        let evt;
        if (eventName === 'input' || eventName === 'change') {
            evt = new Event(eventName, { ...defaults, ...opts });
        } else if (eventName.startsWith('key')) {
            evt = new KeyboardEvent(eventName, { ...defaults, key: 'a', keyCode: 65, ...opts });
        } else if (eventName.startsWith('mouse') || eventName === 'click') {
            evt = new MouseEvent(eventName, { ...defaults, ...opts });
        } else {
            evt = new Event(eventName, { ...defaults, ...opts });
        }
        el.dispatchEvent(evt);
    }

    // ── Set a field's value + trigger Act! handlers ──────
    function setFieldValue(fieldName, value) {
        const entry = _fieldMap[fieldName];
        if (!entry) {
            (typeof verboseDebug !== "undefined" ? verboseDebug : false) && console.log(`[ActFieldMapper] Field "${fieldName}" not found in map`);
            return false;
        }

        const el = entry.element;
        const prevValue = el.type === 'checkbox' ? String(el.checked) : el.value;

        // ── Checkbox: set .checked, not .value ───────────────
        // Setting el.value on a checkbox has no visible effect.
        // The click event below would also toggle it incorrectly.
        if (el.type === 'checkbox') {
            // Accept all common truthy representations: true, "true", "1", "on", "yes", "Yes"
            const v = typeof value === 'string' ? value.trim().toLowerCase() : value;
            const shouldCheck = v === true || v === 'true' || v === '1' || v === 'on' || v === 'yes';
            if (el.checked !== shouldCheck) {
                el.checked = shouldCheck;
                fireEvent(el, 'change');
                fireEvent(el, 'blur');
            }
            entry.value = String(shouldCheck);
            (typeof verboseDebug !== "undefined" ? verboseDebug : false) && console.log(`[ActFieldMapper] Set checkbox ${fieldName}: ${prevValue} → ${shouldCheck} (${entry.frameLabel})`);
            return true;
        }

        // ── Select dropdown: match by value, then by visible text ──
        // The HTMLInputElement value setter doesn't apply to <select>; assign
        // directly and fall back to matching an option's label.
        if (el.tagName === 'SELECT') {
            el.value = value;
            if (el.value !== value) {
                const opt = [...el.options].find(o =>
                    o.text.trim() === String(value).trim() || o.value === String(value));
                if (opt) el.value = opt.value;
            }
            fireEvent(el, 'change');
            fireEvent(el, 'blur');
            entry.value = el.value;
            (typeof verboseDebug !== "undefined" ? verboseDebug : false) && console.log(`[ActFieldMapper] Set select ${fieldName}: "${prevValue}" → "${el.value}" (${entry.frameLabel})`);
            return true;
        }

        // ── Date picker: write the visible Telerik input ─────
        // The decoded-id element is the empty backing field; the value the user
        // sees/posts lives in dtp_<id>_dateInput. Write there (and the backing
        // field) and fire events so Telerik + ACT's handlers sync.
        const pickEl = findDatePickerInput(el);
        if (pickEl) {
            const pWin = pickEl.ownerDocument.defaultView || window;
            const pSetter = Object.getOwnPropertyDescriptor(pWin.HTMLInputElement.prototype, 'value')?.set;
            const writeNative = (target, v) => { if (pSetter) pSetter.call(target, v); else target.value = v; };

            fireEvent(pickEl, 'focus');
            fireEvent(pickEl, 'click');
            writeNative(pickEl, value);
            pickEl.setAttribute('value', value);
            fireEvent(pickEl, 'input');
            fireEvent(pickEl, 'keyup');
            fireEvent(pickEl, 'change');
            fireEvent(pickEl, 'blur');

            // Mirror onto the backing ACT field so server-side reads agree.
            writeNative(el, value);
            el.setAttribute('value', value);
            fireEvent(el, 'change');
            fireEvent(el, 'blur');

            entry.value = value;
            (typeof verboseDebug !== "undefined" ? verboseDebug : false) && console.log(`[ActFieldMapper] Set date ${fieldName}: "${prevValue}" → "${value}" via picker (${entry.frameLabel})`);
            return true;
        }

        // Step 1: Focus the field (triggers onfocus → layoutFocus)
        fireEvent(el, 'focus');
        fireEvent(el, 'click');

        // Step 2: Set the new value on the DOM property
        // Use the native setter FROM THE ELEMENT'S OWN WINDOW to properly
        // trigger internal hooks (critical for cross-iframe elements).
        const elWindow = el.ownerDocument.defaultView || window;
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            elWindow.HTMLInputElement.prototype, 'value'
        )?.set;
        const nativeTextareaSetter = Object.getOwnPropertyDescriptor(
            elWindow.HTMLTextAreaElement.prototype, 'value'
        )?.set;

        if (el.tagName === 'TEXTAREA' && nativeTextareaSetter) {
            nativeTextareaSetter.call(el, value);
        } else if (nativeInputValueSetter) {
            nativeInputValueSetter.call(el, value);
        } else {
            el.value = value;
        }

        // Step 3: Also set the attribute for frameworks that read it
        el.setAttribute('value', value);

        // Step 4: Fire input event (triggers onkeyup → layoutKeyup)
        fireEvent(el, 'input');
        fireEvent(el, 'keyup');
        fireEvent(el, 'keydown');

        // Step 5: Fire change event (triggers onchange → layoutOnChange)
        fireEvent(el, 'change');

        // Step 6: Blur to finalize (triggers onblur → layoutBlur)
        fireEvent(el, 'blur');

        // Update cached value
        entry.value = value;

        (typeof verboseDebug !== "undefined" ? verboseDebug : false) && console.log(`[ActFieldMapper] Set ${fieldName}: "${prevValue}" → "${value}" (${entry.frameLabel})`);
        return true;
    }

    // ── Bulk set multiple fields at once ──────────────────
    function setFields(fieldValueMap) {
        const results = {};
        for (const [field, value] of Object.entries(fieldValueMap)) {
            results[field] = setFieldValue(field, value);
        }
        return results;
    }

    // ── Targeted scan: only look for a specific set of field keys ──
    // Use this instead of scanPage() when you only need a few known fields.
    // Does NOT reset _fieldMap — merges results into the existing map.
    // Much faster than a full scan when you know exactly what you need.
    function scanFields(keys) {
        const keySet = new Set(keys.map(k => k.toLowerCase()));
        const found = {};

        const docs = collectDocuments();
        for (const { doc, label } of docs) {
            const inputs = doc.querySelectorAll('input[id], select[id], textarea[id]');
            inputs.forEach(el => {
                if (!el.id || el.id.length < 10) return;
                const info = decodeFieldId(el.id);
                if (!info) return;
                const key = info.fieldName.toLowerCase();
                if (!keySet.has(key)) return; // skip irrelevant fields
                // Checkboxes: el.value is always "on" — capture el.checked instead.
                // Date fields: read the Telerik picker value (effectiveValue).
                const capturedValue = el.type === 'checkbox' ? String(el.checked) : effectiveValue(el);
                _fieldMap[key] = {
                    id: el.id, element: el, ownerDoc: doc, frameLabel: label,
                    decoded: info.raw, fieldName: info.fieldName,
                    isCustom: info.isCustom, table: info.table,
                    layoutSuffix: info.layoutSuffix || '',
                    dateInputEl: findDatePickerInput(el),
                    value: capturedValue,
                };
                _reverseMap[el.id] = key;
                found[key] = true;
            });
        }
        (typeof verboseDebug !== "undefined" ? verboseDebug : false) && console.log(`[ActFieldMapper] scanFields: found ${Object.keys(found).length}/${keys.length} requested fields`);
        return _fieldMap;
    }


    // ── Get all field names and current values ───────────
    function snapshot() {
        const snap = {};
        for (const [name, entry] of Object.entries(_fieldMap)) {
            // Checkboxes: use checked state, not the always-"on" value.
            // Date fields: resolve the Telerik picker value.
            const val = entry.element.type === 'checkbox'
                ? String(entry.element.checked)
                : effectiveValue(entry.element);
            snap[name] = {
                value: val,
                isCustom: entry.isCustom,
                table: entry.table,
                frame: entry.frameLabel,
            };
        }
        return snap;
    }

    // ── Extract the contact ID from the current URL ──────
    function getContactId() {
        // Check main window URL
        let match = window.location.search.match(/[?&]id=([a-f0-9-]{36})/i);
        if (match) return match[1];

        // Also check iframe URLs
        try {
            document.querySelectorAll('iframe, frame').forEach(frame => {
                try {
                    const url = frame.contentWindow?.location?.search || '';
                    const m = url.match(/[?&]id=([a-f0-9-]{36})/i);
                    if (m) match = m;
                } catch {}
            });
        } catch {}
        return match ? match[1] : null;
    }

    // ── Extract the database name from the URL ───────────
    function getDatabaseName() {
        const dbMatch = window.location.search.match(/[?&]dbname=([^&]+)/i)
                     || window.location.pathname.match(/\/([A-Z]\d{12,})\//i)
                     || window.location.href.match(/database[=\/]([^&\/]+)/i);
        return dbMatch ? dbMatch[1] : null;
    }

    // ── Find fields by partial name match ────────────────
    function findFields(partialName) {
        const results = {};
        const lower = partialName.toLowerCase();
        for (const [name, entry] of Object.entries(_fieldMap)) {
            if (name.toLowerCase().includes(lower)) {
                results[name] = entry;
            }
        }
        return results;
    }

    // ── Broadcast field data to the top frame ────────────
    // Called from iframe instances to send scanned field
    // data up to the top frame for the panel to consume.
    function broadcastToParent() {
        if (window === window.top) return; // already top frame

        const serialized = {};
        for (const [name, entry] of Object.entries(_fieldMap)) {
            // Checkboxes: broadcast checked state, not the always-"on" value.
            // Date fields: resolve the Telerik picker value.
            const val = entry.element
                ? (entry.element.type === 'checkbox' ? String(entry.element.checked) : effectiveValue(entry.element))
                : (entry.value || '');
            serialized[name] = {
                fieldName: entry.fieldName,
                value: val,
                isCustom: entry.isCustom,
                table: entry.table,
                id: entry.id,
                decoded: entry.decoded,
            };
        }

        const count = Object.keys(serialized).length;
        if (count === 0) return;

        (typeof verboseDebug !== "undefined" ? verboseDebug : false) && console.log(`[ActFieldMapper] Broadcasting ${count} fields to top frame`);
        window.top.postMessage({
            type: 'ACT_COPILOT_FIELDS',
            fields: serialized,
        }, '*');
    }

    // ── Get the raw DOM element for a field ─────────────
    function getFieldElement(fieldName) {
        return _fieldMap[fieldName.toLowerCase()]?.element || null;
    }

    // ── Focus a field and scroll it into view ────────────
    function focusField(fieldName) {
        const el = _fieldMap[fieldName.toLowerCase()]?.element;
        if (!el) return false;
        try {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.focus();
            // Highlight briefly so user sees which field needs attention
            const origOutline = el.style.outline;
            el.style.outline = '2px solid #f59e0b';
            el.style.transition = 'outline 0.3s';
            setTimeout(() => { el.style.outline = origOutline; }, 2500);
        } catch {}
        return true;
    }

    // ── Get all registered field names ────────────────────
    function getFieldNames() {
        return Object.keys(_fieldMap);
    }

    // ── Public API ───────────────────────────────────────
    return {
        scanPage,
        scanFields,
        getFieldMap,
        getFieldNames,
        getFieldValue,
        getFieldElement,
        focusField,
        setFieldValue,
        setFields,
        snapshot,
        getContactId,
        getDatabaseName,
        findFields,
        decodeFieldId,
        broadcastToParent,
        _safeAtob: safeAtob,
        _safeBtoa: safeBtoa,
    };

})();

// Make available globally for console debugging
window.ActFieldMapper = ActFieldMapper;

// ── Auto-scan and broadcast if running inside an iframe ──
// Each iframe scans its own document and posts the results
// to the top frame so the Copilot panel can display them.
if (window !== window.top) {
    setTimeout(() => {
        const fieldMap = ActFieldMapper.scanPage();
        const count = Object.keys(fieldMap).length;
        if (count > 0) {
            ActFieldMapper.broadcastToParent();
        }
    }, 2500);

    // Listen for re-scan requests from the top frame
    // (triggered when user navigates to a different contact)
    window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'ACT_COPILOT_RESCAN') {
            (typeof verboseDebug !== "undefined" ? verboseDebug : false) && console.log('[ActFieldMapper] Re-scan requested by top frame');
            const fieldMap = ActFieldMapper.scanPage();
            const count = Object.keys(fieldMap).length;
            if (count > 0) {
                ActFieldMapper.broadcastToParent();
            }
        }
    });
}

