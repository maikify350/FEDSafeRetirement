/**
 * FedSafe Retirement Copilot — Content Script
 * Injects the side panel with 3 tabs:
 *   1. Insights  — Contact card + enrichment links + intel
 *   2. Fields    — Field scanner, viewer, inline editor
 *   3. Rules     — Auto-fill rules engine (persisted to chrome.storage)
 *
 * Runs in ALL frames (via all_frames: true in manifest).
 * Panel UI only renders in the TOP frame.
 * The Calculate button trap runs in EVERY frame (it lives in an iframe).
 */

(function () {
    'use strict';

    // Calculate button trap — only relevant on the contact detail page
    setTimeout(() => trapCalculateButton(), 2000);

    // ORA report label trap — intercepts green PDF label clicks in the ORA tab
    setTimeout(() => trapOraReportLabels(), 2500);

    // Calculate Retirement button trap
    setTimeout(() => trapCalculateRetirementButton(), 2500);

    // Final Calculation button trap (Income tab)
    setTimeout(() => trapFinalCalculationButton(), 2500);

    // Blueprint PDF button trap (Income tab)
    setTimeout(() => trapBlueprintButton(), 2500);

    // Auto-compute Years/Months of Service from SCD & RetireDate (LES Info tab)
    setTimeout(() => startServiceYearsAutoCompute(), 3000);

    // Auto-compute Age (Years/Months) from Birthday → AgeYY / AgeMM
    setTimeout(() => startAgeAutoCompute(), 3000);

    // ─── FEGLI Code Validator: runs in ALL frames ─────────
    // The FEGLI code input lives in a cross-origin iframe.
    // The top frame can't access the element, so we poll the
    // value here in the iframe and postMessage to the top frame.
    if (window !== window.top) {
        // FEGLI validator only needed on the contact detail page
        if (window.location.href.includes('Contacts/ContactDetail.aspx')) {
            setTimeout(() => startIframeFegliValidator(), 3000);
        }

        // ── Listen for commands from top frame ───────────────
        // Guard: only accept messages from the same Act! origin.
        const _iframeActOrigin = window.location.origin;
        window.addEventListener('message', (evt) => {
            if (!evt.data || !evt.data.type) return;
            if (evt.origin && evt.origin !== _iframeActOrigin && !evt.origin.endsWith('.act.com')) return;

            // Top frame requesting a fresh field scan + broadcast
            if (evt.data.type === 'ACT_COPILOT_RESCAN') {
                const freshMap = ActFieldMapper.scanPage();
                const fields = {};
                for (const [k, v] of Object.entries(freshMap)) {
                    fields[k] = { value: v.value, label: v.label, isCustom: v.isCustom };
                }
                window.top.postMessage({ type: 'ACT_COPILOT_FIELDS', fields }, _iframeActOrigin);
                verboseDebug && console.log('[Copilot/iframe] RESCAN → broadcasting', Object.keys(fields).length, 'fields');
                return;
            }

            // Top frame setting field values into the iframe DOM
            if (evt.data.type === 'ACT_COPILOT_SET_FIELDS') {
                const fieldValues = evt.data.fields || {};
                const results = {};
                // Re-scan first so _fieldMap has fresh element refs
                ActFieldMapper.scanPage();
                for (const [key, val] of Object.entries(fieldValues)) {
                    results[key] = ActFieldMapper.setFieldValue(key, String(val));
                }
                // Only respond if this frame owns at least one of the requested fields.
                // Frames with no matching fields (e.g. tabFEGLI tab) stay silent so they
                // don't overwrite the ContactDetail iframe's successful results with all-false.
                const anyFound = Object.values(results).some(v => v === true);
                if (anyFound) {
                    window.top.postMessage({ type: 'ACT_COPILOT_SET_RESULTS', results }, _iframeActOrigin);
                    verboseDebug && console.log('[Copilot/iframe] SET_FIELDS applied:', results);
                } else {
                    verboseDebug && console.log('[Copilot/iframe] SET_FIELDS: no matching fields in this frame — skipping response');
                }
            }
        });
    }

    // ─── Shared DOM Locator ────────────────────────────
    // Scans all visible text-bearing elements for an exact text match.
    // Used by both trapCalculateButton and trapOraReportLabels.
    function findElementByText(targetText) {
        const candidates = document.querySelectorAll(
            'div, button, td, span, a, input[type="button"], input[type="submit"]'
        );
        for (const el of candidates) {
            const text = (el.value || el.textContent || '').trim();
            if (text === targetText) return el;
        }
        return null;
    }

    // ─── Panel UI: TOP FRAME ONLY ────────────────────────
    const isTopFrame = (window === window.top);

    // ─── Global Settings (declared here, before the isTopFrame guard,
    //     because hoisted functions like trapCalculateButton and
    //     startAgeAutoCompute reference them and run in ALL frames
    //     via setTimeout) ─────────────────────────────────
    let verboseDebug     = false;
    let showNotification = true;

    if (!isTopFrame) return; // everything below is top-frame only


    if (document.getElementById('act-copilot-root')) return;

    // ─── Config ───────────────────────────────────────────
    // All Act! CRM API calls are proxied through the FedSafe backend for security.
    // Calls are routed through the background service worker which is CORS-exempt
    // in Chrome extensions — content scripts run in the page origin (appus.act.com)
    // and would be blocked by CORS if they called Vercel directly.
    const PROXY_BASE = 'https://fedsafe-retirement.vercel.app/api/proxy/act';

    /**
     * Route an API call through the background service worker.
     * Background scripts are CORS-exempt so this avoids cross-origin
     * blocks when the content script runs on appus.act.com.
     */
    function bgFetch(path, method = 'GET', body = null) {
        return new Promise((resolve, reject) => {
            const msg = { type: 'api_call', method, path };
            if (body) msg.body = body;
            chrome.runtime.sendMessage(msg, (res) => {
                if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
                if (!res || !res.ok) return reject(new Error(res?.error || `HTTP ${res?.status || 'unknown'}`));
                resolve(res.data);
            });
        });
    }

    async function actProxyFetch(path) {
        return bgFetch('/api/proxy/act' + path);
    }

    // ─── State ───────────────────────────────────────────
    let currentTab = 'insights';
    let fieldMap = {};
    let rules = [];
    let token = null;
    let apiContactData = null;  // cached API response for the API Data tab
    let _cachedRetiredFegliCost = null;  // cached from Retirement calc for Income tab FEGLI

    // verboseDebug and showNotification are declared above the isTopFrame
    // guard (see line ~103) so they're available in all frames.

    // ─── Build the UI ────────────────────────────────────
    const root = document.createElement('div');
    root.id = 'act-copilot-root';
    root.innerHTML = buildPanelHTML();
    document.body.appendChild(root);

    // ─── Inject trigger button into Act! toolbar ─────────
    injectTriggerButton();

    // ─── Wire up events ──────────────────────────────────
    wireEvents();

    // ─── Load saved rules ────────────────────────────────
    loadRules();

    // ─── Pre-fetch valid FEGLI codes for inline validation ─
    // Runs async in background; does not block extension startup
    setTimeout(() => loadFegliCodes(), 3000); // after scan completes


    // ─── Initial Data Load ──────────────────────────────
    // Refresh contact data from API via proxy on startup
    loadContactData();

    // ─── FEGLI Code Validation ───────────────────────────
    // ALL code knowledge comes from the API — never hardcoded inline.
    // Source: https://fedsafe-retirement.vercel.app/api/proxy/fegli-codes
    let validFegliCodes   = [];   // full list from API: ["C0","E1",...]
    let validFegliLetters = [];   // valid first chars from API: ["C","D",...]
    let validFegliDigits  = [];   // valid second chars derived from API codes
    let fegliCodeExamples = [];   // 3 sample codes for UI hints (from API)
    let fegliCodesLoaded  = false;      // true once API responds with valid data
    let suppressFegliValidation = false; // suppressed during programmatic Apply

    async function loadFegliCodes() {
        try {
            // Route through the background service worker — background scripts are
            // CORS-exempt in Chrome extensions, so no server-side CORS config needed.
            const result = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage(
                    { type: 'api_call', method: 'GET', path: '/api/proxy/fegli-codes?extended=true' },
                    (res) => {
                        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
                        if (!res || !res.ok) return reject(new Error(res?.error || `HTTP ${res?.status || 'unknown'}`));
                        resolve(res.data);
                    }
                );
            });
            validFegliCodes   = result.codes   || [];
            validFegliLetters = result.letters || [];
            // Always merge with FEGLI_API to guarantee complete OPM set.
            // The Vercel API returned only 51 codes (missing bMult=5 / W-Z group).
            if (typeof FEGLI_API !== 'undefined' && FEGLI_API.getValidCodes) {
                const localCodes = FEGLI_API.getValidCodes();
                validFegliCodes = [...new Set([...localCodes, ...validFegliCodes])];
            }
            // Derive valid digits from the merged list (no hardcoding)
            validFegliDigits  = [...new Set(validFegliCodes.map(c => c[1]).filter(Boolean))].sort();
            // Pick 3 real examples from the merged list for UI hints
            fegliCodeExamples = validFegliCodes.filter(c => c.length === 2).slice(0, 3);
            fegliCodesLoaded  = validFegliCodes.length > 0;
            verboseDebug && console.log(`%c[Copilot] ✅ Loaded ${validFegliCodes.length} FEGLI codes (API+local)`, 'color:lime;font-weight:bold');
        } catch (e) {
            verboseDebug && console.log(`%c[Copilot] ⚠ FEGLI codes API unavailable: ${e.message} — using local engine fallback`, 'color:orange;font-weight:bold');
            // Fallback: generate valid codes using the FEGLI_API engine already in the extension.
            // This is the same OPM letter math as the server — no inline code lists in content.js.
            if (typeof FEGLI_API !== 'undefined' && FEGLI_API.getValidCodes) {
                const fallbackCodes = FEGLI_API.getValidCodes();
                validFegliCodes   = fallbackCodes;
                validFegliLetters = [...new Set(fallbackCodes.map(c => c[0]))].sort();
                validFegliDigits  = [...new Set(fallbackCodes.map(c => c[1]).filter(Boolean))].sort();
                fegliCodeExamples = fallbackCodes.slice(0, 3);
                fegliCodesLoaded  = true;
                verboseDebug && console.log(`%c[Copilot] ✅ FEGLI fallback: ${fallbackCodes.length} codes from local engine`, 'color:yellow;font-weight:bold');
            }
            // Still retry against the API in 15s — when Vercel is fixed it takes over
            if (!fegliCodesLoaded) {
                setTimeout(() => loadFegliCodes(), 15_000);
            }
        }
    }


    // ── Validation modal: shows error, focuses field on close ──
    // fieldsToFocus: array of fieldName strings
    // onClose: optional callback when modal is dismissed
    function showValidationModal(title, lines, fieldsToFocus = [], onClose = null, buttonLabel = '') {
        document.getElementById('cp-validation-modal')?.remove();

        const btnText = buttonLabel || (fieldsToFocus.length ? 'OK \u2014 Take Me There' : 'Close');

        const modal = document.createElement('div');
        modal.id = 'cp-validation-modal';
        modal.style.cssText = `
            position:fixed;top:0;left:0;width:100vw;height:100vh;
            background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);
            z-index:10010;display:flex;align-items:center;justify-content:center;
            font-family:'Outfit',-apple-system,sans-serif;
            animation:cp-fade-in 0.2s ease;
        `;
        modal.innerHTML = `
            <div style="background:linear-gradient(135deg,#0f172a,#1e293b);
                border:1px solid rgba(239,68,68,0.4);border-radius:18px;
                padding:28px;width:380px;box-shadow:0 20px 60px rgba(0,0,0,0.5);color:#e2e8f0">
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
                    <div style="width:40px;height:40px;border-radius:12px;
                        background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);
                        display:flex;align-items:center;justify-content:center;font-size:20px">\u26a0\ufe0f</div>
                    <div style="font-size:17px;font-weight:700;color:#f87171">${title}</div>
                </div>
                <div style="font-size:13px;color:#94a3b8;margin-bottom:18px;line-height:1.6">
                    ${lines.map(l => `<div style="margin-bottom:4px">\u2022 ${l}</div>`).join('')}
                </div>
                ${(!buttonLabel && fieldsToFocus.length) ? `<div style="font-size:11px;color:#64748b;margin-bottom:14px">
                    Pressing OK will clear the field and set focus to it.
                </div>` : ''}
                <button id="cp-validation-ok" style="
                    width:100%;padding:11px;border-radius:10px;border:none;
                    background:linear-gradient(135deg,#dc2626,#f87171);
                    color:#fff;font-size:13px;font-weight:700;
                    cursor:pointer;font-family:Outfit,sans-serif;
                    display:flex;align-items:center;justify-content:center;">${btnText}</button>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('cp-validation-ok').onclick = () => {
            modal.remove();
            if (onClose) {
                setTimeout(onClose, 150);
            } else if (fieldsToFocus.length > 0) {
                setTimeout(() => ActFieldMapper.focusField(fieldsToFocus[0]), 150);
            }
        };
    }


    // ─── Auto-scan fields after short delay ──────────────
    setTimeout(() => {
        fieldMap = ActFieldMapper.scanPage();
    }, 2000);



    // ─── Watch for contact navigation (SPA) ──────────────
    // Event-driven: intercept history.pushState/replaceState
    // + popstate/hashchange. Zero polling overhead.
    let _lastContactId = ActFieldMapper.getContactId();

    function onContactChanged() {
        const currentId = ActFieldMapper.getContactId();
        if (!currentId || currentId === _lastContactId) return;

        verboseDebug && console.log(`[Copilot] Contact changed: ${_lastContactId} → ${currentId}`);
        _lastContactId = currentId;

        // Reset state
        fieldMap = {};
        apiContactData = null;
        token = null; // Force fresh token on next API call
        _tokenTimestamp = 0;

        // Update the contact ID display
        const idEl = document.getElementById('cp-contact-id');
        if (idEl) idEl.textContent = currentId;

        // Reset contact card
        const nameEl = document.getElementById('cp-contact-name');
        const compEl = document.getElementById('cp-company');
        if (nameEl) nameEl.textContent = '⏳ Loading...';
        if (compEl) compEl.textContent = '—';

        // Reset API Data tab
        // API Data tab: clear stale data but do NOT auto-fetch — user must click Reload from API
        const apiList = document.getElementById('cp-api-list');
        const apiCount = document.getElementById('cp-api-count');
        apiContactData = null;
        if (apiList) apiList.innerHTML = '';
        if (apiCount) apiCount.textContent = 'Contact changed — click "Reload from API" to load data';

        // Reset Fields tab
        const fieldList = document.getElementById('cp-field-list');
        const fieldCount = document.getElementById('cp-field-count');
        if (fieldList) fieldList.innerHTML = '';
        if (fieldCount) fieldCount.textContent = 'Re-scanning...';

        // Update database name
        const db = ActFieldMapper.getDatabaseName();
        if (db) document.getElementById('cp-db-name').textContent = `Database: ${db}`;

        // Re-load contact card if panel is open
        const panel = document.getElementById('cp-panel');
        if (panel && panel.classList.contains('active')) {
            loadContactData();
        }

        // Re-scan fields in top frame after iframe loads
        setTimeout(() => {
            fieldMap = ActFieldMapper.scanPage();
            renderFieldList();
        }, 2000);

        // Tell child iframes to re-scan and broadcast their fields
        setTimeout(() => {
            document.querySelectorAll('iframe, frame').forEach(frame => {
                try {
                    frame.contentWindow.postMessage({ type: 'ACT_COPILOT_RESCAN' }, '*');
                } catch (e) { /* cross-origin, skip */ }
            });
        }, 2500);
    }

    // Listen for standard navigation events
    window.addEventListener('popstate', () => setTimeout(onContactChanged, 100));
    window.addEventListener('hashchange', () => setTimeout(onContactChanged, 100));

    // Poll for contact changes — Act! navigates via iframe reloads,
    // not pushState. Just a string comparison every 2s — negligible cost.
    setInterval(onContactChanged, 2000);

    // ─── Listen for messages from child iframes ────────────
    // Guard: only accept messages from the same Act! origin (iframe → top frame).
    // Rejects spoofed postMessages from unrelated extensions or pages.
    const ACT_ORIGIN = window.location.origin; // e.g. https://yourcompany.act.com
    window.addEventListener('message', (event) => {
        if (!event.data || !event.data.type) return;
        if (event.origin && event.origin !== ACT_ORIGIN && !event.origin.endsWith('.act.com')) return;

        // Calculate button clicked in an iframe
        if (event.data.type === 'ACT_COPILOT_CALCULATE') {
            verboseDebug && console.log('[Copilot] Calculate triggered from iframe');
            showCalculateDialog();
        }

        // ORA green label clicked in an iframe — show PDF generation dialog
        if (event.data.type === 'ACT_COPILOT_GENERATE_PDF') {
            verboseDebug && console.log('[Copilot] ORA PDF label clicked:', event.data.formName);
            showPdfGenerateDialog(event.data.formName, event.data.formLabel);
        }

        // Calculate Retirement button clicked in an iframe
        if (event.data.type === 'ACT_COPILOT_CALCULATE_RETIREMENT') {
            verboseDebug && console.log('[Copilot] Calculate Retirement triggered from iframe');
            showRetirementDialog();
        }

        // Final Calculation button clicked in an iframe
        if (event.data.type === 'ACT_COPILOT_CALCULATE_FINAL') {
            verboseDebug && console.log('[Copilot] Final Calculation triggered from iframe');
            showFinalCalcDialog();
        }

        // Blueprint PDF button clicked in an iframe
        if (event.data.type === 'ACT_COPILOT_BLUEPRINT') {
            verboseDebug && console.log('[Copilot] Blueprint triggered from iframe');
            showPdfGenerateDialog('BLUEPRINT', 'Blueprint Retirement Report');
        }

        // FEGLI code validated as INVALID in the iframe — verify here before acting.
        if (event.data.type === 'ACT_COPILOT_FEGLI_INVALID') {
            const code = (event.data.code || '').toUpperCase();

            // Suppress during programmatic Apply — setFieldValue fires blur which
            // triggers the iframe validator. The applied value is always valid.
            if (suppressFegliValidation) {
                verboseDebug && console.log(`[Copilot] Iframe flagged "${code}" invalid — suppressed (Apply in progress)`);
                return;
            }

            // If codes haven't loaded yet, silently defer — we can't validate fairly.
            // This prevents false-positives on page refresh when the API call is still in-flight.
            if (!fegliCodesLoaded) {
                verboseDebug && console.log(`[Copilot] Iframe flagged "${code}" invalid but codes not loaded yet — deferring`);
                return;
            }

            // Cross-check against the top frame's own code list (which has the FEGLI_API fallback).
            // If the top frame says it IS valid, the iframe had a stale/empty list — ignore it.
            if (validFegliCodes.includes(code)) {
                verboseDebug && console.log(`[Copilot] Iframe flagged "${code}" invalid but top-frame list confirms it valid — ignoring`);
                return;
            }

            verboseDebug && console.log(`[Copilot] Invalid FEGLI code from iframe: "${code}"`);

            const letter = code.charAt(0);
            const digit  = code.length > 1 ? code.charAt(1) : '';
            // All validation uses API-sourced data — no hardcoded code tables
            const badLetter = validFegliLetters.length > 0 && !validFegliLetters.includes(letter);
            const badDigit  = validFegliDigits.length > 0 && digit && !validFegliDigits.includes(digit);
            const validDigitRange = validFegliDigits.length > 0
                ? `${validFegliDigits[0]}–${validFegliDigits[validFegliDigits.length - 1]}`
                : 'valid range';
            const exampleCodes = fegliCodeExamples.length > 0 ? fegliCodeExamples.join(', ') : 'see API';
            const totalCodes   = validFegliCodes.length || 'unknown';
            const hint = badLetter
                ? `"${letter}" is not a valid OPM letter. Valid: ${validFegliLetters.join(', ')}`
                : badDigit
                ? `"${digit}" is not a valid multiplier. Valid range: ${validDigitRange}`
                : `"${code}" does not match any of the ${totalCodes} valid OPM codes.`;

            showValidationModal(
                'Invalid FEGLI Code',
                [`<b style="color:#fca5a5">${code}</b> is not a valid FEGLI code.`, hint,
                 `Valid format: [Letter][digit]  e.g. ${exampleCodes}`],
                ['feglicodeactive'],
                // On close: tell iframe to clear + focus the field
                () => {
                    // Broadcast to all child frames
                    document.querySelectorAll('iframe, frame').forEach(f => {
                        try { f.contentWindow.postMessage({ type: 'ACT_COPILOT_FEGLI_CLEAR' }, '*'); } catch {}
                    });
                }
            );
        }

        // Field data broadcast from an iframe
        if (event.data.type === 'ACT_COPILOT_FIELDS') {
            const iframeFields = event.data.fields;
            const count = Object.keys(iframeFields).length;
            verboseDebug && console.log(`[Copilot] Received ${count} fields from iframe`);

            // Merge into our top-frame fieldMap (iframe fields take priority
            // since that's where the actual contact form lives)
            for (const [name, data] of Object.entries(iframeFields)) {
                fieldMap[name] = {
                    ...data,
                    // Mark as iframe-sourced (no element ref available)
                    element: null,
                    frameLabel: 'iframe',
                };
            }

            // If we have a cached Retired FEGLI Cost and this iframe has the
            // Income tab's 'fegli' field, push the value back to that iframe
            if (_cachedRetiredFegliCost && iframeFields['fegli'] !== undefined) {
                const val = String(_cachedRetiredFegliCost);
                verboseDebug && console.log(`[Copilot] Income tab iframe detected with 'fegli' field — pushing cached $${val}`);
                if (event.source) {
                    event.source.postMessage({
                        type: 'ACT_COPILOT_SET_FIELDS',
                        fields: { fegli: val },
                    }, '*');
                }
            }

            // Auto-populate contact card from the received fields
            // Act! stores the name as a combined "Contact" field (e.g. "Ricardo Garcia")
            // FirstName/LastName are only in the name-edit popup dialog.
            let fullName = iframeFields['Contact']?.value
                        || iframeFields['ContactName']?.value
                        || iframeFields['Name']?.value || '';

            // Fallback: try separate fields if they exist
            if (!fullName) {
                const first = iframeFields['FirstName']?.value
                           || iframeFields['first_name']?.value || '';
                const last  = iframeFields['LastName']?.value
                           || iframeFields['last_name']?.value || '';
                fullName = `${first} ${last}`.trim();
            }

            const company = iframeFields['Company']?.value
                         || iframeFields['CompanyName']?.value || '';

            if (fullName) {
                const nameEl = document.getElementById('cp-contact-name');
                const compEl = document.getElementById('cp-company');
                if (nameEl) nameEl.textContent = fullName;
                if (compEl) compEl.textContent = company || '—';

                // Parse first/last for search links
                const parts = fullName.split(/\s+/);
                const firstName = parts[0] || '';
                const lastName = parts.length > 1 ? parts[parts.length - 1] : '';
                setupSearchLinks(firstName, lastName, company);
            }
        }
    });

    // ═══════════════════════════════════════════════════════
    //  HTML Template
    // ═══════════════════════════════════════════════════════

    function buildPanelHTML() {
        return `
        <div class="cp-panel" id="cp-panel">
            <!-- Header -->
            <div class="cp-header">
                <div class="cp-header-row">
                    <span class="cp-badge">⚡ Copilot</span>
                    <button class="cp-close" id="cp-close">&times;</button>
                </div>
                <h1 class="cp-title">FedSafe Retirement Copilot</h1>
                <p class="cp-subtitle" id="cp-db-name">FedSafe Retirement</p>
            </div>

            <!-- Tabs -->
            <div class="cp-tabs">
                <div class="cp-tab active" data-tab="insights">Insights</div>
                <div class="cp-tab" data-tab="fields">Fields</div>
                <div class="cp-tab" data-tab="apidata">API Data</div>
                <div class="cp-tab" data-tab="rules">Rules</div>
            </div>

            <!-- Tab Content -->
            <div class="cp-tab-content">

                <!-- ── Insights Tab ───────────────────── -->
                <div class="cp-tab-panel active" id="tab-insights">
                    <div class="cp-contact-card">
                        <div class="cp-field-row">
                            <div class="cp-label">Contact</div>
                            <div class="cp-value" id="cp-contact-name">—</div>
                        </div>
                        <div class="cp-field-row">
                            <div class="cp-label">Company</div>
                            <div class="cp-value" id="cp-company">—</div>
                        </div>
                        <div class="cp-field-row">
                            <div class="cp-label">Contact ID</div>
                            <div class="cp-value" id="cp-contact-id" style="font-size:11px;font-family:monospace;color:var(--cp-text-dim)">—</div>
                        </div>
                    </div>

                    <div class="cp-section-title"><span class="cp-dot"></span>Enrichment Tools</div>
                    <div class="cp-search-group">
                        <div class="cp-search-btn" id="cp-search-google">
                            <img src="https://www.google.com/favicon.ico" alt="G" />
                            <span>GOOGLE</span>
                        </div>
                        <div class="cp-search-btn" id="cp-search-linkedin">
                            <img src="https://www.linkedin.com/favicon.ico" alt="LI" />
                            <span>LINKEDIN</span>
                        </div>
                        <div class="cp-search-btn" id="cp-search-youtube">
                            <img src="https://www.youtube.com/favicon.ico" alt="YT" />
                            <span>YOUTUBE</span>
                        </div>
                    </div>

                    <div class="cp-section-title"><span class="cp-dot"></span>Intelligence</div>
                    <div id="cp-intel-list">
                        <div class="cp-intel-item">
                            <div class="cp-intel-icon">📊</div>
                            <p class="cp-intel-text">Open the panel on a <b>Contact page</b> to load live data from the Act! API.</p>
                        </div>
                    </div>
                </div>

                <!-- ── Fields Tab ─────────────────────── -->
                <div class="cp-tab-panel" id="tab-fields">


                    <!-- Live Field Scanner -->
                    <div class="cp-section-title"><span class="cp-dot"></span>Live Page Fields</div>
                    <div class="cp-field-scanner-bar">
                        <button class="cp-scan-btn" id="cp-scan-btn">🔍 Scan Page</button>
                        <input type="text" class="cp-field-filter" id="cp-field-filter" placeholder="Filter fields..." />
                    </div>
                    <div class="cp-field-count" id="cp-field-count">No fields scanned yet</div>
                    <div class="cp-field-list" id="cp-field-list"></div>
                </div>

                <!-- ── API Data Tab ────────────────────── -->
                <div class="cp-tab-panel" id="tab-apidata">
                    <div class="cp-field-scanner-bar">
                        <button class="cp-scan-btn" id="cp-api-load-btn">📡 Load from API</button>
                        <input type="text" class="cp-field-filter" id="cp-api-filter" placeholder="Filter fields..." />
                    </div>
                    <div class="cp-field-count" id="cp-api-count">Click "Load from API" to fetch contact data</div>
                    <div style="display:flex;gap:8px;margin:8px 0;font-size:11px">
                        <span style="color:var(--cp-success)">● On Page</span>
                        <span style="color:var(--cp-warning)">● API Only</span>
                        <span style="color:var(--cp-text-dim)">● Empty</span>
                    </div>
                    <div class="cp-field-list" id="cp-api-list"></div>
                </div>

                <!-- ── Rules Tab ──────────────────────── -->
                <div class="cp-tab-panel" id="tab-rules">
                    <div class="cp-section-title"><span class="cp-dot"></span>Auto-Fill Rules</div>
                    <div id="cp-rules-list"></div>
                    <button class="cp-add-rule-btn" id="cp-add-rule">+ Add New Rule</button>
                </div>
            </div>

            <!-- Footer -->
            <div class="cp-footer">
                <button class="cp-footer-btn" id="cp-run-rules" disabled>▶ Run All Active Rules</button>
            </div>
        </div>

        <div class="cp-toast" id="cp-toast"></div>
        `;
    }

    // ═══════════════════════════════════════════════════════
    //  Trigger Button
    // ═══════════════════════════════════════════════════════

    function injectTriggerButton() {
        // Shared click handler — prevents event from bubbling into Act!'s
        // toolbar navigation which would otherwise open a blank tab
        function onTriggerClick(e) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            togglePanel();
            return false;
        }

        // Try attaching next to Act!'s notification bell
        const bell = document.getElementById('menu:notification');
        if (bell) {
            const td = document.createElement('td');
            td.id = 'act-copilot-trigger';
            td.style.padding = '0 8px';
            td.innerHTML = `
                <button class="cp-trigger-btn" title="FedSafe Retirement Copilot" type="button">
                    <span class="cp-trigger-icon">⚡</span>
                    <span class="cp-trigger-label">COPILOT</span>
                </button>
            `;
            // Capture phase + prevent all bubbling
            td.addEventListener('click', onTriggerClick, true);
            td.querySelector('.cp-trigger-btn').addEventListener('click', onTriggerClick, true);
            bell.parentNode.insertBefore(td, bell);
            return;
        }

        // Fallback: floating button in the bottom-right (stays on Act! page, no new tab)
        const fab = document.createElement('div');
        fab.id = 'act-copilot-trigger';
        fab.style.cssText = `
            position: fixed; bottom: 24px; right: 24px; z-index: 10000;
            cursor: pointer;
        `;
        fab.innerHTML = `
            <button class="cp-trigger-btn" type="button" style="padding: 12px 20px; border-radius: 14px; box-shadow: 0 8px 24px rgba(0,0,0,0.3);" title="FedSafe Retirement Copilot">
                <span class="cp-trigger-icon" style="font-size: 20px;">⚡</span>
                <span class="cp-trigger-label" style="font-size: 14px;">COPILOT</span>
            </button>
        `;
        fab.addEventListener('click', onTriggerClick, true);
        document.body.appendChild(fab);
    }

    // ═══════════════════════════════════════════════════════
    //  Event Wiring
    // ═══════════════════════════════════════════════════════

    function wireEvents() {
        // Close button
        document.getElementById('cp-close').onclick = () => {
            document.getElementById('cp-panel').classList.remove('active');
        };

        // Tab switching
        document.querySelectorAll('.cp-tab').forEach(tab => {
            tab.onclick = () => switchTab(tab.dataset.tab);
        });

        // Field scanning
        document.getElementById('cp-scan-btn').onclick = () => {
            fieldMap = ActFieldMapper.scanPage();
            renderFieldList();
            toast(`Scanned ${Object.keys(fieldMap).length} fields`, 'success');
        };

        // Field filter
        document.getElementById('cp-field-filter').oninput = (e) => {
            renderFieldList(e.target.value);
        };

        // Add rule
        document.getElementById('cp-add-rule').onclick = addNewRule;

        // Run rules
        document.getElementById('cp-run-rules').onclick = runAllRules;

        // API Data tab
        document.getElementById('cp-api-load-btn').onclick = loadApiData;
        document.getElementById('cp-api-filter').oninput = (e) => {
            renderApiData(e.target.value);
        };


    }



    // ═══════════════════════════════════════════════════════
    //  Panel Toggle & Data Fetch
    // ═══════════════════════════════════════════════════════

    function togglePanel() {
        const panel = document.getElementById('cp-panel');
        panel.classList.toggle('active');
        if (panel.classList.contains('active')) {
            loadContactData();
            // API data is NOT pre-fetched — user clicks "Reload from API" to load on demand

            // Auto-scan fields if not scanned yet
            if (Object.keys(fieldMap).length === 0) {
                setTimeout(() => {
                    fieldMap = ActFieldMapper.scanPage();
                    renderFieldList();
                }, 1500);
            }

            // Update database name from URL
            const db = ActFieldMapper.getDatabaseName();
            if (db) {
                document.getElementById('cp-db-name').textContent = `Database: ${db}`;
            }
        }
    }

    let _tokenTimestamp = 0;
    const TOKEN_LIFETIME = 50000; // refresh at 50s (token expires at 60s)

    /**
     * Authentication is now handled entirely on the backend proxy.
     * This function is kept as a stub to avoid breaking existing calls,
     * but it always returns a dummy value to indicate "authenticated via proxy".
     */
    async function getAuthToken() {
        return 'PROXY_AUTH';
    }

    async function loadContactData() {
        const contactId = ActFieldMapper.getContactId();
        document.getElementById('cp-contact-id').textContent = contactId || 'Not on a contact page';

        if (!contactId) return;

        // Try reading from DOM fields first (faster, no API call needed)
        if (Object.keys(fieldMap).length === 0) {
            fieldMap = ActFieldMapper.scanPage();
        }

        // Read name from DOM if available
        const firstName = ActFieldMapper.getFieldValue('FirstName')
                       || ActFieldMapper.getFieldValue('first_name') || '';
        const lastName = ActFieldMapper.getFieldValue('LastName')
                      || ActFieldMapper.getFieldValue('last_name') || '';
        const company = ActFieldMapper.getFieldValue('Company')
                     || ActFieldMapper.getFieldValue('CompanyName') || '';

        if (firstName || lastName) {
            document.getElementById('cp-contact-name').textContent = `${firstName} ${lastName}`.trim();
            document.getElementById('cp-company').textContent = company || '—';
            setupSearchLinks(firstName, lastName, company);
        }

        // Also try API enrichment via proxy (routed through background worker to avoid CORS)
        try {
            const data = await bgFetch(`/api/proxy/act/contact/${contactId}`);
            document.getElementById('cp-contact-name').textContent =
                `${data.firstName || ''} ${data.lastName || ''}`.trim() || '—';
            document.getElementById('cp-company').textContent = data.companyName || '—';
            setupSearchLinks(data.firstName, data.lastName, data.companyName);
            renderIntelItems(data);
        } catch (e) {
            verboseDebug && console.log('[Copilot] API enrichment skipped (proxy):', e.message);
        }
    }

    function setupSearchLinks(firstName = '', lastName = '', company = '') {
        const query = encodeURIComponent(`${company} ${firstName} ${lastName}`.trim());
        document.getElementById('cp-search-google').onclick = () =>
            window.open('https://www.google.com/search?q=' + query, '_blank');
        document.getElementById('cp-search-linkedin').onclick = () =>
            window.open('https://www.linkedin.com/search/results/all/?keywords=' + encodeURIComponent(company || `${firstName} ${lastName}`), '_blank');
        document.getElementById('cp-search-youtube').onclick = () =>
            window.open('https://www.youtube.com/results?search_query=' + query, '_blank');
    }

    function renderIntelItems(data) {
        const list = document.getElementById('cp-intel-list');
        const items = [];

        if (data.companyName) {
            items.push({ icon: '🏢', text: `Company: <b>${data.companyName}</b>` });
        }
        if (data.emailAddress) {
            items.push({ icon: '📧', text: `Email: <b>${data.emailAddress}</b>` });
        }
        if (data.phone1) {
            items.push({ icon: '📞', text: `Phone: <b>${data.phone1}</b>` });
        }
        if (data.city || data.state) {
            items.push({ icon: '📍', text: `Location: <b>${[data.city, data.state].filter(Boolean).join(', ')}</b>` });
        }

        if (items.length === 0) {
            items.push({ icon: '📊', text: 'No additional data available from API.' });
        }

        list.innerHTML = items.map(i => `
            <div class="cp-intel-item">
                <div class="cp-intel-icon">${i.icon}</div>
                <p class="cp-intel-text">${i.text}</p>
            </div>
        `).join('');
    }

    // ═══════════════════════════════════════════════════════
    //  Tab Switching
    // ═══════════════════════════════════════════════════════

    function switchTab(tabName) {
        currentTab = tabName;
        document.querySelectorAll('.cp-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
        document.querySelectorAll('.cp-tab-panel').forEach(p => p.classList.remove('active'));
        document.getElementById('tab-' + tabName).classList.add('active');

        // Auto-scan on first fields tab visit
        if (tabName === 'fields' && Object.keys(fieldMap).length === 0) {
            fieldMap = ActFieldMapper.scanPage();
            renderFieldList();
        }

        // API Data tab: never auto-fetch — user must click Reload from API

        // Update footer button label
        const btn = document.getElementById('cp-run-rules');
        if (tabName === 'rules') {
            btn.disabled = rules.filter(r => r.enabled).length === 0;
            btn.textContent = '▶ Run All Active Rules';
            btn.onclick = runAllRules;
        } else if (tabName === 'fields') {
            btn.disabled = false;
            btn.textContent = '🔄 Re-Scan Fields';
            btn.onclick = () => {
                fieldMap = ActFieldMapper.scanPage();
                renderFieldList();
                toast(`Found ${Object.keys(fieldMap).length} fields`, 'success');
            };
        } else if (tabName === 'apidata') {
            btn.disabled = false;
            btn.textContent = '📡 Reload from API';
            btn.onclick = loadApiData;
        } else {
            btn.disabled = false;
            btn.textContent = '🔄 Refresh Data';
            btn.onclick = () => loadContactData();
        }
    }

    // ═══════════════════════════════════════════════════════
    //  Field List Rendering
    // ═══════════════════════════════════════════════════════

    function renderFieldList(filter = '') {
        const list = document.getElementById('cp-field-list');
        const entries = Object.entries(fieldMap);

        const filtered = filter
            ? entries.filter(([name]) => name.toLowerCase().includes(filter.toLowerCase()))
            : entries;

        // Sort alphabetically by field name
        filtered.sort(([a], [b]) => a.toLowerCase().localeCompare(b.toLowerCase()));

        document.getElementById('cp-field-count').textContent =
            `${filtered.length} of ${entries.length} fields${filter ? ' (filtered)' : ''}`;

        if (filtered.length === 0) {
            list.innerHTML = `
                <div class="cp-empty-state">
                    <div class="cp-empty-icon">🔍</div>
                    <p>${entries.length === 0 ? 'Click "Scan Page" to discover Act! form fields' : 'No fields match your filter'}</p>
                </div>
            `;
            return;
        }

        list.innerHTML = filtered.map(([name, info]) => `
            <div class="cp-field-item" data-field="${name}">
                <div class="cp-field-item-header">
                    <span class="cp-field-name">${name}</span>
                    <span class="${info.isCustom ? 'cp-field-badge-custom' : 'cp-field-badge-builtin'}">
                        ${info.isCustom ? 'Custom' : 'Built-in'}
                    </span>
                </div>
                <div class="cp-field-value-row">
                    <input type="text" class="cp-field-input" value="${escapeAttr(info.element.value)}" data-field="${name}" />
                    <button class="cp-field-apply-btn" data-field="${name}">Apply</button>
                </div>
            </div>
        `).join('');

        // Wire field apply buttons
        list.querySelectorAll('.cp-field-apply-btn').forEach(btn => {
            btn.onclick = () => {
                const fieldName = btn.dataset.field;
                const input = list.querySelector(`.cp-field-input[data-field="${fieldName}"]`);
                const success = ActFieldMapper.setFieldValue(fieldName, input.value);
                if (success) {
                    btn.textContent = '✓';
                    btn.classList.add('applied');
                    toast(`Set ${fieldName} = "${input.value}"`, 'success');
                    setTimeout(() => {
                        btn.textContent = 'Apply';
                        btn.classList.remove('applied');
                    }, 2000);
                } else {
                    toast(`Failed to set ${fieldName}`, 'error');
                }
            };
        });
    }
    // ═══════════════════════════════════════════════════════
    //  API Data Tab
    // ═══════════════════════════════════════════════════════

    async function loadApiData() {
        const btn = document.getElementById('cp-api-load-btn');
        btn.textContent = '⏳ Loading...';
        btn.disabled = true;

        const contactId = ActFieldMapper.getContactId();
        if (!contactId) {
            document.getElementById('cp-api-count').textContent = 'Not on a contact page (no ID in URL)';
            btn.textContent = '📡 Load from API';
            btn.disabled = false;
            toast('No contact ID found in URL', 'error');
            return;
        }

        try {
            // Route through background worker to avoid CORS blocks
            apiContactData = await bgFetch(`/api/proxy/act/contact/${contactId}`);

            renderApiData();
            toast(`Loaded ${Object.keys(apiContactData).length} fields from API`, 'success');
        } catch (e) {
            toast('API load failed: ' + e.message, 'error');
            document.getElementById('cp-api-count').textContent = 'Error: ' + e.message;
        }

        btn.textContent = '📡 Load from API';
        btn.disabled = false;
    }

    function renderApiData(filter = '') {
        const list = document.getElementById('cp-api-list');
        const countEl = document.getElementById('cp-api-count');

        if (!apiContactData) {
            list.innerHTML = `
                <div class="cp-empty-state">
                    <div class="cp-empty-icon">📡</div>
                    <p>Click "Load from API" to fetch the contact record</p>
                </div>
            `;
            return;
        }

        // Build flat field list: standard fields + flattened objects + custom fields
        const allFields = [];

        // Keys to skip entirely (handled separately)
        const skipKeys = new Set(['customFields']);

        for (const [key, value] of Object.entries(apiContactData)) {
            if (skipKeys.has(key)) continue;

            // Flatten nested objects (businessAddress, homeAddress, etc.)
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                for (const [subKey, subVal] of Object.entries(value)) {
                    allFields.push({
                        name: `${key}.${subKey}`,
                        value: subVal,
                        group: 'Standard',
                    });
                }
                continue;
            }

            // Skip arrays
            if (Array.isArray(value)) continue;

            allFields.push({
                name: key,
                value: value,
                group: 'Standard',
            });
        }

        // Custom fields
        if (apiContactData.customFields) {
            for (const [key, value] of Object.entries(apiContactData.customFields)) {
                allFields.push({
                    name: key,
                    value: value,
                    group: 'Custom',
                });
            }
        }

        // Sort alphabetically within each group
        allFields.sort((a, b) => {
            // Group first (Standard before Custom)
            if (a.group !== b.group) return a.group === 'Standard' ? -1 : 1;
            // Then alphabetically by name
            return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        });

        // Filter
        const lower = filter.toLowerCase();
        const filtered = filter
            ? allFields.filter(f => f.name.toLowerCase().includes(lower) ||
                                    (f.value !== null && String(f.value).toLowerCase().includes(lower)))
            : allFields;

        // Count stats
        const withValue = filtered.filter(f => f.value !== null && f.value !== '' && f.value !== false);
        const onPage = filtered.filter(f => {
            const lowerName = f.name.toLowerCase().replace(/^(business|home)address\./, '');
            return Object.keys(fieldMap).some(k => {
                const kl = k.toLowerCase();
                return kl === lowerName || kl.includes(lowerName) || lowerName.includes(kl);
            });
        });

        countEl.textContent = `${filtered.length} fields (${withValue.length} with values, ${onPage.length} on page)${filter ? ' — filtered' : ''}`;

        // Render
        let currentGroup = '';
        let html = '';

        for (const field of filtered) {
            // Group header
            if (field.group !== currentGroup) {
                currentGroup = field.group;
                html += `<div class="cp-section-title" style="margin:12px 0 6px"><span class="cp-dot"></span>${currentGroup} Fields</div>`;
            }

            const isEmpty = field.value === null || field.value === '' || field.value === undefined;
            const isBool = typeof field.value === 'boolean';
            const displayVal = isEmpty ? '—' : isBool ? (field.value ? '✓ true' : '✗ false') : String(field.value);

            // Check if field exists on the page DOM
            const baseName = field.name.replace(/^(business|home)Address\./, '');
            const lowerName = baseName.toLowerCase();
            const isOnPage = Object.keys(fieldMap).some(k => {
                const kl = k.toLowerCase();
                return kl === lowerName || kl.includes(lowerName) || lowerName.includes(kl);
            });

            // Color: green = on page, yellow = API only with value, dim = empty
            let dotColor = 'var(--cp-text-dim)';
            let valueColor = 'var(--cp-text-dim)';
            if (isOnPage) {
                dotColor = 'var(--cp-success)';
                valueColor = '#e2e8f0';
            } else if (!isEmpty) {
                dotColor = 'var(--cp-warning)';
                valueColor = '#cbd5e1';
            }

            html += `
                <div class="cp-field-item" style="opacity:${isEmpty && !isOnPage ? '0.5' : '1'}">
                    <div class="cp-field-item-header">
                        <span style="color:${dotColor};margin-right:6px">●</span>
                        <span class="cp-field-name" style="flex:1">${escapeAttr(field.name)}</span>
                        <span class="${field.group === 'Custom' ? 'cp-field-badge-custom' : 'cp-field-badge-builtin'}" style="font-size:9px">
                            ${field.group === 'Custom' ? 'Custom' : 'Std'}
                        </span>
                    </div>
                    <div style="font-size:12px;color:${valueColor};padding:2px 0 0 18px;word-break:break-all">
                        ${escapeAttr(displayVal)}
                    </div>
                </div>
            `;
        }

        list.innerHTML = html || '<div class="cp-empty-state"><p>No fields match your filter</p></div>';
    }

    // ═══════════════════════════════════════════════════════
    //  Rules Engine
    // ═══════════════════════════════════════════════════════

    function addNewRule() {
        const fieldNames = Object.keys(fieldMap);
        if (fieldNames.length === 0) {
            toast('Scan fields first before creating rules', 'error');
            return;
        }

        rules.push({
            id: Date.now(),
            name: `Rule ${rules.length + 1}`,
            enabled: true,
            whenField: fieldNames[0] || '',
            whenValue: '',
            thenField: fieldNames[0] || '',
            thenValue: '',
        });

        renderRules();
        saveRules();
    }

    function renderRules() {
        const container = document.getElementById('cp-rules-list');
        const fieldNames = Object.keys(fieldMap);

        if (rules.length === 0) {
            container.innerHTML = `
                <div class="cp-empty-state">
                    <div class="cp-empty-icon">⚙️</div>
                    <p>No rules defined yet.<br/>Rules auto-fill fields based on conditions.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = rules.map((rule, idx) => `
            <div class="cp-rule-card" data-rule-idx="${idx}">
                <div class="cp-rule-header">
                    <span class="cp-rule-name">${rule.name}</span>
                    <div style="display:flex;gap:8px;align-items:center">
                        <div class="cp-rule-toggle ${rule.enabled ? 'on' : ''}" data-rule-idx="${idx}"></div>
                        <button class="cp-rule-delete" data-rule-idx="${idx}">&times;</button>
                    </div>
                </div>
                <div class="cp-rule-row">
                    <span class="cp-rule-label">WHEN</span>
                    <select class="cp-rule-select" data-rule-idx="${idx}" data-prop="whenField">
                        ${fieldNames.map(f => `<option value="${f}" ${f === rule.whenField ? 'selected' : ''}>${f}</option>`).join('')}
                    </select>
                    <span style="color:var(--cp-text-dim);font-size:12px">=</span>
                    <input class="cp-rule-input" value="${escapeAttr(rule.whenValue)}" data-rule-idx="${idx}" data-prop="whenValue" placeholder="value..." />
                </div>
                <div class="cp-rule-row">
                    <span class="cp-rule-label">SET</span>
                    <select class="cp-rule-select" data-rule-idx="${idx}" data-prop="thenField">
                        ${fieldNames.map(f => `<option value="${f}" ${f === rule.thenField ? 'selected' : ''}>${f}</option>`).join('')}
                    </select>
                    <span style="color:var(--cp-text-dim);font-size:12px">→</span>
                    <input class="cp-rule-input" value="${escapeAttr(rule.thenValue)}" data-rule-idx="${idx}" data-prop="thenValue" placeholder="new value..." />
                </div>
            </div>
        `).join('');

        // Wire toggle, delete, and input changes
        container.querySelectorAll('.cp-rule-toggle').forEach(toggle => {
            toggle.onclick = () => {
                const idx = parseInt(toggle.dataset.ruleIdx);
                rules[idx].enabled = !rules[idx].enabled;
                toggle.classList.toggle('on');
                saveRules();
                document.getElementById('cp-run-rules').disabled = rules.filter(r => r.enabled).length === 0;
            };
        });

        container.querySelectorAll('.cp-rule-delete').forEach(btn => {
            btn.onclick = () => {
                rules.splice(parseInt(btn.dataset.ruleIdx), 1);
                renderRules();
                saveRules();
            };
        });

        container.querySelectorAll('.cp-rule-select, .cp-rule-input').forEach(input => {
            input.onchange = () => {
                const idx = parseInt(input.dataset.ruleIdx);
                const prop = input.dataset.prop;
                rules[idx][prop] = input.value;
                saveRules();
            };
        });
    }

    function runAllRules() {
        const activeRules = rules.filter(r => r.enabled);
        let applied = 0;

        for (const rule of activeRules) {
            const currentValue = ActFieldMapper.getFieldValue(rule.whenField);
            if (currentValue !== undefined && currentValue === rule.whenValue) {
                const success = ActFieldMapper.setFieldValue(rule.thenField, rule.thenValue);
                if (success) applied++;
            }
        }

        toast(`Executed ${activeRules.length} rules, ${applied} applied`, applied > 0 ? 'success' : 'info');
    }

    // ═══════════════════════════════════════════════════════
    //  Storage Helpers
    // ═══════════════════════════════════════════════════════

    function saveRules() {
        try {
            if (chrome?.storage?.local) {
                chrome.storage.local.set({ actCopilotRules: rules });
            } else {
                localStorage.setItem('actCopilotRules', JSON.stringify(rules));
            }
        } catch {}
    }

    function loadRules() {
        try {
            if (chrome?.storage?.local) {
                chrome.storage.local.get('actCopilotRules', (data) => {
                    if (data.actCopilotRules) {
                        rules = data.actCopilotRules;
                        renderRules();
                    }
                });
            } else {
                const saved = localStorage.getItem('actCopilotRules');
                if (saved) {
                    rules = JSON.parse(saved);
                    renderRules();
                }
            }
        } catch {}
    }

    function chromeStorageGet(key) {
        return new Promise((resolve) => {
            try {
                if (chrome?.storage?.local) {
                    chrome.storage.local.get(key, (data) => resolve(data[key] || null));
                } else {
                    const val = localStorage.getItem(key);
                    resolve(val ? JSON.parse(val) : null);
                }
            } catch {
                resolve(null);
            }
        });
    }

    // ═══════════════════════════════════════════════════════
    //  Toast Notification
    // ═══════════════════════════════════════════════════════

    function toast(message, type = 'info') {
        if (!showNotification) return; // globally suppressed
        const el = document.getElementById('cp-toast');
        const icons = { success: '✅', error: '❌', info: 'ℹ️' };
        el.className = 'cp-toast ' + type;
        el.innerHTML = `${icons[type] || ''} ${message}`;
        el.classList.add('visible');
        setTimeout(() => el.classList.remove('visible'), 3000);
    }

    // ═══════════════════════════════════════════════════════
    //  Utilities
    // ═══════════════════════════════════════════════════════

    function escapeAttr(str) {
        if (!str) return '';
        return str.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // ═══════════════════════════════════════════════════════
    //  Calculate Button Trap
    // ═══════════════════════════════════════════════════════

    function trapCalculateButton() {
        // The Calculate button lives in the FEGLI tab iframe:
        //   MutableEntityTabLayout.aspx?tabName=tabFEGLI  ← actual location
        //   ContactDetail.aspx                             ← also check as fallback
        // With all_frames:true this runs in ALL frames — guard to relevant ones only.
        const href = window.location.href;
        const isRelevantFrame =
            href.includes('tabFEGLI') ||
            href.includes('MutableEntityTabLayout') ||
            href.includes('Contacts/ContactDetail.aspx') ||
            href.includes('ContactDetail.aspx');
        if (!isRelevantFrame) return;

        verboseDebug && console.log('[Copilot] trapCalculateButton running in frame:', href.split('?')[0].split('/').pop());

        // attachToBtn is idempotent: data-copilot-trapped guards re-hooking.
        function attachToBtn(el) {
            if (el.dataset.copilotTrapped) return;
            el.dataset.copilotTrapped = '1';
            el.style.cursor = 'pointer';
            el.title = '\u26a1 Copilot: Click to run FEGLI calculation';
            el.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                // Always postMessage to top frame — we are in an iframe context.
                window.top.postMessage({ type: 'ACT_COPILOT_CALCULATE' }, '*');
                return false;
            }, true);
            verboseDebug && console.log('[Copilot] \ud83c\udfaf Calculate button hooked in', href.split('?')[0].split('/').pop());
        }

        function findCalcBtn() {
            return findElementByText('Calculate Current');
        }

        // Try immediately (button may already be in DOM)
        const btn = findCalcBtn();
        if (btn) attachToBtn(btn);

        // Closure-local MutationObserver — each frame gets its own, fully independent.
        // Does NOT disconnect so re-renders after contact navigation stay hooked.
        const obs = new MutationObserver(() => {
            const b = findCalcBtn();
            if (b) attachToBtn(b); // idempotent via data-copilot-trapped
        });
        obs.observe(document.body || document.documentElement, {
            childList: true, subtree: true
        });
    }

    // ─── ORA Report Label Trap ────────────────────────────
    // Hooks the green PDF labels in the ORA tab so clicking
    // them triggers the PDF generation dialog.
    function trapOraReportLabels() {
        // Known form ID prefixes — sorted longest first so "SF-3107-2" matches before "SF-3107"
        const ORA_FORM_PREFIXES = [
            'SF-3107-2',    // must come before SF-3107
            'SF-2809',
            'SF-2818',
            'SF-2823',
            'SF-3102',
            'SF-3107',
            'SF-3108',
            'W-4P',
            'W4P',
        ];

        const href = window.location.href;
        const isRelevantFrame =
            href.includes('tabORA') ||
            href.includes('MutableEntityTabLayout') ||
            href.includes('Contacts/ContactDetail.aspx') ||
            href.includes('ContactDetail.aspx');
        if (!isRelevantFrame) return;

        verboseDebug && console.log('[Copilot] trapOraReportLabels running in frame:', href.split('?')[0].split('/').pop());

        function attachToLabel(el, formName, formLabel) {
            if (el.dataset.copilotOraTrapped) return;
            el.dataset.copilotOraTrapped = '1';
            el.style.cursor = 'pointer';
            el.title = `\u26a1 Click to generate ${formName}`;
            el.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                window.top.postMessage({
                    type: 'ACT_COPILOT_GENERATE_PDF',
                    formName,
                    formLabel,
                }, '*');
                return false;
            }, true);
            verboseDebug && console.log(`[Copilot] \ud83d\udcc4 ORA label hooked: "${formLabel}" → ${formName}`);
        }

        function findOraLabels() {
            // Scan ALL text-bearing elements, match by prefix instead of exact text
            const candidates = document.querySelectorAll(
                'div, button, td, span, a, input[type="button"], input[type="submit"]'
            );
            for (const el of candidates) {
                if (el.dataset.copilotOraTrapped) continue;
                const text = (el.value || el.textContent || '').trim();
                if (!text || text.length < 4 || text.length > 120) continue;
                // Check if this element's text starts with a known form prefix
                for (const prefix of ORA_FORM_PREFIXES) {
                    if (text.startsWith(prefix)) {
                        // Normalize: W4P → W4P, W-4P → W4P
                        const formId = prefix.replace('W-4P', 'W4P');
                        attachToLabel(el, formId, text);
                        break; // one prefix per element
                    }
                }
            }
        }

        findOraLabels();

        const obs = new MutationObserver(() => findOraLabels());
        obs.observe(document.body || document.documentElement, {
            childList: true, subtree: true
        });
    }

    // ─── Calculate Retirement Button Trap ─────────────────
    // Hooks the "Calculate Retirement" button in the FEGLI tab.
    function trapCalculateRetirementButton() {
        const href = window.location.href;
        const isRelevantFrame =
            href.includes('tabFEGLI') ||
            href.includes('MutableEntityTabLayout') ||
            href.includes('Contacts/ContactDetail.aspx') ||
            href.includes('ContactDetail.aspx');
        if (!isRelevantFrame) return;

        function attachToBtn(el) {
            if (el.dataset.copilotRetireTrapped) return;
            el.dataset.copilotRetireTrapped = '1';
            el.style.cursor = 'pointer';
            el.title = '\u26a1 Copilot: Click to run Retirement FEGLI calculation';
            el.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                window.top.postMessage({ type: 'ACT_COPILOT_CALCULATE_RETIREMENT' }, '*');
                return false;
            }, true);
            verboseDebug && console.log('[Copilot] \ud83c\udfaf Calculate Retirement button hooked');
        }

        function findRetireBtn() {
            return findElementByText('Calculate Retirement');
        }

        const btn = findRetireBtn();
        if (btn) attachToBtn(btn);

        const obs = new MutationObserver(() => {
            const b = findRetireBtn();
            if (b) attachToBtn(b);
        });
        obs.observe(document.body || document.documentElement, {
            childList: true, subtree: true
        });
    }


    // ─── Blueprint PDF Button Trap ─────────────────────────
    // Hooks the blue "BLUEPRINT" label/button on the Income tab.
    function trapBlueprintButton() {
        const href = window.location.href;
        const isRelevantFrame =
            href.includes('tabIncome') ||
            href.includes('MutableEntityTabLayout') ||
            href.includes('Contacts/ContactDetail.aspx') ||
            href.includes('ContactDetail.aspx');
        if (!isRelevantFrame) return;
        verboseDebug && console.log('[Copilot] trapBlueprintButton running in frame:', href.split('?')[0].split('/').pop());

        function attachToBtn(el) {
            if (el.dataset.copilotBlueprintTrapped) return;
            el.dataset.copilotBlueprintTrapped = '1';
            el.style.cursor = 'pointer';
            el.title = '\u26a1 Copilot: Click to generate Blueprint PDF';
            el.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                window.top.postMessage({ type: 'ACT_COPILOT_BLUEPRINT' }, '*');
                return false;
            }, true);
            verboseDebug && console.log('[Copilot] \ud83d\udcdd Blueprint button hooked in', el.tagName, el.textContent.trim());
        }

        function findBlueprintBtn() {
            // The BLUEPRINT label is a <div> with text "BLUEPRINT"
            const el = findElementByText('BLUEPRINT');
            if (!el) {
                // Also try searching iframes
                const iframes = document.querySelectorAll('iframe, frame');
                for (const f of iframes) {
                    try {
                        const iDoc = f.contentDocument || f.contentWindow?.document;
                        if (!iDoc) continue;
                        const candidates = iDoc.querySelectorAll('div, button, td, span, a');
                        for (const c of candidates) {
                            const text = (c.value || c.textContent || '').trim();
                            if (text === 'BLUEPRINT') return c;
                        }
                    } catch(e) {} // cross-origin
                }
            }
            return el;
        }

        const btn = findBlueprintBtn();
        verboseDebug && console.log('[Copilot] Blueprint search result:', btn ? btn.tagName + '=' + btn.textContent.trim() : 'NOT FOUND');
        if (btn) attachToBtn(btn);

        const obs = new MutationObserver(() => {
            const b = findBlueprintBtn();
            if (b) attachToBtn(b);
        });
        obs.observe(document.body || document.documentElement, {
            childList: true, subtree: true
        });
    }

    // ─── Final Calculation Button Trap ────────────────────
    // Hooks the "Final Calculation" button in the Income tab.
    function trapFinalCalculationButton() {
        const href = window.location.href;
        const isRelevantFrame =
            href.includes('tabIncome') ||
            href.includes('MutableEntityTabLayout') ||
            href.includes('Contacts/ContactDetail.aspx') ||
            href.includes('ContactDetail.aspx');
        if (!isRelevantFrame) return;

        function attachToBtn(el) {
            if (el.dataset.copilotFinalTrapped) return;
            el.dataset.copilotFinalTrapped = '1';
            el.style.cursor = 'pointer';
            el.title = '\u26a1 Copilot: Click to run Final Retirement Calculation';
            el.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                window.top.postMessage({ type: 'ACT_COPILOT_CALCULATE_FINAL' }, '*');
                return false;
            }, true);
            verboseDebug && console.log('[Copilot] \ud83c\udfaf Final Calculation button hooked');
        }

        function findFinalBtn() {
            return findElementByText('Final Calculation');
        }

        const btn = findFinalBtn();
        if (btn) attachToBtn(btn);

        const obs = new MutationObserver(() => {
            const b = findFinalBtn();
            if (b) attachToBtn(b);
        });
        obs.observe(document.body || document.documentElement, {
            childList: true, subtree: true
        });
    }


    // ── Iframe FEGLI Code Validator ───────────────────────
    // Runs in the iframe where FEGLI code field lives.
    // Fetches valid codes independently, polls the field value,
    // and postMessages the top frame to show validation modal.
    function startIframeFegliValidator(retries) {
        if (retries === undefined) retries = 0;
        var map = ActFieldMapper.scanPage();
        var entry = map['feglicodeactive'];
        if (!entry || !entry.element) {
            if (retries < 5) {
                setTimeout(function() { startIframeFegliValidator(retries + 1); }, 3000);
            }
            return;
        }

        var el = entry.element;
        verboseDebug && console.log('[Copilot/iframe] FEGLI validator: found field, loading codes...');

        // Route through the background service worker — CORS-exempt.
        // Iframes cannot use chrome.runtime if they are cross-origin, but content.js
        // is injected into the iframe by the extension so chrome.runtime IS available.
        chrome.runtime.sendMessage(
            { type: 'api_call', method: 'GET', path: '/api/proxy/fegli-codes' },
            function(res) {
                // Build the canonical code list: merge API response with FEGLI_API engine.
                // The Vercel API may return a partial set (it returned 51, missing W-Z group).
                // FEGLI_API.getValidCodes() is the always-correct OPM set — no inline lists.
                var apiCodes  = (res && res.ok && res.data && res.data.codes) || [];
                var localCodes = (typeof FEGLI_API !== 'undefined' && FEGLI_API.getValidCodes)
                    ? FEGLI_API.getValidCodes() : [];
                // Union: keep all from both sources
                var validCodes = localCodes.length > 0
                    ? [...new Set([...localCodes, ...apiCodes])]
                    : apiCodes;
                if (validCodes.length === 0) return; // no codes at all — skip

                verboseDebug && console.log('[Copilot/iframe] FEGLI validator ready: ' + validCodes.length + ' codes (local+API)');
                var lastSeen = '';  // start empty so first blur validates existing value

                // CSS uppercase — shows uppercase visually without modifying value while typing
                el.style.textTransform = 'uppercase';

                // Core validation — skipShort=true skips single chars (for poller)
                function validateCode(skipShort) {
                    var val = (el.value || '').trim().toUpperCase();

                    if (!val || val === lastSeen) return;
                    if (skipShort && val.length < 2) return;  // poller: user might still be typing
                    lastSeen = val;

                    // Now uppercase the actual stored value (user is done typing)
                    if (el.value !== val) {
                        el.value = val;
                    }

                    if (!validCodes.includes(val)) {
                        window.top.postMessage({
                            type: 'ACT_COPILOT_FEGLI_INVALID',
                            code: val
                        }, '*');
                    }
                }

                // Primary: blur/focusout — user left the field, validate ALL values
                function onBlur() { validateCode(false); }
                el.addEventListener('blur', onBlur);
                el.addEventListener('focusout', onBlur);

                // Fallback: poll every 2s — skip single chars (user might still type)
                setInterval(function() { validateCode(true); }, 2000);

                // Listen for clear+focus command from top frame
                window.addEventListener('message', function(evt) {
                    if (evt.data && evt.data.type === 'ACT_COPILOT_FEGLI_CLEAR') {
                        verboseDebug && console.log('[Copilot/iframe] Clearing FEGLI code field');
                        ActFieldMapper.setFieldValue('feglicodeactive', '');
                        lastSeen = '';  // reset so poller doesn't re-fire
                        el.focus();
                    }
                });
            }
        );
    }

    // The fields the FEGLI calculator needs — used for targeted scans.
    const FEGLI_CALC_FIELDS = [
        'ageyy', 'birth date', 'birthdate',             // age inputs (ageyy = auto-computed from DOB)
        'salaryamount',                      // required
        'feglicodeactive', 'fegliperpayperiod', // conditional inputs
        'basiclife', 'optiona', 'optionb', 'optionc', // computed outputs
        'feglinetcost',                      // computed: Current FEGLI Cost
    ];

    async function showCalculateDialog() {
        // Remove any existing dialog
        const existing = document.getElementById('cp-calc-dialog');
        if (existing) existing.remove();

        // ── Step 1: Targeted scan — fetch the fields the calculator needs ──
        fieldMap = ActFieldMapper.scanFields(FEGLI_CALC_FIELDS);

        // ── Step 2: ask ALL iframes to rescan + broadcast fresh values ──
        document.querySelectorAll('iframe, frame').forEach(f => {
            try { f.contentWindow.postMessage({ type: 'ACT_COPILOT_RESCAN' }, '*'); } catch {}
        });

        // ── Step 3: auto-load API data if not already cached ──
        // Fields like salaryamount live in OTHER tabs (LES Info) and cannot
        // be DOM-scanned when the FEGLI tab is active. The API has them all.
        if (!apiContactData) {
            try {
                const contactId = ActFieldMapper.getContactId();
                if (contactId) {
                    const data = await actProxyFetch('/contact/' + contactId);
                    apiContactData = data;
                    verboseDebug && console.log('[Copilot] Auto-loaded API data for calculator (' +
                        Object.keys(apiContactData.customFields || {}).length + ' custom fields)');
                }
            } catch (e) {
                verboseDebug && console.log('[Copilot] Auto-load API data failed:', e.message);
            }
        }

        // ── Step 4: wait for iframe broadcasts, then build dialog ──
        setTimeout(() => _buildCalculateDialog(), 700);
    }

    // ── Shared computed-field definitions for Current FEGLI ──
    const CURRENT_FEGLI_COMPUTED = [
        { key: 'feglicodeactive', label: 'FEGLI Code',         isSelect: false, isCurrency: false },
        { key: 'feglinetcost',    label: 'Current FEGLI Cost', isSelect: false, isCurrency: true  },
        { key: 'basiclife',        label: 'Basic Life',        isSelect: false, isCurrency: true  },
        { key: 'optiona',          label: 'Option A',          isSelect: false, isCurrency: false },
        { key: 'optionb',          label: 'Option B',          isSelect: true,  isCurrency: false },
        { key: 'optionc',          label: 'Option C',          isSelect: true,  isCurrency: false },
    ];

    // ── Shared apply helper: applies computed result values to ACT form ──
    // Returns { applied, failed }. Works identically to the manual Apply button.
    function _applyCurrentFegliResults(computed) {
        suppressFegliValidation = true;
        setTimeout(() => { suppressFegliValidation = false; }, 2000);

        ActFieldMapper.scanFields(FEGLI_CALC_FIELDS);

        let applied = 0;
        const failed = [];

        CURRENT_FEGLI_COMPUTED.forEach(cf => {
            let newVal = computed[cf.key];
            if (newVal === null || newVal === undefined) return;
            if (cf.isCurrency) {
                const num = parseFloat(String(newVal).replace(/[^0-9.\-]/g, ''));
                if (!isNaN(num)) newVal = Math.round(num);
            }
            const ok = ActFieldMapper.setFieldValue(cf.key, String(newVal));
            if (ok) {
                applied++;
                if (apiContactData?.customFields) apiContactData.customFields[cf.key] = newVal;
            } else {
                failed.push(cf.label);
            }
        });

        return { applied, failed };
    }

    // ── Auto-run path: POST to endpoint + apply results silently ──
    async function _autoRunCurrentCalc(fields) {
        verboseDebug && console.log('[Copilot] Auto-running FEGLI calculation (verboseDebug=false)');
        try {
            const contactId = ActFieldMapper.getContactId();
            const payload   = { contactId, customFields: {} };
            for (const f of fields) payload.customFields[f.key] = f.value;
            if (payload.customFields.salaryamount) {
                payload.customFields.salaryamount = String(payload.customFields.salaryamount).replace(/^\$/, '').trim();
            }

            const calcData = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage(
                    { type: 'api_call', method: 'POST', path: '/api/proxy/calculatecurrent', body: payload },
                    (res) => {
                        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
                        if (!res) return reject(new Error('No response from background'));
                        resolve(res.data ?? res);
                    }
                );
            });

            if (!calcData.success) {
                toast('FEGLI calculation failed — server error', 'error');
                console.error('[Copilot] Auto-calc server error:', calcData);
                return;
            }

            const { applied, failed } = _applyCurrentFegliResults(calcData.result);

            if (failed.length === 0) {
                toast(`${applied} FEGLI fields updated`, 'success');
            } else {
                toast(`${applied} applied, ${failed.length} not found: ${failed.join(', ')}`, 'info');
            }
        } catch (err) {
            toast('FEGLI calculation failed: ' + err.message, 'error');
            console.error('[Copilot] Auto-calc error:', err);
        }
    }

    function _buildCalculateDialog() {
        function getVal(key) {
            const entry = fieldMap[key] || fieldMap[key.toLowerCase()];
            if (entry && entry.value !== undefined && entry.value !== null && entry.value !== '') {
                return entry.value;
            }
            // Fallback: apiContactData covers fields in OTHER tabs not currently loaded
            // (e.g. salaryamount lives in LES Info but user is on FEGLI tab)
            const custom = apiContactData?.customFields || {};
            return custom[key] || custom[key.toLowerCase()] || '';
        }
        // ── Calculate age from DOB if Age field is empty ─────
        function getAge() {
            // First: try the Age field directly
            const ageVal = getVal('ageyy');
            if (ageVal && ageVal !== '' && !isNaN(parseInt(ageVal))) return ageVal;

            // Second: calculate from DOB field
            const dobKeys = ['birth date', 'birthdate', 'birthday'];
            let dobStr = '';
            for (const k of dobKeys) {
                const v = getVal(k);
                if (v && v !== '') { dobStr = v; break; }
            }
            if (dobStr) {
                try {
                    const dob = new Date(dobStr);
                    if (!isNaN(dob.getTime())) {
                        const today = new Date();
                        let age = today.getFullYear() - dob.getFullYear();
                        const m = today.getMonth() - dob.getMonth();
                        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
                        return String(age);
                    }
                } catch (e) { /* ignore parse errors */ }
            }
            return '';
        }

        const fields = [
            // ── Required inputs ──────────────────────────────
            { key: 'ageyy',                 label: 'Age',                  value: getAge(),                        required: true  },
            { key: 'salaryamount',          label: 'Salary',               value: getVal('salaryamount'),          required: true  },
            // ── Conditional: need at least one ──────────────
            { key: 'feglicodeactive',      label: 'FEGLI Option Code',    value: getVal('feglicodeactive'),      required: false, conditional: 'fegli' },
            { key: 'fegliperpayperiod',     label: 'FEGLI Per Pay Period', value: getVal('fegliperpayperiod'),     required: false, conditional: 'fegli' },
            // ── Computed outputs (not required inputs) ──────
            { key: 'basiclife',             label: 'Basic Life',           value: getVal('basiclife'),             required: false, computed: true },
            { key: 'optiona',               label: 'Option A',            value: getVal('optiona'),               required: false, computed: true },
            { key: 'optionb',               label: 'Option B',            value: getVal('optionb'),               required: false, computed: true },
            { key: 'optionc',               label: 'Option C',            value: getVal('optionc'),               required: false, computed: true },
            { key: 'feglinetcost',          label: 'Current FEGLI Cost',  value: getVal('feglinetcost'),          required: false, computed: true },
        ];

        const missingRequired = fields.filter(f => f.required && (f.value === null || f.value === undefined || f.value === ''));
        // Conditional check: need at least FEGLI code OR FEGLI per pay period
        const fegliConditionals = fields.filter(f => f.conditional === 'fegli');
        const hasFegliInput = fegliConditionals.some(f => f.value !== null && f.value !== undefined && f.value !== '');

        const dataReady = missingRequired.length === 0 && hasFegliInput;

        // ────────────────────────────────────────────────────────
        //  STREAMLINED MODE (verboseDebug OFF + all data present)
        //  → auto-call endpoint + auto-apply, no dialog shown
        // ────────────────────────────────────────────────────────
        if (!verboseDebug && dataReady) {
            _autoRunCurrentCalc(fields);
            return;
        }

        // ────────────────────────────────────────────────────────
        //  SIMPLIFIED MISSING-DATA DIALOG (verboseDebug OFF)
        //  → only shows what's missing, with a close button
        // ────────────────────────────────────────────────────────
        if (!verboseDebug && !dataReady) {
            const issues = [];
            if (missingRequired.length > 0) {
                issues.push(...missingRequired.map(f => `• <b>${f.label}</b>`));
            }
            if (!hasFegliInput) {
                issues.push('• Need at least one: <b>FEGLI Code</b> or <b>FEGLI Per Pay Period</b>');
            }
            showValidationModal(
                'Missing Data for FEGLI Calculator',
                ['Please fill in the following fields, then click Calculate again:', ...issues],
                missingRequired.map(f => f.key),
                null, // onClose callback
                'Close' // custom button label
            );
            return;
        }

        // ────────────────────────────────────────────────────────
        //  VERBOSE DEBUG MODE (full developer dialog — unchanged)
        // ────────────────────────────────────────────────────────

        // ── Build field rows HTML ──────────────────────────
        const fieldRowsHtml = fields.map(f => {
            const isEmpty = (f.value === null || f.value === undefined || f.value === '');
            const isMissing = f.required && isEmpty;
            // For conditional FEGLI fields: show warning only if NEITHER has a value
            const isConditionalMissing = f.conditional === 'fegli' && !hasFegliInput;
            const displayVal = !isEmpty ? String(f.value) : '—';
            const dotColor = isMissing || isConditionalMissing ? '#ef4444' : f.computed ? '#818cf8' : '#34d399';
            const valColor = isMissing || isConditionalMissing ? '#fca5a5' : '#e2e8f0';
            const tag = f.required ? '<span style="color:#ef4444;font-size:9px;margin-left:4px">REQ</span>'
                      : f.computed ? '<span style="color:#818cf8;font-size:9px;margin-left:4px">OUT</span>'
                      : f.conditional ? '<span style="color:#f59e0b;font-size:9px;margin-left:4px">OR</span>' : '';

            return `
                <div style="display:flex;align-items:center;gap:5px;padding:2px 0;border-bottom:1px solid rgba(100,116,139,0.10)">
                    <span style="color:${dotColor};font-size:9px">●</span>
                    <span style="font-size:11px;color:#94a3b8;min-width:120px;white-space:nowrap">${f.label}${tag}</span>
                    <span style="font-size:11px;color:${valColor};font-family:monospace;flex:1;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:160px">${displayVal}</span>
                </div>
            `;
        }).join('');

        // ── Warning banner ─────────────────────────────────
        let warningHtml = '';
        if (missingRequired.length > 0 || !hasFegliInput) {
            const issues = [];
            if (missingRequired.length > 0) {
                issues.push(...missingRequired.map(f => `• ${f.label} <span style="color:#94a3b8;font-family:monospace">(${f.key})</span>`));
            }
            if (!hasFegliInput) {
                issues.push('• Need at least one: <b style="color:#f59e0b">FEGLI Code</b> or <b style="color:#f59e0b">FEGLI Per Pay Period</b>');
            }
            warningHtml = `
                <div style="background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.3);border-radius:10px;padding:10px 12px;margin-bottom:14px">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                        <span style="font-size:16px">🚨</span>
                        <span style="font-size:12px;font-weight:600;color:#fca5a5">Missing required data</span>
                    </div>
                    <div style="font-size:11px;color:#f87171;padding-left:28px">
                        ${issues.join('<br/>')}
                    </div>
                </div>
            `;
        }

        // ── Result display area (hidden initially) ─────────
        const resultAreaId = 'cp-calc-result-area';

        const overlay = document.createElement('div');
        overlay.id = 'cp-calc-dialog';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: transparent;
            z-index: 10003; pointer-events: none;
            font-family: 'Outfit', -apple-system, sans-serif;
            animation: cp-fade-in 0.2s ease;
        `;

        overlay.innerHTML = `
            <style>
                @keyframes cp-fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes cp-slide-up {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            </style>
            <div id="cp-calc-card" style="
                position: fixed; top: 60px; right: 20px;
                background: linear-gradient(135deg, #0f172a, #1e293b);
                border: 1px solid rgba(100, 116, 139, 0.3);
                border-radius: 16px; padding: 10px 14px; width: 420px; max-height: 85vh; overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                animation: cp-slide-up 0.3s ease;
                color: #e2e8f0; pointer-events: all;
            ">
                <div id="cp-calc-drag-handle" style="display:flex;align-items:center;gap:8px;margin-bottom:6px;cursor:grab;user-select:none">
                    <div style="width:36px;height:36px;flex-shrink:0;border-radius:10px;background:linear-gradient(135deg,#6366f1,#a855f7);display:flex;align-items:center;justify-content:center;font-size:18px">⚡</div>
                    <div style="flex:1">
                        <div style="font-size:15px;font-weight:700;color:#f8fafc">FEGLI Calculator <span style="font-size:10px;color:#475569;font-weight:400">⠿ drag</span></div>
                        <div style="font-size:11px;color:#94a3b8">${apiContactData?.firstName || ''} ${apiContactData?.lastName || '—'} &nbsp;·&nbsp; <span style="color:${validFegliCodes.length > 0 ? '#34d399' : '#ef4444'}">${validFegliCodes.length > 0 ? `✅ ${validFegliCodes.length} codes` : '❌ codes missing'}</span></div>
                    </div>
                    <button id="cp-calc-x" style="background:transparent;border:none;color:#64748b;font-size:18px;cursor:pointer;padding:0;line-height:1" title="Close">×</button>
                </div>

                ${warningHtml}

                <div style="background:rgba(30,41,59,0.7);border:1px solid rgba(100,116,139,0.3);border-radius:10px;padding:6px 8px;margin-bottom:6px">
                    <div style="font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px">Collected Fields</div>
                    ${fieldRowsHtml}
                </div>

                <div id="${resultAreaId}" style="display:none;background:rgba(30,41,59,0.7);border:1px solid rgba(100,116,139,0.3);border-radius:10px;padding:8px 10px;margin-bottom:8px"></div>

                <details style="margin-bottom:6px">
                    <summary style="font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:1px;cursor:pointer;user-select:none;list-style:none;display:flex;align-items:center;gap:4px">
                        <span>▶</span>
                        <span>Loaded FEGLI Codes (${validFegliCodes.length}) — click to verify</span>
                    </summary>
                    <div style="margin-top:4px;background:rgba(15,23,42,0.7);border:1px solid rgba(100,116,139,0.2);border-radius:6px;padding:6px 8px;font-size:10px;font-family:monospace;color:#7dd3fc;line-height:1.7;word-break:break-all">
                        ${validFegliCodes.length > 0 ? validFegliCodes.join(', ') : '<span style="color:#ef4444">⚠ No codes loaded — API may still be fetching</span>'}
                    </div>
                </details>

                <div style="font-size:10px;color:#64748b;margin-bottom:2px">ID: <span style="color:#a78bfa;font-family:monospace">${ActFieldMapper.getContactId() || 'N/A'}</span></div>
                <div style="background:rgba(15,23,42,0.6);border:1px solid rgba(100,116,139,0.2);border-radius:6px;padding:3px 10px;margin-bottom:4px;display:flex;align-items:center;gap:6px">
                    <span style="font-size:10px;color:#64748b;white-space:nowrap">📤 POST</span>
                    <span style="font-size:10px;color:#7dd3fc;font-family:monospace;white-space:nowrap">https://fedsafe-retirement.vercel.app/api/proxy/calculatecurrent</span>
                </div>

                <div style="display:flex;gap:8px">
                    <button id="cp-calc-cancel" style="
                        flex:1;padding:9px;border-radius:10px;border:1px solid rgba(100,116,139,0.3);
                        background:transparent;color:#94a3b8;font-size:13px;font-weight:600;
                        cursor:pointer;font-family:Outfit,sans-serif;
                    ">Cancel</button>
                    <button id="cp-calc-run" ${(missingRequired.length > 0 || !hasFegliInput) ? 'disabled' : ''} style="
                        flex:1;padding:9px;border-radius:10px;border:none;
                        background:${(missingRequired.length > 0 || !hasFegliInput) ? 'rgba(100,116,139,0.3)' : 'linear-gradient(135deg,#6366f1,#a855f7)'};
                        color:${(missingRequired.length > 0 || !hasFegliInput) ? '#64748b' : '#fff'};
                        font-size:13px;font-weight:600;
                        cursor:${(missingRequired.length > 0 || !hasFegliInput) ? 'not-allowed' : 'pointer'};
                        font-family:Outfit,sans-serif;
                    ">Run Calculation</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Close buttons
        document.getElementById('cp-calc-cancel').onclick = () => overlay.remove();
        document.getElementById('cp-calc-x').onclick     = () => overlay.remove();

        // ── Drag-to-move (whole card, same as other dialogs) ──
        const card = document.getElementById('cp-calc-card');
        let isDragging = false, dx = 0, dy = 0;

        card.style.cursor = 'move';

        card.addEventListener('mousedown', (e) => {
            if (['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
            isDragging = true;
            const rect = card.getBoundingClientRect();
            dx = e.clientX - rect.left;
            dy = e.clientY - rect.top;
            // Switch from right-anchored to left-anchored positioning
            card.style.right = 'auto';
            card.style.left  = rect.left + 'px';
            card.style.top   = rect.top  + 'px';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            card.style.left = (e.clientX - dx) + 'px';
            card.style.top  = (e.clientY - dy) + 'px';
        });

        document.addEventListener('mouseup', () => isDragging = false);

        // ── Run button: calculate → preview → Apply to form DOM ───
        document.getElementById('cp-calc-run').onclick = async () => {
            const runBtn     = document.getElementById('cp-calc-run');
            const resultArea = document.getElementById(resultAreaId);

            runBtn.textContent = '⏳ Calculating...';
            runBtn.style.opacity = '0.7';
            runBtn.disabled = true;

            try {
                // Step 1: Build payload
                const contactId = ActFieldMapper.getContactId();
                const payload   = { contactId, customFields: {} };
                for (const f of fields) payload.customFields[f.key] = f.value;
                // Strip $ from salary — backend expects raw number
                if (payload.customFields.salaryamount) {
                    payload.customFields.salaryamount = String(payload.customFields.salaryamount).replace(/^\$/, '').trim();
                }

                // ── Pre-flight client-side validation ─────────────
                // 1. Check FEGLI code is valid if provided (not required)
                // 2. Check required fields: Age + Salary
                // 3. Check conditional: need FEGLI code OR FEGLI amount
                const preflight = { errors: [], fieldsToFocus: [] };
                const fegliCode = (payload.customFields.feglicodeactive || '').trim().toUpperCase();

                // Note: FEGLI code format is validated server-side — no pre-flight check needed.
                // The iframe field validator handles real-time feedback when the user types.


                // Check hard-required fields (Age + Salary only)
                const missingFields = fields.filter(f => f.required && (!f.value || String(f.value).trim() === ''));
                for (const mf of missingFields) {
                    preflight.errors.push(`<b style="color:#fca5a5">${mf.label}</b> is required but empty`);
                    if (!preflight.fieldsToFocus.includes(mf.key)) {
                        preflight.fieldsToFocus.push(mf.key);
                    }
                }

                // Conditional: need at least FEGLI code OR FEGLI per pay period
                const fegliAmount = (payload.customFields.fegliperpayperiod || '').trim();
                if (!fegliCode && !fegliAmount) {
                    preflight.errors.push('Need at least one: <b style="color:#f59e0b">FEGLI Code</b> or <b style="color:#f59e0b">FEGLI Per Pay Period</b>');
                    preflight.fieldsToFocus.push('feglicodeactive');
                }


                if (preflight.errors.length > 0) {
                    runBtn.textContent = 'Run Calculation';
                    runBtn.style.background = 'linear-gradient(135deg,#6366f1,#a855f7)';
                    runBtn.style.color = '#fff';
                    runBtn.style.opacity = '1';
                    runBtn.disabled = false;
                    showValidationModal(
                        `${preflight.errors.length} Issue${preflight.errors.length > 1 ? 's' : ''} Found`,
                        preflight.errors,
                        preflight.fieldsToFocus
                    );
                    return;
                }

                // ── Debug: Show payload BEFORE sending ─────────────

                resultArea.style.display = 'block';
                resultArea.innerHTML = `
                    <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">
                        📤 Sending to Server
                    </div>
                    <pre style="background:rgba(15,23,42,0.8);border:1px solid rgba(100,116,139,0.2);border-radius:8px;
                        padding:10px;font-size:10px;color:#7dd3fc;font-family:monospace;
                        white-space:pre-wrap;overflow-x:auto;max-height:200px;overflow-y:auto;margin:0"
                    >${JSON.stringify(payload, null, 2)}</pre>
                    <div style="margin-top:8px;font-size:11px;color:#64748b">⏳ Waiting for server...</div>
                `;

                // Step 2: POST to /proxy/calculatecurrent via background worker (CORS-exempt)
                const calcData = await new Promise((resolve, reject) => {
                    chrome.runtime.sendMessage(
                        { type: 'api_call', method: 'POST', path: '/api/proxy/calculatecurrent', body: payload },
                        (res) => {
                            if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
                            if (!res) return reject(new Error('No response from background'));
                            resolve(res.data ?? res);
                        }
                    );
                });

                if (!calcData.success) {
                    resultArea.innerHTML = `
                        <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">📤 Sent</div>
                        <pre style="background:rgba(15,23,42,0.8);border:1px solid rgba(100,116,139,0.2);border-radius:8px;
                            padding:10px;font-size:10px;color:#7dd3fc;font-family:monospace;white-space:pre-wrap;margin:0 0 10px 0"
                        >${JSON.stringify(payload, null, 2)}</pre>
                        <div style="font-size:10px;color:#f87171;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">📥 Server Response (Error)</div>
                        <pre style="background:rgba(15,23,42,0.8);border:1px solid rgba(239,68,68,0.3);border-radius:8px;
                            padding:10px;font-size:10px;color:#f87171;font-family:monospace;white-space:pre-wrap;margin:0"
                        >${JSON.stringify(calcData, null, 2)}</pre>
                    `;
                    runBtn.textContent = '⚠ Failed';
                    runBtn.style.background = 'linear-gradient(135deg,#d97706,#fbbf24)';
                    runBtn.style.color = '#0f172a';
                    runBtn.style.opacity = '1';
                    runBtn.disabled = false;
                    toast('Server returned error — check JSON below', 'error');
                    return;
                }

                const computed = calcData.result;

                // Step 3: Build before→after preview table
                // optionb + optionc are combo boxes (select elements)
                const computedFields = [
                    { key: 'feglicodeactive', label: 'FEGLI Code',         isSelect: false, isCurrency: false },
                    { key: 'feglinetcost',    label: 'Current FEGLI Cost', isSelect: false, isCurrency: true  },
                    { key: 'basiclife',        label: 'Basic Life',        isSelect: false, isCurrency: true  },
                    { key: 'optiona',          label: 'Option A',          isSelect: false, isCurrency: false },
                    { key: 'optionb',          label: 'Option B',          isSelect: true,  isCurrency: false },
                    { key: 'optionc',          label: 'Option C',          isSelect: true,  isCurrency: false },
                ];

                const prevCustom = apiContactData?.customFields || {};

                const rowsHtml = computedFields.map((cf, idx) => {
                    const oldVal     = prevCustom[cf.key];
                    const newVal     = computed[cf.key];
                    const changed    = String(oldVal) !== String(newVal);
                    const displayOld = (oldVal === null || oldVal === undefined || oldVal === '') ? '—' : String(oldVal);
                    const displayNew = (newVal === null || newVal === undefined || newVal === '') ? '—' : String(newVal);
                    const typeTag    = cf.isSelect ? '<span style="font-size:9px;color:#64748b;margin-left:4px">[combo]</span>' : '';
                    return `
                        <div style="display:flex;align-items:center;gap:8px;padding:5px 2px;border-bottom:1px solid rgba(100,116,139,0.12);font-size:12px">
                            <span id="cp-calc-status-${idx}" style="font-size:13px;min-width:18px">${changed ? '🔄' : '➖'}</span>
                            <span style="color:#94a3b8;min-width:100px">${cf.label}${typeTag}</span>
                            <span style="color:#475569;text-decoration:${changed ? 'line-through' : 'none'};font-family:monospace;font-size:11px">${displayOld}</span>
                            ${changed ? `<span style="color:#64748b;font-size:10px">→</span><span style="color:#a78bfa;font-family:monospace;font-size:12px;font-weight:600">${displayNew}</span>` : ''}
                        </div>
                    `;
                }).join('');

                // ── Show: sent JSON + received JSON + preview ───────
                resultArea.innerHTML = `
                    <details style="margin-bottom:8px">
                        <summary style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;cursor:pointer;padding:4px 0">
                            📤 Sent to Server ▾
                        </summary>
                        <pre style="background:rgba(15,23,42,0.8);border:1px solid rgba(100,116,139,0.2);border-radius:8px;
                            padding:10px;font-size:10px;color:#7dd3fc;font-family:monospace;white-space:pre-wrap;
                            overflow-x:auto;max-height:160px;overflow-y:auto;margin:4px 0 0 0"
                        >${JSON.stringify(payload, null, 2)}</pre>
                    </details>

                    <details style="margin-bottom:10px" open>
                        <summary style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;cursor:pointer;padding:4px 0">
                            📥 Server Response ▾
                        </summary>
                        <pre style="background:rgba(15,23,42,0.8);border:1px solid rgba(100,116,139,0.2);border-radius:8px;
                            padding:10px;font-size:10px;color:#86efac;font-family:monospace;white-space:pre-wrap;
                            overflow-x:auto;max-height:160px;overflow-y:auto;margin:4px 0 0 0"
                        >${JSON.stringify(calcData, null, 2)}</pre>
                    </details>

                    <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">
                        Preview — Changes to Apply
                    </div>
                    ${rowsHtml}
                    <div style="margin-top:6px;font-size:11px;color:#64748b;margin-bottom:6px">
                        ℹ️ Values fill the Act! form. <b style="color:#94a3b8">You save at your own pace.</b>
                    </div>
                    <button id="cp-calc-apply-btn" style="
                        width:100%;padding:9px;border-radius:10px;border:none;
                        background:linear-gradient(135deg,#22c55e,#16a34a);
                        color:#fff;font-size:13px;font-weight:700;
                        cursor:pointer;font-family:Outfit,sans-serif;
                    ">✓ Apply to Form — save when ready</button>
                    <div id="cp-calc-apply-status" style="min-height:14px;margin-top:4px"></div>
                `;

                runBtn.textContent = '↩ Recalculate';
                runBtn.style.background = 'rgba(100,116,139,0.3)';
                runBtn.style.color = '#94a3b8';
                runBtn.style.opacity = '1';
                runBtn.disabled = false;

                toast('Calculation done — review JSON & Apply', 'success');

                // Step 4: Apply button — uses the SAME method as the side panel field editor.
                // ActFieldMapper.scanPage() from the top frame walks all same-origin iframes
                // via collectDocuments(), so setFieldValue() directly sets elements in the
                // ContactDetail iframe without any postMessage needed.
                document.getElementById('cp-calc-apply-btn').onclick = () => {
                    const applyBtn    = document.getElementById('cp-calc-apply-btn');
                    const applyStatus = document.getElementById('cp-calc-apply-status');
                    applyBtn.textContent = '⏳ Applying...';
                    applyBtn.disabled = true;

                    // Suppress FEGLI validation for 2s — setFieldValue fires blur which
                    // triggers the iframe validator. Clear after fields are settled.
                    suppressFegliValidation = true;
                    setTimeout(() => { suppressFegliValidation = false; }, 2000);

                    // Build the field→value map from computed results
                    const fieldValues = {};
                    computedFields.forEach(cf => {
                        const newVal = computed[cf.key];
                        if (newVal !== null && newVal !== undefined) {
                            fieldValues[cf.key] = String(newVal);
                        }
                    });

                    // Targeted scan: only the 8 FEGLI fields we're about to write.
                    // Identical to how the side panel editor works, but scoped to
                    // only the fields we need instead of all 57.
                    ActFieldMapper.scanFields(FEGLI_CALC_FIELDS);

                    let applied = 0;
                    const failed = [];

                    computedFields.forEach((cf, idx) => {
                        let newVal = computed[cf.key];
                        if (newVal === null || newVal === undefined) return;

                        // ACT integer-only fields — strip decimals
                        if (cf.isCurrency) {
                            const num = parseFloat(String(newVal).replace(/[^0-9.\-]/g, ''));
                            if (!isNaN(num)) newVal = Math.round(num);
                        }

                        const statusEl = document.getElementById(`cp-calc-status-${idx}`);
                        const ok = ActFieldMapper.setFieldValue(cf.key, String(newVal));

                        if (ok) {
                            applied++;
                            if (statusEl) statusEl.textContent = '✅';
                            if (apiContactData?.customFields) apiContactData.customFields[cf.key] = newVal;
                        } else {
                            failed.push(cf.label);
                            if (statusEl) statusEl.textContent = '❌';
                        }
                    });

                    if (failed.length === 0) {
                        toast(`${applied} fields applied — save when ready`, 'success');
                        overlay.remove();
                    } else {
                        applyBtn.textContent = `⚠ ${applied} applied, ${failed.length} not found`;
                        applyBtn.style.background = 'linear-gradient(135deg,#d97706,#fbbf24)';
                        applyBtn.style.color = '#0f172a';
                        applyStatus.innerHTML = `<div style="font-size:10px;color:#fbbf24">⚠ Not found: ${failed.join(', ')}</div>`;
                        toast(`Applied ${applied}, not found: ${failed.join(', ')}`, 'info');
                        applyBtn.disabled = false;
                    }
                };

            } catch (err) {
                runBtn.textContent = '✗ Error';
                runBtn.style.background = '#dc2626';
                runBtn.style.color = '#fff';
                runBtn.style.opacity = '1';
                runBtn.disabled = false;
                toast('Calculation failed: ' + err.message, 'error');
                console.error('[Copilot] Calculate error:', err);
            }
        };
    }

    // ═══════════════════════════════════════════════════════
    //  Calculate Retirement Dialog
    // ═══════════════════════════════════════════════════════
    const RETIREMENT_CALC_FIELDS = [
        'salaryamount',
        'feglicostage', 'feglireduction',          // retirement-specific inputs
        'optiona', 'optionb', 'optionc',            // fallback current values
        'optiona_retire', 'optionb_retire', 'optionc_retire', // retirement overrides
        'basicliferetired', 'lessfegliretired', 'lessfegliretire', 'calculatedlessfegli', // computed outputs (scan all variants)
    ];

    async function showRetirementDialog() {
        const existing = document.getElementById('cp-retire-dialog');
        if (existing) existing.remove();

        fieldMap = ActFieldMapper.scanFields(RETIREMENT_CALC_FIELDS);

        document.querySelectorAll('iframe, frame').forEach(f => {
            try { f.contentWindow.postMessage({ type: 'ACT_COPILOT_RESCAN' }, '*'); } catch {}
        });

        if (!apiContactData) {
            try {
                const contactId = ActFieldMapper.getContactId();
                if (contactId) {
                    const data = await actProxyFetch('/contact/' + contactId);
                    apiContactData = data;
                    verboseDebug && console.log('[Copilot] Auto-loaded API data for retirement calc');
                }
            } catch (e) {
                verboseDebug && console.log('[Copilot] Auto-load API data failed:', e.message);
            }
        }

        setTimeout(() => _buildRetirementDialog(), 700);
    }

    // ── Shared computed-field definitions for Retirement FEGLI ──
    const RETIREMENT_FEGLI_COMPUTED = [
        { key: 'basicliferetired',  resultKey: 'basicliferetire',  label: 'Basic Life Retire',  isSelect: false, isCurrency: true },
        { key: 'optiona_retire',    resultKey: 'optiona_retire',   label: 'Option A Retire',    isSelect: false },
        { key: 'optionb_retire',    resultKey: 'optionb_retire',   label: 'Option B Retire',    isSelect: true  },
        { key: 'optionc_retire',    resultKey: 'optionc_retire',   label: 'Option C Retire',    isSelect: true  },
        { key: 'lessfegliretired',  resultKey: 'lessfegliretire',  label: 'Retired FEGLI Cost', isSelect: false, altKey: 'calculatedlessfegli', isCurrency: true },
    ];

    // ── Shared apply helper for retirement results ──
    function _applyRetirementResults(computed) {
        suppressFegliValidation = true;
        setTimeout(() => { suppressFegliValidation = false; }, 2000);

        ActFieldMapper.scanFields(RETIREMENT_CALC_FIELDS);

        let applied = 0;
        const failed = [];

        RETIREMENT_FEGLI_COMPUTED.forEach(cf => {
            let newVal = computed[cf.resultKey];
            if (newVal === null || newVal === undefined) return;
            if (cf.isCurrency) {
                const num = parseFloat(String(newVal).replace(/[^0-9.\-]/g, ''));
                if (!isNaN(num)) newVal = Math.round(num);
            }
            let ok = ActFieldMapper.setFieldValue(cf.key, String(newVal));
            if (!ok && cf.resultKey !== cf.key) {
                ok = ActFieldMapper.setFieldValue(cf.resultKey, String(newVal));
                if (ok) verboseDebug && console.log(`[Copilot] Fallback key worked: ${cf.resultKey} (primary ${cf.key} failed)`);
            }
            if (!ok && cf.altKey) {
                ok = ActFieldMapper.setFieldValue(cf.altKey, String(newVal));
                if (ok) verboseDebug && console.log(`[Copilot] Alt key worked: ${cf.altKey} (primary ${cf.key} failed)`);
            }
            if (ok) {
                applied++;
                if (apiContactData?.customFields) apiContactData.customFields[cf.key] = newVal;
            } else {
                failed.push(cf.label);
            }
        });
        // Cache Retired FEGLI Cost for use by the Income tab 'fegli' field.
        // The Income tab iframe receives this value via postMessage when it loads (see ACT_COPILOT_RESCAN handler).
        // Do NOT write the retired value to feglinetcost/feglicost here — those keys map to
        // 'Current FEGLI Cost' on the FEGLI tab and must only be updated by Calculate Current.
        const retiredFegliCost = computed['lessfegliretire'];
        if (retiredFegliCost !== null && retiredFegliCost !== undefined) {
            const fegliVal = Math.round(parseFloat(String(retiredFegliCost).replace(/[^0-9.-]/g, '')));
            if (!isNaN(fegliVal)) {
                _cachedRetiredFegliCost = fegliVal;
                verboseDebug && console.log(`[Copilot] Cached Retired FEGLI Cost: $${fegliVal} (Income tab will receive on next scan)`);
            }
        }

        return { applied, failed };
    }

    // ── Auto-run path for retirement calc ──
    async function _autoRunRetirementCalc(fields) {
        verboseDebug && console.log('[Copilot] Auto-running Retirement calculation (verboseDebug=false)');
        try {
            const contactId = ActFieldMapper.getContactId();
            const payload   = { contactId, customFields: {} };
            for (const f of fields) payload.customFields[f.key] = f.value;
            if (payload.customFields.salaryamount) {
                payload.customFields.salaryamount = String(payload.customFields.salaryamount).replace(/^\$/, '').trim();
            }

            const calcData = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage(
                    { type: 'api_call', method: 'POST', path: '/api/proxy/calculateretirement', body: payload },
                    (res) => {
                        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
                        if (!res) return reject(new Error('No response from background'));
                        resolve(res.data ?? res);
                    }
                );
            });

            if (!calcData.success) {
                toast('Retirement calculation failed — server error', 'error');
                console.error('[Copilot] Auto-retire server error:', calcData);
                return;
            }

            const { applied, failed } = _applyRetirementResults(calcData.result);

            if (failed.length === 0) {
                toast(`${applied} retirement fields updated`, 'success');
            } else {
                toast(`${applied} applied, ${failed.length} not found: ${failed.join(', ')}`, 'info');
            }
        } catch (err) {
            toast('Retirement calculation failed: ' + err.message, 'error');
            console.error('[Copilot] Auto-retire error:', err);
        }
    }

    function _buildRetirementDialog() {
        function getVal(key) {
            const entry = fieldMap[key] || fieldMap[key.toLowerCase()];
            if (entry && entry.value !== undefined && entry.value !== null && entry.value !== '') {
                return entry.value;
            }
            const custom = apiContactData?.customFields || {};
            return custom[key] || custom[key.toLowerCase()] || '';
        }

        function getAge() {
            const ageVal = getVal('ageyy');
            if (ageVal && ageVal !== '' && !isNaN(parseInt(ageVal))) return ageVal;
            const dob = getVal('birth date') || getVal('birthdate') || getVal('birthday');
            if (!dob) return '';
            const bDate = new Date(dob);
            if (isNaN(bDate.getTime())) return '';
            const diff = Date.now() - bDate.getTime();
            return String(Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000)));
        }

        const fields = [
            // ── Required inputs ──────────────────────────────
            { key: 'salaryamount',      label: 'Salary',              value: getVal('salaryamount'),      required: true  },
            { key: 'feglicostage',      label: 'Projected FEGLI Age', value: getVal('feglicostage'),      required: true  },
            // ── Optional inputs (with defaults) ──────────────
            { key: 'feglireduction',    label: 'Reduction',           value: getVal('feglireduction') || '75', required: false },
            { key: 'optiona_retire',    label: 'Option A Retire',     value: getVal('optiona_retire') || getVal('optiona'),    required: false },
            { key: 'optionb_retire',    label: 'Option B Retire',     value: getVal('optionb_retire') || getVal('optionb'),    required: false },
            { key: 'optionc_retire',    label: 'Option C Retire',     value: getVal('optionc_retire') || getVal('optionc'),    required: false },
            // ── Computed outputs ─────────────────────────────
            { key: 'basicliferetired',  label: 'Basic Life Retire',   value: getVal('basicliferetired'),  required: false, computed: true },
            { key: 'lessfegliretired',  label: 'Retired FEGLI Cost',  value: getVal('lessfegliretired'),  required: false, computed: true },
        ];

        const missingRequired = fields.filter(f => f.required && (f.value === null || f.value === undefined || f.value === ''));
        const dataReady = missingRequired.length === 0;

        // ────────────────────────────────────────────────────────
        //  STREAMLINED MODE (verboseDebug OFF + all data present)
        // ────────────────────────────────────────────────────────
        if (!verboseDebug && dataReady) {
            _autoRunRetirementCalc(fields);
            return;
        }

        // ────────────────────────────────────────────────────────
        //  SIMPLIFIED MISSING-DATA DIALOG (verboseDebug OFF)
        // ────────────────────────────────────────────────────────
        if (!verboseDebug && !dataReady) {
            showValidationModal(
                'Missing Data for Retirement Calculator',
                ['Please fill in the following fields, then click Calculate Retirement again:',
                 ...missingRequired.map(f => `• <b>${f.label}</b>`)],
                missingRequired.map(f => f.key),
                null, // onClose callback
                'Close' // custom button label
            );
            return;
        }

        // ────────────────────────────────────────────────────────
        //  VERBOSE DEBUG MODE (full developer dialog — unchanged)
        // ────────────────────────────────────────────────────────

        const codesReady = typeof fegliCodesLoaded !== 'undefined' && fegliCodesLoaded;
        const codeCount  = typeof fegliValidCodes !== 'undefined' ? Object.keys(fegliValidCodes || {}).length : 0;

        const resultAreaId = 'cp-retire-result-area';

        const rowsHtml = fields.map(f => {
            const tagColor = f.required ? '#ef4444' : (f.conditional ? '#f59e0b' : (f.computed ? '#6366f1' : '#475569'));
            const tag = f.required ? 'REQ' : (f.conditional ? 'OR' : (f.computed ? 'OUT' : ''));
            const valueStr = (f.value !== null && f.value !== undefined && f.value !== '') ? String(f.value) : '\u2014';
            const valueColor = (valueStr === '\u2014') ? '#475569' : '#e2e8f0';
            return `<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;border-bottom:1px solid rgba(100,116,139,0.1);font-size:12px">
                <span style="color:#94a3b8">\u2022 ${f.label} <span style="font-size:9px;color:${tagColor};font-weight:700">${tag}</span></span>
                <span style="color:${valueColor};font-family:monospace;font-size:12px;font-weight:${valueStr !== '\u2014' ? '600' : '400'}">${valueStr}</span>
            </div>`;
        }).join('');

        const overlay = document.createElement('div');
        overlay.id = 'cp-retire-dialog';
        overlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;z-index:2147483646;display:flex;align-items:center;justify-content:center;pointer-events:none;`;

        const card = document.createElement('div');
        card.style.cssText = `pointer-events:auto;background:#0f172a;color:#e2e8f0;border-radius:16px;padding:14px 16px;width:370px;max-height:85vh;overflow-y:auto;box-shadow:0 25px 50px -12px rgba(0,0,0,.5);font-family:system-ui,-apple-system,sans-serif;border:1px solid rgba(239,68,68,.3);cursor:move;`;

        card.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;cursor:grab" id="cp-retire-handle">
                <div style="display:flex;align-items:center;gap:8px">
                    <span style="font-size:18px">\ud83d\udcc9</span>
                    <div>
                        <div style="font-size:14px;font-weight:700;color:#f87171">FEGLI Retirement Calculator</div>
                        <div style="font-size:10px;color:#94a3b8">${apiContactData?.name || 'Contact'} \u00b7 ${codesReady ? '\u2705' : '\u26a0\ufe0f'} ${codeCount} codes</div>
                    </div>
                </div>
                <span id="cp-retire-x" style="font-size:18px;cursor:pointer;color:#64748b;padding:4px">\u2715</span>
            </div>

            <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Collected Fields</div>
            ${rowsHtml}

            <details style="margin-top:8px;margin-bottom:6px">
                <summary style="font-size:10px;color:#64748b;cursor:pointer;text-transform:uppercase;letter-spacing:1px">\u25b6 Loaded FEGLI Codes (${codeCount}) \u2014 click to verify</summary>
                <div style="font-size:9px;color:#475569;max-height:80px;overflow-y:auto;padding:4px 0">
                    ${typeof fegliValidCodes !== 'undefined' ? Object.keys(fegliValidCodes || {}).sort().join(', ') : 'Not loaded'}
                </div>
            </details>

            <div style="font-size:10px;color:#64748b;margin-bottom:2px">ID: <span style="color:#a78bfa;font-family:monospace">${ActFieldMapper.getContactId() || 'N/A'}</span></div>
            <div style="background:rgba(15,23,42,0.6);border:1px solid rgba(100,116,139,0.2);border-radius:6px;padding:3px 10px;margin-bottom:4px;display:flex;align-items:center;gap:6px">
                <span style="font-size:10px;color:#64748b;white-space:nowrap">\ud83d\udce4 POST</span>
                <span style="font-size:10px;color:#7dd3fc;font-family:monospace;white-space:nowrap">https://fedsafe-retirement.vercel.app/api/proxy/calculateretirement</span>
            </div>

            <div style="display:flex;gap:8px">
                <button id="cp-retire-cancel" style="flex:1;padding:9px;border-radius:10px;border:1px solid rgba(100,116,139,0.3);background:transparent;color:#94a3b8;font-size:12px;font-weight:600;cursor:pointer">Cancel</button>
                <button id="cp-retire-run" style="flex:2;padding:9px;border-radius:10px;border:none;background:linear-gradient(135deg,#dc2626,#f87171);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:Outfit,sans-serif">\ud83d\udcc9 Run Retirement Calc</button>
            </div>

            <div id="${resultAreaId}" style="display:none;margin-top:10px"></div>
        `;

        overlay.appendChild(card);
        document.body.appendChild(overlay);

        document.getElementById('cp-retire-x').onclick = () => overlay.remove();
        document.getElementById('cp-retire-cancel').onclick = () => overlay.remove();

        // Draggable
        const handle = document.getElementById('cp-retire-handle');
        let dragging = false, startX, startY, origLeft, origTop;
        handle.addEventListener('mousedown', (e) => {
            if (e.target.id === 'cp-retire-x') return;
            dragging = true;
            const rect = card.getBoundingClientRect();
            startX = e.clientX; startY = e.clientY;
            origLeft = rect.left; origTop = rect.top;
            // Break out of flex layout so left/top work
            card.style.position = 'fixed';
            card.style.margin   = '0';
            card.style.right    = 'auto';
            card.style.left     = origLeft + 'px';
            card.style.top      = origTop  + 'px';
            handle.style.cursor = 'grabbing';
            e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => {
            if (!dragging) return;
            card.style.left = (origLeft + e.clientX - startX) + 'px';
            card.style.top  = (origTop  + e.clientY - startY) + 'px';
        });
        document.addEventListener('mouseup', () => {
            if (!dragging) return;
            dragging = false;
            handle.style.cursor = 'grab';
        });

        // ── Run button ───────────────────────────────────────
        document.getElementById('cp-retire-run').onclick = async () => {
            const runBtn     = document.getElementById('cp-retire-run');
            const resultArea = document.getElementById(resultAreaId);

            runBtn.textContent = '\u23f3 Calculating...';
            runBtn.style.opacity = '0.7';
            runBtn.disabled = true;

            try {
                const contactId = ActFieldMapper.getContactId();
                const payload   = { contactId, customFields: {} };
                for (const f of fields) payload.customFields[f.key] = f.value;
                // Strip $ from salary — backend expects raw number
                if (payload.customFields.salaryamount) {
                    payload.customFields.salaryamount = String(payload.customFields.salaryamount).replace(/^\$/, '').trim();
                }

                // Pre-flight validation
                const preflight = { errors: [], fieldsToFocus: [] };
                const missingFields = fields.filter(f => f.required && (!f.value || String(f.value).trim() === ''));
                for (const mf of missingFields) {
                    preflight.errors.push(`<b style="color:#fca5a5">${mf.label}</b> is required but empty`);
                    if (!preflight.fieldsToFocus.includes(mf.key)) preflight.fieldsToFocus.push(mf.key);
                }

                // Retirement calc requires salary + feglicostage only
                // (no fegli code conditional needed)

                if (preflight.errors.length > 0) {
                    runBtn.textContent = '\ud83d\udcc9 Run Retirement Calc';
                    runBtn.style.background = 'linear-gradient(135deg,#dc2626,#f87171)';
                    runBtn.style.opacity = '1';
                    runBtn.disabled = false;
                    showValidationModal(`${preflight.errors.length} Issue${preflight.errors.length > 1 ? 's' : ''} Found`, preflight.errors, preflight.fieldsToFocus);
                    return;
                }

                resultArea.style.display = 'block';
                resultArea.innerHTML = `
                    <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">\ud83d\udce4 Sending to Server</div>
                    <pre style="background:rgba(15,23,42,0.8);border:1px solid rgba(100,116,139,0.2);border-radius:8px;padding:10px;font-size:10px;color:#7dd3fc;font-family:monospace;white-space:pre-wrap;overflow-x:auto;max-height:200px;overflow-y:auto;margin:0">${JSON.stringify(payload, null, 2)}</pre>
                    <div style="margin-top:8px;font-size:11px;color:#64748b">\u23f3 Waiting for server...</div>
                `;

                const calcData = await new Promise((resolve, reject) => {
                    chrome.runtime.sendMessage(
                        { type: 'api_call', method: 'POST', path: '/api/proxy/calculateretirement', body: payload },
                        (res) => {
                            if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
                            if (!res) return reject(new Error('No response from background'));
                            resolve(res.data ?? res);
                        }
                    );
                });

                if (!calcData.success) {
                    resultArea.innerHTML = `
                        <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">\ud83d\udce4 Sent</div>
                        <pre style="background:rgba(15,23,42,0.8);border:1px solid rgba(100,116,139,0.2);border-radius:8px;padding:10px;font-size:10px;color:#7dd3fc;font-family:monospace;white-space:pre-wrap;margin:0 0 10px 0">${JSON.stringify(payload, null, 2)}</pre>
                        <div style="font-size:10px;color:#f87171;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">\ud83d\udce5 Server Response (Error)</div>
                        <pre style="background:rgba(15,23,42,0.8);border:1px solid rgba(239,68,68,0.3);border-radius:8px;padding:10px;font-size:10px;color:#f87171;font-family:monospace;white-space:pre-wrap;margin:0">${JSON.stringify(calcData, null, 2)}</pre>
                    `;
                    runBtn.textContent = '\u26a0 Failed';
                    runBtn.style.background = 'linear-gradient(135deg,#d97706,#fbbf24)';
                    runBtn.style.color = '#0f172a';
                    runBtn.style.opacity = '1';
                    runBtn.disabled = false;
                    toast('Server returned error \u2014 check JSON below', 'error');
                    return;
                }

                const computed = calcData.result;

                // Response keys may differ from ACT field keys:
                // basicliferetire → basicliferetired, lessfegliretire → lessfegliretired
                const computedFields = [
                    { key: 'basicliferetired',  resultKey: 'basicliferetire',  label: 'Basic Life Retire',  isSelect: false, isCurrency: true },
                    { key: 'optiona_retire',    resultKey: 'optiona_retire',   label: 'Option A Retire',    isSelect: false },
                    { key: 'optionb_retire',    resultKey: 'optionb_retire',   label: 'Option B Retire',    isSelect: true  },
                    { key: 'optionc_retire',    resultKey: 'optionc_retire',   label: 'Option C Retire',    isSelect: true  },
                    { key: 'lessfegliretired',  resultKey: 'lessfegliretire',  label: 'Retired FEGLI Cost', isSelect: false, altKey: 'calculatedlessfegli', isCurrency: true },
                ];

                const prevCustom = apiContactData?.customFields || {};

                const previewRows = computedFields.map((cf, idx) => {
                    const oldVal     = prevCustom[cf.key];
                    const newVal     = computed[cf.resultKey];
                    const changed    = String(oldVal) !== String(newVal);
                    const displayOld = (oldVal === null || oldVal === undefined || oldVal === '') ? '\u2014' : String(oldVal);
                    const displayNew = (newVal === null || newVal === undefined || newVal === '') ? '\u2014' : String(newVal);
                    const typeTag    = cf.isSelect ? '<span style="font-size:9px;color:#64748b;margin-left:4px">[combo]</span>' : '';
                    return `<div style="display:flex;align-items:center;gap:8px;padding:5px 2px;border-bottom:1px solid rgba(100,116,139,0.12);font-size:12px">
                        <span id="cp-retire-status-${idx}" style="font-size:13px;min-width:18px">${changed ? '\ud83d\udd04' : '\u2796'}</span>
                        <span style="color:#94a3b8;min-width:100px">${cf.label}${typeTag}</span>
                        <span style="color:#475569;text-decoration:${changed ? 'line-through' : 'none'};font-family:monospace;font-size:11px">${displayOld}</span>
                        ${changed ? `<span style="color:#64748b;font-size:10px">\u2192</span><span style="color:#f87171;font-family:monospace;font-size:12px;font-weight:600">${displayNew}</span>` : ''}
                    </div>`;
                }).join('');

                resultArea.innerHTML = `
                    <details style="margin-bottom:8px">
                        <summary style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;cursor:pointer;padding:4px 0">\ud83d\udce4 Sent to Server \u25be</summary>
                        <pre style="background:rgba(15,23,42,0.8);border:1px solid rgba(100,116,139,0.2);border-radius:8px;padding:10px;font-size:10px;color:#7dd3fc;font-family:monospace;white-space:pre-wrap;overflow-x:auto;max-height:160px;overflow-y:auto;margin:4px 0 0 0">${JSON.stringify(payload, null, 2)}</pre>
                    </details>
                    <details style="margin-bottom:10px" open>
                        <summary style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;cursor:pointer;padding:4px 0">\ud83d\udce5 Server Response \u25be</summary>
                        <pre style="background:rgba(15,23,42,0.8);border:1px solid rgba(100,116,139,0.2);border-radius:8px;padding:10px;font-size:10px;color:#86efac;font-family:monospace;white-space:pre-wrap;overflow-x:auto;max-height:160px;overflow-y:auto;margin:4px 0 0 0">${JSON.stringify(calcData, null, 2)}</pre>
                    </details>
                    <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Preview \u2014 Changes to Apply</div>
                    ${previewRows}
                    <div style="margin-top:6px;font-size:11px;color:#64748b;margin-bottom:6px">\u2139\ufe0f Values fill the Act! form. <b style="color:#94a3b8">You save at your own pace.</b></div>
                    <button id="cp-retire-apply-btn" style="width:100%;padding:9px;border-radius:10px;border:none;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:Outfit,sans-serif">\u2713 Apply to Form \u2014 save when ready</button>
                    <div id="cp-retire-apply-status" style="min-height:14px;margin-top:4px"></div>
                `;

                runBtn.textContent = '\u21a9 Recalculate';
                runBtn.style.background = 'rgba(100,116,139,0.3)';
                runBtn.style.color = '#94a3b8';
                runBtn.style.opacity = '1';
                runBtn.disabled = false;
                toast('Retirement calculation done \u2014 review & Apply', 'success');

                // Apply button
                document.getElementById('cp-retire-apply-btn').onclick = () => {
                    const applyBtn    = document.getElementById('cp-retire-apply-btn');
                    const applyStatus = document.getElementById('cp-retire-apply-status');
                    applyBtn.textContent = '\u23f3 Applying...';
                    applyBtn.disabled = true;

                    suppressFegliValidation = true;
                    setTimeout(() => { suppressFegliValidation = false; }, 2000);

                    ActFieldMapper.scanFields(RETIREMENT_CALC_FIELDS);

                    let applied = 0;
                    const failed = [];

                    computedFields.forEach((cf, idx) => {
                        let newVal = computed[cf.resultKey];
                        if (newVal === null || newVal === undefined) return;

                        // ACT money fields have no decimals — round currency values
                        if (cf.isCurrency) {
                            const num = parseFloat(String(newVal).replace(/[^0-9.\-]/g, ''));
                            if (!isNaN(num)) newVal = Math.round(num);
                        }

                        const statusEl = document.getElementById(`cp-retire-status-${idx}`);
                        // Try primary ACT key, then fallback to response key, then alternate ACT name
                        let ok = ActFieldMapper.setFieldValue(cf.key, String(newVal));
                        if (!ok && cf.resultKey !== cf.key) {
                            ok = ActFieldMapper.setFieldValue(cf.resultKey, String(newVal));
                            if (ok) verboseDebug && console.log(`[Copilot] Fallback key worked: ${cf.resultKey} (primary ${cf.key} failed)`);
                        }
                        // Special fallback: ACT stores "Retired FEGLI Cost" as CalculatedLessFEGLI on a custom table
                        if (!ok && cf.altKey) {
                            ok = ActFieldMapper.setFieldValue(cf.altKey, String(newVal));
                            if (ok) verboseDebug && console.log(`[Copilot] Alt key worked: ${cf.altKey} (primary ${cf.key} failed)`);
                        }

                        if (ok) {
                            applied++;
                            if (statusEl) statusEl.textContent = '\u2705';
                            if (apiContactData?.customFields) apiContactData.customFields[cf.key] = newVal;
                        } else {
                            failed.push(cf.label);
                            if (statusEl) statusEl.textContent = '\u274c';
                        }
                    });

                    if (failed.length === 0) {
                        toast(`${applied} retirement fields applied \u2014 save when ready`, 'success');
                        overlay.remove();
                    } else {
                        applyBtn.textContent = `\u26a0 ${applied} applied, ${failed.length} not found`;
                        applyBtn.style.background = 'linear-gradient(135deg,#d97706,#fbbf24)';
                        applyBtn.style.color = '#0f172a';
                        applyStatus.innerHTML = `<div style="font-size:10px;color:#fbbf24">\u26a0 Not found: ${failed.join(', ')}</div>`;
                        toast(`Applied ${applied}, not found: ${failed.join(', ')}`, 'info');
                        applyBtn.disabled = false;
                    }
                };

            } catch (err) {
                runBtn.textContent = '\u2717 Error';
                runBtn.style.background = '#dc2626';
                runBtn.style.color = '#fff';
                runBtn.style.opacity = '1';
                runBtn.disabled = false;
                toast('Retirement calc failed: ' + err.message, 'error');
                console.error('[Copilot] Retirement calc error:', err);
            }
        };
    }

    // ═══════════════════════════════════════════════════════
    //  ORA PDF Generation Dialog
    // ═══════════════════════════════════════════════════════
    function showPdfGenerateDialog(formName, formLabel) {
        const existing = document.getElementById('cp-pdf-dialog');
        if (existing) existing.remove();

        const contactId = ActFieldMapper.getContactId();
        const endpointUrl = 'https://fedsafe-retirement.vercel.app/api/blueprint/generate-pdf';

        // Build the exact payload that will be POSTed to the backend
        const payload = {
            contactId: contactId || '(not detected)',
            form:      formName
        };

        // ────────────────────────────────────────────────────────
        //  STREAMLINED MODE (verboseDebug OFF)
        // ────────────────────────────────────────────────────────
        if (!verboseDebug) {
            if (!contactId) {
                showValidationModal('Missing Contact', ['No contact detected — open a contact record first.'], [], null, 'Close');
                return;
            }
            // Auto-generate PDF
            (async () => {
                toast('Generating Blueprint…', 'info');
                try {
                    const resp = await new Promise((resolve, reject) => {
                        chrome.runtime.sendMessage({ type: 'api_call', method: 'POST', path: '/api/blueprint/generate-pdf', body: payload },
                            (r) => chrome.runtime.lastError ? reject(new Error(chrome.runtime.lastError.message)) : resolve(r));
                    });
                    const result = resp?.data || resp;
                    if (!result?.success || !result.url) {
                        toast('Blueprint generation failed', 'error');
                        console.error('[Copilot] Blueprint error:', result);
                        return;
                    }
                    // Open PDF in new tab
                    window.open(result.url, '_blank');
                    const fileName = result.fileName || `${formName}.pdf`;
                    toast(`${fileName}`, 'success');

                    // Show simplified Save / Cancel dialog
                    const dlg = document.createElement('div');
                    dlg.id = 'cp-pdf-dialog';
                    dlg.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:2147483646;display:flex;align-items:center;justify-content:center;pointer-events:none;font-family:Outfit,-apple-system,sans-serif;';
                    dlg.innerHTML = `
                        <div style="pointer-events:auto;background:linear-gradient(135deg,#0f172a,#1e293b);border:1px solid rgba(99,102,241,.3);border-radius:16px;padding:24px;width:360px;box-shadow:0 20px 60px rgba(0,0,0,.5);color:#e2e8f0">
                            <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
                                <div style="width:38px;height:38px;border-radius:10px;background:rgba(99,102,241,.15);border:1px solid rgba(99,102,241,.3);display:flex;align-items:center;justify-content:center;font-size:18px">📄</div>
                                <div>
                                    <div style="font-size:14px;font-weight:700;color:#a5b4fc">Blueprint Ready</div>
                                    <div style="font-size:11px;color:#94a3b8">${fileName}</div>
                                </div>
                            </div>
                            <div style="font-size:12px;color:#94a3b8;margin-bottom:18px">The PDF has been generated and opened in a new tab. Would you like to save it to the Act! contact record?</div>
                            <div id="cp-bp-save-status" style="min-height:14px;margin-bottom:8px"></div>
                            <div style="display:flex;gap:8px">
                                <button id="cp-bp-cancel" style="flex:1;padding:10px;border-radius:10px;border:1px solid rgba(100,116,139,.3);background:transparent;color:#94a3b8;font-size:12px;font-weight:600;cursor:pointer">Cancel</button>
                                <button id="cp-bp-save" style="flex:2;padding:10px;border-radius:10px;border:none;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:Outfit,sans-serif;display:flex;align-items:center;justify-content:center">Save to Act!</button>
                            </div>
                        </div>`;
                    document.body.appendChild(dlg);
                    document.getElementById('cp-bp-cancel').onclick = () => dlg.remove();
                    document.getElementById('cp-bp-save').onclick = async () => {
                        const saveBtn = document.getElementById('cp-bp-save');
                        const saveStatus = document.getElementById('cp-bp-save-status');
                        saveBtn.textContent = '⏳ Saving…'; saveBtn.disabled = true;
                        try {
                            const sr = await new Promise((resolve, reject) => {
                                chrome.runtime.sendMessage({ type: 'api_call', method: 'POST', path: '/api/blueprint/save-document',
                                    body: { contactId: payload.contactId, pdfUrl: result.url, fileName } },
                                    (r) => chrome.runtime.lastError ? reject(new Error(chrome.runtime.lastError.message)) : resolve(r));
                            });
                            const saveResult = sr?.data || sr;
                            if (saveResult?.success) {
                                toast('PDF saved to Act! contact', 'success');
                                dlg.remove();
                            } else {
                                saveBtn.textContent = '✗ Failed'; saveBtn.style.background = '#dc2626'; saveBtn.disabled = false;
                                saveStatus.innerHTML = `<span style="color:#f87171;font-size:11px">${saveResult?.error || 'Unknown error'}</span>`;
                            }
                        } catch (e) {
                            saveBtn.textContent = '✗ Error'; saveBtn.style.background = '#dc2626'; saveBtn.disabled = false;
                            saveStatus.innerHTML = `<span style="color:#f87171;font-size:11px">${e.message}</span>`;
                        }
                    };
                } catch (err) {
                    toast('Blueprint failed: ' + err.message, 'error');
                    console.error('[Copilot] Blueprint error:', err);
                }
            })();
            return;
        }

        // ── VERBOSE DEBUG MODE (full dialog below — unchanged) ──

        const overlay = document.createElement('div');
        overlay.id = 'cp-pdf-dialog';
        overlay.style.cssText = `
            position:fixed;top:0;left:0;width:100%;height:100%;z-index:2147483646;
            display:flex;align-items:center;justify-content:center;
            pointer-events:none;
        `;

        const card = document.createElement('div');
        card.style.cssText = `
            pointer-events:auto;background:#0f172a;color:#e2e8f0;border-radius:16px;
            padding:20px;width:420px;max-height:80vh;overflow-y:auto;
            box-shadow:0 25px 50px -12px rgba(0,0,0,.5);font-family:system-ui,-apple-system,sans-serif;
            border:1px solid rgba(99,102,241,.3);cursor:move;
        `;

        // Draggable
        let isDragging = false, dx = 0, dy = 0;
        card.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'TEXTAREA') return;
            isDragging = true;
            dx = e.clientX - card.getBoundingClientRect().left;
            dy = e.clientY - card.getBoundingClientRect().top;
        });
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            card.style.position = 'fixed';
            card.style.left = (e.clientX - dx) + 'px';
            card.style.top = (e.clientY - dy) + 'px';
        });
        document.addEventListener('mouseup', () => isDragging = false);

        const idColor = contactId ? '#34d399' : '#f87171';
        const idStatus = contactId ? '✅ Detected' : '❌ Not found';

        card.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
                <div>
                    <div style="font-size:14px;font-weight:700;color:#818cf8">📄 Generate PDF</div>
                    <div style="font-size:11px;color:#94a3b8;margin-top:2px">${formLabel}</div>
                </div>
                <div style="background:#1e1b4b;border-radius:8px;padding:4px 10px;font-size:11px;color:#a5b4fc;font-weight:600">${formName}</div>
            </div>

            <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Contact</div>
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:12px">
                <span style="color:${idColor};font-size:10px">${idStatus}</span>
                <code style="font-size:10px;color:#94a3b8;background:#1e293b;padding:2px 6px;border-radius:4px">${contactId || '—'}</code>
            </div>

            <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Payload</div>
            <pre style="background:#1e293b;padding:10px;border-radius:8px;font-size:10px;color:#94a3b8;
                overflow-x:auto;margin:0 0 12px;white-space:pre-wrap;border:1px solid #334155">${JSON.stringify(payload, null, 2)}</pre>

            <details style="margin-bottom:12px">
                <summary style="font-size:10px;color:#64748b;cursor:pointer;text-transform:uppercase;letter-spacing:1px">▶ Expected Response Shape</summary>
                <pre style="background:#1e293b;padding:8px;border-radius:8px;font-size:9px;color:#64748b;
                    overflow-x:auto;margin:4px 0 0;white-space:pre-wrap;border:1px solid #334155">{
  "success": true,
  "form": "${formName}",
  "clientName": "LastName, FirstName",
  "fileName": "LastName, FirstName ${formName}.pdf",
  "url": "https://...supabase.co/storage/v1/object/public/...",
  "meta": { "totalFields": 50, "actualFilled": 25 }
}</pre>
            </details>

            <div id="cp-pdf-result" style="margin-bottom:12px"></div>

            <div style="background:rgba(15,23,42,0.6);border:1px solid rgba(100,116,139,0.2);border-radius:6px;padding:3px 10px;margin-bottom:8px;display:flex;align-items:center;gap:6px">
                <span style="font-size:10px;color:#64748b;white-space:nowrap">📤 POST</span>
                <span style="font-size:10px;color:#7dd3fc;font-family:monospace;white-space:nowrap">${endpointUrl}</span>
            </div>

            <div style="display:flex;gap:8px">
                <button id="cp-pdf-cancel" style="flex:1;padding:10px;border-radius:10px;border:none;
                    background:#334155;color:#94a3b8;font-weight:600;cursor:pointer;font-size:12px">Cancel</button>
                <button id="cp-pdf-send" style="flex:2;padding:10px;border-radius:10px;border:none;
                    background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-weight:600;
                    cursor:pointer;font-size:12px">📤 Send to FEDSafe</button>
            </div>
        `;

        overlay.appendChild(card);
        document.body.appendChild(overlay);

        document.getElementById('cp-pdf-cancel').onclick = () => overlay.remove();

        document.getElementById('cp-pdf-send').onclick = async () => {
            const sendBtn = document.getElementById('cp-pdf-send');
            const resultArea = document.getElementById('cp-pdf-result');
            sendBtn.textContent = '⏳ Generating...';
            sendBtn.disabled = true;

            try {
                const resp = await new Promise((resolve, reject) => {
                    chrome.runtime.sendMessage({
                        type: 'api_call',
                        method: 'POST',
                        path: '/api/blueprint/generate-pdf',
                        body: payload
                    }, (response) => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                        } else {
                            resolve(response);
                        }
                    });
                });

                const result = resp?.data || resp;
                verboseDebug && console.log('[Copilot] PDF generate response:', result);

                const isSuccess = result?.success === true;

                if (isSuccess && result.url) {
                    // ── Open the public Supabase URL directly ─────────────
                    window.open(result.url, '_blank');

                    const meta     = result.meta || {};
                    const fileName = result.fileName || `${formName}.pdf`;

                    resultArea.innerHTML = `
                        <div style="background:#064e3b;border:1px solid #34d399;border-radius:10px;padding:12px">
                            <div style="font-size:11px;color:#34d399;font-weight:700;margin-bottom:6px">
                                ✅ ${fileName}
                                ${meta.uploaded ? '<span style="background:#1e1b4b;color:#a5b4fc;padding:2px 6px;border-radius:4px;font-size:9px;margin-left:6px">☁ UPLOADED</span>' : ''}
                            </div>
                            <div style="display:flex;gap:12px;margin-bottom:8px">
                                <div style="text-align:center">
                                    <div style="font-size:16px;font-weight:700;color:#e2e8f0">${meta.totalFields || '—'}</div>
                                    <div style="font-size:8px;color:#64748b;text-transform:uppercase">PDF Fields</div>
                                </div>
                                <div style="text-align:center">
                                    <div style="font-size:16px;font-weight:700;color:#34d399">${meta.actualFilled || '—'}</div>
                                    <div style="font-size:8px;color:#64748b;text-transform:uppercase">Filled</div>
                                </div>
                            </div>
                            ${meta.filledFields && meta.filledFields.length > 0 ? `
                            <details style="margin-bottom:8px">
                                <summary style="font-size:9px;color:#64748b;text-transform:uppercase;cursor:pointer">▶ Filled Fields (${meta.filledFields.length})</summary>
                                <div style="font-size:9px;color:#94a3b8;margin-top:4px;max-height:120px;overflow-y:auto">
                                    ${meta.filledFields.map(f => `<div>• ${f}</div>`).join('')}
                                </div>
                            </details>` : ''}
                            <div style="display:flex;gap:6px">
                                <button id="cp-pdf-save-act-btn" style="
                                    flex:1;padding:8px;border-radius:8px;border:none;
                                    background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-weight:700;cursor:pointer;font-size:11px
                                ">📎 Save to Act!</button>
                                <button id="cp-pdf-dl-btn" style="
                                    flex:1;padding:8px;border-radius:8px;border:none;
                                    background:#1e293b;color:#34d399;font-weight:600;cursor:pointer;font-size:11px
                                ">⬇ Download</button>
                            </div>
                            <div id="cp-pdf-save-status" style="min-height:14px;margin-top:4px;font-size:10px"></div>
                        </div>
                    `;

                    // Download button
                    document.getElementById('cp-pdf-dl-btn').onclick = async () => {
                        try {
                            const dlResp = await fetch(result.url);
                            const blob = await dlResp.blob();
                            const a = document.createElement('a');
                            a.href = URL.createObjectURL(blob);
                            a.download = fileName;
                            a.click();
                            URL.revokeObjectURL(a.href);
                        } catch (e) {
                            toast('Download failed: ' + e.message, 'error');
                        }
                    };

                    // Save to Act! — Step 2: attach PDF document to the contact
                    document.getElementById('cp-pdf-save-act-btn').onclick = async () => {
                        const saveBtn = document.getElementById('cp-pdf-save-act-btn');
                        const saveStatus = document.getElementById('cp-pdf-save-status');
                        const saveEndpoint = 'https://fedsafe-retirement.vercel.app/api/blueprint/save-document';
                        saveBtn.textContent = '⏳ Saving to Act!...';
                        saveBtn.disabled = true;
                        saveStatus.innerHTML = `
                            <div style="background:rgba(15,23,42,0.6);border:1px solid rgba(100,116,139,0.2);border-radius:6px;padding:3px 10px;display:flex;align-items:center;gap:6px">
                                <span style="font-size:9px;color:#64748b;white-space:nowrap">📤 POST</span>
                                <span style="font-size:9px;color:#7dd3fc;font-family:monospace;word-break:break-all">${saveEndpoint}</span>
                            </div>
                        `;

                        try {
                            const saveResp = await new Promise((resolve, reject) => {
                                chrome.runtime.sendMessage({
                                    type: 'api_call',
                                    method: 'POST',
                                    path: '/api/blueprint/save-document',
                                    body: {
                                        contactId: payload.contactId,
                                        pdfUrl: result.url,
                                        fileName: fileName
                                    }
                                }, (response) => {
                                    if (chrome.runtime.lastError) {
                                        reject(new Error(chrome.runtime.lastError.message));
                                    } else {
                                        resolve(response);
                                    }
                                });
                            });

                            const saveResult = saveResp?.data || saveResp;
                            verboseDebug && console.log('[Copilot] Save to Act! response:', saveResult);

                            if (saveResult?.success) {
                                saveBtn.textContent = '✅ Saved to Act!';
                                saveBtn.style.background = '#064e3b';
                                saveStatus.innerHTML = '<span style="color:#34d399">Document attached to contact record</span>';
                                toast('PDF saved to Act! contact', 'success');
                            } else {
                                saveBtn.textContent = '✗ Save Failed';
                                saveBtn.style.background = '#dc2626';
                                saveBtn.disabled = false;
                                saveStatus.innerHTML = `<span style="color:#f87171">${saveResult?.error || 'Unknown error'}</span>`;
                            }
                        } catch (saveErr) {
                            saveBtn.textContent = '✗ Error';
                            saveBtn.style.background = '#dc2626';
                            saveBtn.disabled = false;
                            saveStatus.innerHTML = `<span style="color:#f87171">${saveErr.message}</span>`;
                            console.error('[Copilot] Save to Act! error:', saveErr);
                        }
                    };

                    toast(`${fileName}`, 'success');
                    sendBtn.textContent = '✅ Done';
                    sendBtn.style.background = '#064e3b';

                } else {
                    // Error or no URL
                    resultArea.innerHTML = `
                        <div style="font-size:10px;color:#f87171;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">ERROR</div>
                        <pre style="background:#1e293b;padding:8px;border-radius:8px;font-size:9px;color:#f87171;
                            overflow-x:auto;white-space:pre-wrap;border:1px solid #7f1d1d">${JSON.stringify(result, null, 2)}</pre>
                    `;
                    sendBtn.textContent = '✗ Failed';
                    sendBtn.style.background = '#dc2626';
                    sendBtn.disabled = false;
                }
            } catch (err) {
                resultArea.innerHTML = `
                    <div style="font-size:10px;color:#f87171">Network error: ${err.message}</div>
                `;
                sendBtn.textContent = '✗ Error';
                sendBtn.style.background = '#dc2626';
                sendBtn.disabled = false;
                console.error('[Copilot] PDF generate error:', err);
            }
        };
    }

    // ═══════════════════════════════════════════════════════
    //  Final Calculation Dialog (Income tab)
    // ═══════════════════════════════════════════════════════
    const FINAL_CALC_INPUT_FIELDS = [
        'salaryamount', 'retiredate', 'servicecomputationdate', 'birth date', 'birthdate',
        'currentnetincomeperpayperiod', 'high3avgsalary', 'maritalstatus',
        'survivorbenefitpercent', 'spousedob', 'yrsofmilitaryservice',
        'sickleave', 'annualleave', 'feglicodeactive', 'fegliperpayperiod',
        'feglireduction', 'feglicostage', 'fehbpermonth', 'dentalinsurancepermonth',
        'visioninsurancepermonth', 'ltcpermonth',
        'grosssocialsecurity', 'socialsecurityincome', 'spousesocialsecurityincome',
        'spouse_pension', 'age62socialsecurityestimate',
        'tsptraditionalbalance', 'tsprothbalance', 'tspdistributionrate',
        // Spouse Info tab (DOM names → remapped)
        'spousessnet', 'spousepensionnet',
        // Military tab (actual DOM field names from debug dump)
        'militarypensionnet',   // "Military Pension Amount" = $2,500 → militarypension
        'vadisabilitynet',      // "VA Disability Monthly Income" = $4,200 → vadisabilitymonthlyamt
    ];

    // Map DOM field names → API-expected field names
    const FINAL_CALC_FIELD_REMAP = {
        'birth date':           'birthday',
        'birthdate':            'birthday',
        'spousessnet':          'spousesocialsecurityincome',
        'spousepensionnet':     'spouse_pension',
        'militarypensionnet':   'militarypension',
        'vadisabilitynet':      'vadisabilitymonthlyamt',
    };

    // Income tab result-only fields — NEVER read from DOM for input
    const FINAL_CALC_RESULT_ONLY = new Set([
        'federalpension', 'ferssupplement', 'militarypension',
        'survisorbenetit', 'survivorbenefit',
        'feglinetcost', 'add_total', 'minus_total', 'annualleavepayout',
    ]);

    const FINAL_CALC_RESULT_MAP = [
        { key: 'federalpension',       alts: [],                                          isCurrency: true },
        { key: 'socialsecurityincome',  alts: [],                                          isCurrency: true },
        { key: 'ferssupplement',        alts: [],                                          isCurrency: true },
        { key: 'militarypension',       alts: [],                                          isCurrency: true },
        { key: 'vadisabilitynet',       alts: ['vadisability2', 'vadisability'],            isCurrency: true },
        { key: 'spousessnet',           alts: ['spousesocialsecurityinco', 'spousesocialsecurityincome', 'spousessincome', 'spousess'], isCurrency: true },
        { key: 'spousepensionnet',      alts: ['spousepension'],                           isCurrency: true },
        { key: 'survisorbenetit',       alts: ['survivorbenefits', 'survivorbenefit'],     isCurrency: true },
        { key: 'feglinetcost',          alts: ['feglicost', 'fegli', 'feglipermonth', 'lessfegliretire', 'lessfegliretired'],  isCurrency: true },
        { key: 'add_total',            alts: ['additionstotal'],                           isCurrency: true },
        { key: 'minus_total',          alts: ['subtractionstotal'],                        isCurrency: true },
        { key: 'annualleavepayout',    alts: [],                                           isCurrency: true },
    ];

    // Flat list for scanFields
    const FINAL_CALC_RESULT_FIELDS = FINAL_CALC_RESULT_MAP.flatMap(f => [f.key, ...f.alts]);

    async function showFinalCalcDialog() {
        const contactId = ActFieldMapper.getContactId();
        if (!contactId) { toast('No contact detected — open a contact first', 'error'); return; }

        // Always reload fresh API data — other calculators may have written
        // their results back into apiContactData.customFields, polluting the cache.
        apiContactData = null;
        try {
            if (contactId) {
                const data = await actProxyFetch('/contact/' + contactId);
                apiContactData = data;
                verboseDebug && console.log('[Copilot] Final calc API data loaded, keys:', Object.keys(apiContactData));
                if (apiContactData.customFields) {
                    verboseDebug && console.log('[Copilot] customFields sample:', Object.keys(apiContactData.customFields).slice(0, 15));
                }
            }
        } catch (e) { verboseDebug && console.log('[Copilot] API load failed:', e); }

        setTimeout(() => _buildFinalCalcDialog(), 700);
    }

    // ── Required keys for streamlined Final Calc ──
    const FINAL_CALC_REQUIRED = ['salaryamount', 'retiredate', 'servicecomputationdate', 'birth date'];

    // ── Shared apply helper for Final Calculation results ──
    function _applyFinalCalcResults(result) {
        suppressFegliValidation = true;
        setTimeout(() => { suppressFegliValidation = false; }, 2000);

        // Full re-scan first — other calculators may have triggered Act! DOM
        // re-renders via change/blur events, invalidating cached element refs
        ActFieldMapper.scanPage();
        ActFieldMapper.scanFields(FINAL_CALC_RESULT_FIELDS);

        let applied = 0;
        const failed = [];

        // Debug: dump all FEGLI-related result keys to find where $71 is
        const fegliKeys = Object.keys(result).filter(k => k.toLowerCase().includes('fegli') || k.toLowerCase().includes('less'));
        verboseDebug && console.log('[Copilot] FEGLI result keys:', fegliKeys.map(k => `${k}=${result[k]}`).join(', '));

        // If API returned feglinetcost=0 but Retirement calc cached a value, use it
        if ((!result.feglinetcost || result.feglinetcost === 0 || result.feglinetcost === '0') && _cachedRetiredFegliCost) {
            result.feglinetcost = _cachedRetiredFegliCost;
            verboseDebug && console.log(`[Copilot] Using cached Retired FEGLI Cost: $${_cachedRetiredFegliCost} (API returned 0)`);
        }

        FINAL_CALC_RESULT_MAP.forEach(field => {
            // Try primary key first, then alts as source keys in the result object
            let val = result[field.key];
            if (val === null || val === undefined || val === '') {
                for (const alt of field.alts) {
                    const altVal = result[alt];
                    if (altVal !== null && altVal !== undefined && altVal !== '') {
                        val = altVal;
                        verboseDebug && console.log(`[Copilot] Result value found via alt key: ${alt}=${val} (primary ${field.key} was empty)`);
                        break;
                    }
                }
            }
            if (val === null || val === undefined || val === '') return;
            if (field.isCurrency) {
                const num = parseFloat(String(val).replace(/[^0-9.\-]/g, ''));
                if (!isNaN(num)) val = Math.round(num);
                // Don't overwrite a non-zero DOM value with 0
                // (e.g., FEGLI cost set by Retirement calc — Final Calc returns 0)
                if (val === 0) {
                    const currentDomVal = parseFloat(String(
                        ActFieldMapper.getFieldValue(field.key) ||
                        ActFieldMapper.getFieldValue(field.alts?.[0]) ||
                        ActFieldMapper.getFieldValue(field.alts?.[1]) || '0'
                    ).replace(/[^0-9.\-]/g, ''));
                    if (currentDomVal && currentDomVal !== 0) {
                        verboseDebug && console.log(`[Copilot] Skipping ${field.key}=0 — DOM already has ${currentDomVal}`);
                        return;
                    }
                }
            }
            let ok = ActFieldMapper.setFieldValue(field.key, String(val));
            if (!ok) ok = ActFieldMapper.setFieldValue('calculated' + field.key, String(val));
            if (!ok) {
                for (const alt of field.alts) {
                    ok = ActFieldMapper.setFieldValue(alt, String(val));
                    if (!ok) ok = ActFieldMapper.setFieldValue('calculated' + alt, String(val));
                    if (ok) {
                        verboseDebug && console.log(`[Copilot] Alt key worked: ${alt} (primary ${field.key} failed)`);
                        break;
                    }
                }
            }
            if (ok) {
                applied++;
                if (apiContactData?.customFields) apiContactData.customFields[field.key] = val;
            } else {
                failed.push(field.key);
            }
        });

        return { applied, failed };
    }

    // ── Auto-run path for Final Calc ──
    async function _autoRunFinalCalc(payload) {
        verboseDebug && console.log('[Copilot] Auto-running Final calculation (verboseDebug=false)', JSON.stringify(payload).slice(0, 200));
        try {
            const resp = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage(
                    { type: 'api_call', method: 'POST', path: '/api/proxy/calculatefinal', body: payload },
                    (r) => {
                        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
                        else resolve(r);
                    }
                );
            });

            if (!resp) {
                toast('Final calculation failed — no response from background', 'error');
                console.error('[Copilot] Auto-final: resp is null/undefined');
                return;
            }

            const calcData = resp?.data || resp;
            verboseDebug && console.log('[Copilot] Auto-final calcData:', calcData?.success, 'error:', calcData?.error);

            if (!calcData || !calcData.success) {
                toast('Final calculation failed: ' + (calcData?.error || 'server error'), 'error');
                console.error('[Copilot] Auto-final server error:', calcData);
                return;
            }

            const result = calcData.result || {};
            const { applied, failed } = _applyFinalCalcResults(result);

            if (failed.length === 0) {
                toast(`${applied} retirement projection fields updated`, 'success');
            } else {
                toast(`${applied} applied, ${failed.length} not found: ${failed.join(', ')}`, 'info');
            }
        } catch (err) {
            toast('Final calculation failed: ' + err.message, 'error');
            console.error('[Copilot] Auto-final error:', err);
        }
    }

    function _buildFinalCalcDialog() {
        const existing = document.getElementById('cp-final-overlay');
        if (existing) existing.remove();

        const contactId = ActFieldMapper.getContactId();

        // Scan all input fields from the DOM (same pattern as other calculators)
        const scannedMap = ActFieldMapper.scanFields(FINAL_CALC_INPUT_FIELDS);

        // Date fields that need MM/DD/YYYY conversion
        const DATE_KEYS = ['retiredate', 'servicecomputationdate', 'birth date', 'birthdate', 'spousedob'];

        function normalizeDate(val) {
            if (!val) return val;
            // Already MM/DD/YYYY — pass through
            if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(val)) return val;
            // ISO 8601 with T (2026-04-30T00:00:00+00:00) → extract YYYY-MM-DD part
            // Do NOT use new Date() — it converts UTC midnight to local timezone,
            // shifting the date back by 1 day in western timezones.
            const isoMatch = val.match(/^(\d{4})-(\d{2})-(\d{2})T/);
            if (isoMatch) return `${isoMatch[2]}/${isoMatch[3]}/${isoMatch[1]}`;
            // Plain YYYY-MM-DD (no T) → MM/DD/YYYY
            const ymd = val.match(/^(\d{4})-(\d{2})-(\d{2})$/);
            if (ymd) return `${ymd[2]}/${ymd[3]}/${ymd[1]}`;
            return val;
        }

        // Key aliases: some Act! fields are stored under different names in the API vs DOM
        const FIELD_ALIASES = {
            'birth date': ['birth date', 'birthdate', 'birthday'],
            'birthdate':  ['birthdate', 'birth date', 'birthday'],
        };

        function cv(key) {
            // Skip DOM reads for fields that are RESULT-only on the Income tab
            // (they contain stale calculated values, not raw inputs)
            if (!FINAL_CALC_RESULT_ONLY.has(key)) {
                // 1. Try DOM scan
                const entry = scannedMap[key] || scannedMap[key.toLowerCase()];
                if (entry && entry.value !== undefined && entry.value !== null && entry.value !== '') {
                    let v = String(entry.value).replace(/^\$/, '').replace(/,/g, '');
                    if (DATE_KEYS.includes(key)) v = normalizeDate(v);
                    return v;
                }
            }
            // 2. Fallback to API data — try primary key then aliases
            // Check BOTH customFields AND top-level apiContactData (standard Act! fields
            // like dates are returned at the root, not inside customFields)
            // Use case-insensitive matching because Act! API returns keys in varying cases
            const custom = apiContactData?.customFields || {};
            const topLevel = apiContactData || {};
            const keysToTry = FIELD_ALIASES[key] || [key, key.toLowerCase()];
            let v = '';
            // Build case-insensitive lookup maps once
            const customLower = {};
            for (const ck of Object.keys(custom)) { customLower[ck.toLowerCase().replace(/\s+/g, '')] = custom[ck]; customLower[ck.toLowerCase()] = custom[ck]; }
            const topLower = {};
            for (const tk of Object.keys(topLevel)) { if (typeof topLevel[tk] !== 'object') { topLower[tk.toLowerCase().replace(/\s+/g, '')] = topLevel[tk]; topLower[tk.toLowerCase()] = topLevel[tk]; } }
            for (const k of keysToTry) {
                const kNorm = k.toLowerCase().replace(/\s+/g, '');
                if (customLower[k] && String(customLower[k]).trim() !== '') { v = String(customLower[k]); break; }
                if (customLower[kNorm] && String(customLower[kNorm]).trim() !== '') { v = String(customLower[kNorm]); break; }
                if (topLower[k] && String(topLower[k]).trim() !== '') { v = String(topLower[k]); break; }
                if (topLower[kNorm] && String(topLower[kNorm]).trim() !== '') { v = String(topLower[kNorm]); break; }
            }
            if (!v) return '';
            v = v.replace(/^\$/, '').replace(/,/g, '');
            if (DATE_KEYS.includes(key)) v = normalizeDate(v);
            return v;
        }

        // Build payload from DOM + API data and track sources
        const payload = { contactId, customFields: {} };
        const collectedRows = [];

        // DEBUG: Find all military/VA related keys in API data
        const apiCustom = apiContactData?.customFields || {};
        const militaryApiKeys = Object.keys(apiCustom).filter(k => 
            k.toLowerCase().includes('military') || k.toLowerCase().includes('pension') ||
            k.toLowerCase().includes('va') || k.toLowerCase().includes('disability')
        );
        verboseDebug && console.log('[Copilot] Military/VA API keys:', militaryApiKeys.map(k => `${k}=${apiCustom[k]}`).join(', '));

        // Also dump DOM-scanned military/VA fields
        const militaryDomKeys = Object.keys(scannedMap).filter(k =>
            k.includes('military') || k.includes('pension') ||
            k.includes('va') || k.includes('disability')
        );
        verboseDebug && console.log('[Copilot] Military/VA DOM keys:', militaryDomKeys.map(k => `${k}=${scannedMap[k]?.value}`).join(', '));
        FINAL_CALC_INPUT_FIELDS.forEach(k => {
            const domEntry = scannedMap[k] || scannedMap[k.toLowerCase()];
            const apiCustom = apiContactData?.customFields || {};
            const topLevel = apiContactData || {};
            const apiVal = apiCustom[k] || apiCustom[k.toLowerCase()] || topLevel[k] || topLevel[k.toLowerCase()] || '';
            const val = cv(k);
            const source = (domEntry && domEntry.value && !FINAL_CALC_RESULT_ONLY.has(k)) ? 'DOM' : (apiVal ? 'API' : '');
            // Remap DOM field names to API-expected names
            const apiKey = FINAL_CALC_FIELD_REMAP[k] || k;
            if (val) {
                payload.customFields[apiKey] = val;
            }
            // Debug: trace birth date resolution
            if (k.includes('birth') || k.includes('dob')) {
                verboseDebug && console.log(`[Copilot] Final Calc DOB trace: key="${k}" → apiKey="${apiKey}", val="${val}", source="${source}", domEntry=${!!domEntry}`);
            }
            collectedRows.push({ key: k, value: val, source, apiKey: apiKey !== k ? apiKey : '' });
        });

        // ────────────────────────────────────────────────────────
        //  verboseDebug branching (same pattern as other calcs)
        // ────────────────────────────────────────────────────────
        const REQUIRED_LABELS = { salaryamount: 'Salary', retiredate: 'Retire Date', servicecomputationdate: 'Service Computation Date', 'birth date': 'Birth Date' };
        const missingRequired = FINAL_CALC_REQUIRED.filter(k => {
            const val = payload.customFields[FINAL_CALC_FIELD_REMAP[k] || k] || payload.customFields[k];
            return !val || String(val).trim() === '';
        });
        const dataReady = missingRequired.length === 0;

        if (!verboseDebug && dataReady) {
            _autoRunFinalCalc(payload);
            return;
        }

        if (!verboseDebug && !dataReady) {
            showValidationModal(
                'Missing Data for Final Calculation',
                ['Please fill in the following fields, then click Final Calculation again:',
                 ...missingRequired.map(k => `• <b>${REQUIRED_LABELS[k] || k}</b>`)],
                missingRequired,
                null,
                'Close'
            );
            return;
        }

        // ── VERBOSE DEBUG MODE (full dialog below) ──────────────

        // Build collected fields HTML
        const collectedHtml = collectedRows.map(r => {
            const valStr = r.value || '\u2014';
            const srcColor = r.source === 'DOM' ? '#22c55e' : (r.source === 'API' ? '#818cf8' : '#475569');
            const srcTag = r.source || '\u2014';
            const valColor = r.value ? '#e2e8f0' : '#475569';
            const remapTag = r.apiKey ? `<span style="font-size:8px;color:#f59e0b">\u2192${r.apiKey}</span>` : '';
            return `<div style="display:flex;justify-content:space-between;align-items:center;padding:2px 0;border-bottom:1px solid rgba(100,116,139,0.08);font-size:11px">
                <span style="color:#94a3b8;flex:1">${r.key} ${remapTag}</span>
                <span style="color:${srcColor};font-size:9px;font-weight:700;min-width:28px;text-align:center">${srcTag}</span>
                <span style="color:${valColor};font-family:monospace;font-size:11px;min-width:80px;text-align:right">${valStr}</span>
            </div>`;
        }).join('');

        const foundCount = collectedRows.filter(r => r.value).length;

        // Build military/VA debug HTML for dialog
        const milDebugHtml = militaryApiKeys.length > 0
            ? militaryApiKeys.map(k => `<div style="font-size:9px;color:#f59e0b"><b>${k}</b> = ${apiCustom[k]}</div>`).join('')
            : '<div style="font-size:9px;color:#f87171">No military/VA/pension keys in API data</div>';
        const milDomDebugHtml = militaryDomKeys.length > 0
            ? militaryDomKeys.map(k => `<div style="font-size:9px;color:#22c55e"><b>${k}</b> = ${scannedMap[k]?.value}</div>`).join('')
            : '<div style="font-size:9px;color:#f87171">No military/VA/pension keys in DOM scan</div>';

        const overlay = document.createElement('div');
        overlay.id = 'cp-final-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:2147483646;display:flex;align-items:center;justify-content:center;pointer-events:none;';

        const card = document.createElement('div');
        card.style.cssText = 'pointer-events:auto;background:#0f172a;color:#e2e8f0;border-radius:16px;padding:20px;width:520px;max-height:85vh;overflow-y:auto;box-shadow:0 25px 50px -12px rgba(0,0,0,.5);font-family:system-ui,-apple-system,sans-serif;border:1px solid rgba(34,197,94,.3);cursor:move;';

        // Draggable
        let isDragging = false, dx = 0, dy = 0;
        card.addEventListener('mousedown', (e) => {
            if (['BUTTON','INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)) return;
            isDragging = true;
            dx = e.clientX - card.getBoundingClientRect().left;
            dy = e.clientY - card.getBoundingClientRect().top;
        });
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            overlay.style.display = 'block';
            card.style.position = 'fixed';
            card.style.left = (e.clientX - dx) + 'px';
            card.style.top = (e.clientY - dy) + 'px';
        });
        document.addEventListener('mouseup', () => isDragging = false);

        const idColor = contactId ? '#34d399' : '#f87171';

        card.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
                <div>
                    <div style="font-size:14px;font-weight:700;color:#22c55e">\ud83d\udcca Final Retirement Calculation</div>
                    <div style="font-size:10px;color:#94a3b8;margin-top:2px">Full income projection \u2014 FERS, SS, TSP, taxes, deductions</div>
                </div>
                <button id="cp-final-close" style="background:none;border:none;color:#64748b;font-size:18px;cursor:pointer">\u2715</button>
            </div>
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
                <span style="color:${idColor};font-size:10px">${contactId ? '\u2705' : '\u274c'}</span>
                <code style="font-size:9px;color:#94a3b8;background:#1e293b;padding:2px 6px;border-radius:4px">${contactId || '\u2014'}</code>
            </div>
            <span style="font-size:10px;color:#7dd3fc;font-family:monospace;white-space:nowrap">https://fedsafe-retirement.vercel.app/api/proxy/calculatefinal</span>

            <details style="margin:8px 0" open>
                <summary style="font-size:10px;color:#64748b;cursor:pointer;text-transform:uppercase;letter-spacing:1px">\u25b6 Collected Fields (${foundCount}/${FINAL_CALC_INPUT_FIELDS.length})</summary>
                <div style="max-height:200px;overflow-y:auto;margin-top:4px">${collectedHtml}</div>
            </details>

            <details style="margin:4px 0;border:1px solid #f59e0b;border-radius:8px;padding:4px" open>
                <summary style="font-size:10px;color:#f59e0b;cursor:pointer;text-transform:uppercase;letter-spacing:1px">\u26a0 Military/VA Field Debug</summary>
                <div style="font-size:9px;color:#64748b;margin:2px 0">API keys with military/va/pension/disability:</div>
                ${milDebugHtml}
                <div style="font-size:9px;color:#64748b;margin:4px 0 2px">DOM keys with military/va/pension/disability:</div>
                ${milDomDebugHtml}
            </details>

            <details style="margin:4px 0">
                <summary style="font-size:10px;color:#64748b;cursor:pointer;text-transform:uppercase;letter-spacing:1px">\u25b6 Payload JSON (${Object.keys(payload.customFields).length} fields)</summary>
                <pre style="background:#1e293b;padding:8px;border-radius:8px;font-size:9px;color:#94a3b8;overflow-x:auto;margin:4px 0 0;white-space:pre-wrap;border:1px solid #334155;max-height:200px">${JSON.stringify(payload, null, 2)}</pre>
            </details>

            <div style="display:flex;gap:8px;margin:8px 0 8px">
                <button id="cp-final-cancel" style="flex:1;padding:9px;border-radius:10px;border:none;background:#334155;color:#94a3b8;font-weight:600;cursor:pointer;font-size:12px">Cancel</button>
                <button id="cp-final-run" style="flex:2;padding:9px;border-radius:10px;border:none;background:linear-gradient(135deg,#16a34a,#22c55e);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:Outfit,sans-serif">\ud83d\udcca Run Final Calc</button>
            </div>
            <div id="cp-final-response-json" style="margin-top:4px"></div>
            <div id="cp-final-results" style="margin-top:8px"></div>
            <div id="cp-final-apply-area" style="margin-top:8px"></div>
        `;

        overlay.appendChild(card);
        document.body.appendChild(overlay);

        document.getElementById('cp-final-close').onclick = () => overlay.remove();
        document.getElementById('cp-final-cancel').onclick = () => overlay.remove();

        document.getElementById('cp-final-run').onclick = async () => {
            const runBtn = document.getElementById('cp-final-run');
            const resultsArea = document.getElementById('cp-final-results');
            const applyArea = document.getElementById('cp-final-apply-area');
            runBtn.textContent = '\u23f3 Calculating...';
            runBtn.disabled = true;

            try {
                const resp = await new Promise((resolve, reject) => {
                    chrome.runtime.sendMessage(
                        { type: 'api_call', method: 'POST', path: '/api/proxy/calculatefinal', body: payload },
                        (r) => chrome.runtime.lastError ? reject(new Error(chrome.runtime.lastError.message)) : resolve(r)
                    );
                });

                const calcData = resp?.data || resp;
                verboseDebug && console.log('[Copilot] Final calc response:', calcData);

                // Show response JSON in collapsible block
                const respJsonArea = document.getElementById('cp-final-response-json');
                if (respJsonArea) {
                    respJsonArea.innerHTML = `<details><summary style="font-size:10px;color:#64748b;cursor:pointer;text-transform:uppercase;letter-spacing:1px">\u25b6 Response JSON</summary><pre style="background:#1e293b;padding:8px;border-radius:8px;font-size:9px;color:#94a3b8;overflow-x:auto;margin:4px 0 0;white-space:pre-wrap;border:1px solid #334155;max-height:250px">${JSON.stringify(calcData, null, 2)}</pre></details>`;
                }

                if (!calcData?.success) {
                    runBtn.textContent = '\u2717 Failed';
                    runBtn.style.background = '#dc2626';
                    runBtn.disabled = false;
                    resultsArea.innerHTML = `<pre style="background:#1e293b;padding:8px;border-radius:8px;font-size:9px;color:#f87171;overflow-x:auto;white-space:pre-wrap;border:1px solid #7f1d1d">${JSON.stringify(calcData, null, 2)}</pre>`;
                    return;
                }

                const result = calcData.result || {};
                const display = calcData.displayFields || {};

                // Build results display
                const incomeRows = [
                    ['Federal Pension', display['Net FERS'] || result.federalpension],
                    ['Social Security', display['Net Social Security'] || result.socialsecurityincome],
                    ['FERS Supplement', display['Net Bridge'] || result.ferssupplement],
                    ['Military Pension', result.militarypension],
                    ['VA Disability', result.vadisabilitynet],
                    ['Spouse SS', result.spousessnet],
                    ['Spouse Pension', result.spousepensionnet],
                ].filter(r => r[1] && r[1] !== '0' && r[1] !== '$0.00');

                const deductRows = [
                    ['Survivor Benefits', result.survisorbenetit],
                    ['Health Ins', display['less Health Insurance']],
                    ['Dental Ins', display['less Dental Insurance']],
                    ['Vision Ins', display['less Vision Insurance']],
                    ['FEGLI', display['less FEGLI'] || result.feglinetcost],
                ].filter(r => r[1] && r[1] !== '0' && r[1] !== '$0.00' && r[1] !== '($0.00)');

                const summaryRows = [
                    ['Additions Total', result.add_total],
                    ['Subtractions Total', result.minus_total],
                    ['Projected Net Monthly', display['Projected Net Monthly']],
                    ['Current Monthly Net', display['Current Monthly Net']],
                    ['Annual Leave Payout', result.annualleavepayout],
                    ['Gap Status', display['Gap Yes'] === 'Yes' ? '\u26a0\ufe0f Income Gap' : '\u2705 No Gap'],
                ];

                let html = '<div style="display:flex;gap:12px">';
                html += '<div style="flex:1"><div style="font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Income</div>';
                incomeRows.forEach(([label, val]) => {
                    html += `<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0"><span style="color:#94a3b8">${label}</span><span style="color:#34d399;font-weight:600">${val}</span></div>`;
                });
                html += '</div><div style="flex:1"><div style="font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Deductions</div>';
                deductRows.forEach(([label, val]) => {
                    html += `<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0"><span style="color:#94a3b8">${label}</span><span style="color:#f87171;font-weight:600">${val}</span></div>`;
                });
                html += '</div></div>';
                html += '<div style="border-top:1px solid #334155;margin-top:8px;padding-top:8px">';
                summaryRows.forEach(([label, val]) => {
                    if (!val || val === '0') return;
                    const color = label.includes('Gap') ? (String(val).includes('Gap') ? '#fbbf24' : '#34d399') : '#e2e8f0';
                    html += `<div style="display:flex;justify-content:space-between;font-size:11px;padding:2px 0"><span style="color:#94a3b8;font-weight:600">${label}</span><span style="color:${color};font-weight:700">${val}</span></div>`;
                });
                html += '</div>';

                resultsArea.innerHTML = html;
                runBtn.textContent = '\u2705 Done';
                runBtn.style.background = '#064e3b';
                toast('Final calculation done \u2014 review & Apply', 'success');

                // Apply button
                applyArea.innerHTML = `
                    <button id="cp-final-apply-btn" style="width:100%;padding:9px;border-radius:10px;border:none;background:linear-gradient(135deg,#6366f1,#818cf8);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:Outfit,sans-serif;margin-top:4px">\u2b07 Apply to Form - save when ready</button>
                    <div id="cp-final-apply-status" style="min-height:14px;margin-top:4px"></div>
                `;

                document.getElementById('cp-final-apply-btn').onclick = () => {
                    const applyBtn = document.getElementById('cp-final-apply-btn');
                    applyBtn.textContent = '\u23f3 Applying...';
                    applyBtn.disabled = true;

                    suppressFegliValidation = true;
                    setTimeout(() => { suppressFegliValidation = false; }, 2000);

                    ActFieldMapper.scanFields(FINAL_CALC_RESULT_FIELDS);

                    // DEBUG: dump ALL field names visible on this page to find the correct names
                    const allFields = ActFieldMapper.scanPage();
                    verboseDebug && console.log('[Copilot] ALL Income tab fields:', Object.keys(allFields).sort().join(', '));

                    let applied = 0;
                    const failed = [];

                    FINAL_CALC_RESULT_MAP.forEach(field => {
                        let val = result[field.key];
                        if (val === null || val === undefined || val === '') return;
                        // Round currency values (no decimals in ACT money fields)
                        if (field.isCurrency) {
                            const num = parseFloat(String(val).replace(/[^0-9.\-]/g, ''));
                            if (!isNaN(num)) val = Math.round(num);
                        }

                        // Try primary key first
                        let ok = ActFieldMapper.setFieldValue(field.key, String(val));
                        // Try "calculated" prefix
                        if (!ok) ok = ActFieldMapper.setFieldValue('calculated' + field.key, String(val));
                        // Try each alt key
                        if (!ok) {
                            for (const alt of field.alts) {
                                ok = ActFieldMapper.setFieldValue(alt, String(val));
                                if (!ok) ok = ActFieldMapper.setFieldValue('calculated' + alt, String(val));
                                if (ok) {
                                    verboseDebug && console.log(`[Copilot] Alt key worked: ${alt} (primary ${field.key} failed)`);
                                    break;
                                }
                            }
                        }

                        if (ok) {
                            applied++;
                            if (apiContactData?.customFields) apiContactData.customFields[field.key] = val;
                        } else {
                            failed.push(field.key);
                        }
                    });

                    if (failed.length === 0) {
                        toast(`${applied} fields applied \u2014 save when ready`, 'success');
                        overlay.remove();
                    } else {
                        // Show what we tried + all available field names for debugging
                        const allFieldNames = Object.keys(allFields).sort();
                        const vaFields = allFieldNames.filter(n => n.includes('va') || n.includes('spouse') || n.includes('disability'));
                        applyBtn.textContent = `\u26a0 ${applied} applied, ${failed.length} not found`;
                        applyBtn.style.background = 'linear-gradient(135deg,#d97706,#fbbf24)';
                        applyBtn.style.color = '#0f172a';
                        document.getElementById('cp-final-apply-status').innerHTML = `
                            <div style="font-size:10px;color:#fbbf24">\u26a0 Not found: ${failed.join(', ')}</div>
                            <details style="margin-top:6px" open>
                                <summary style="font-size:9px;color:#64748b;cursor:pointer">\u25b6 Matching fields on page (${vaFields.length})</summary>
                                <div style="font-size:9px;color:#94a3b8;max-height:80px;overflow-y:auto;margin-top:2px">${vaFields.join(', ') || 'none'}</div>
                            </details>
                            <details style="margin-top:4px" open>
                                <summary style="font-size:9px;color:#64748b;cursor:pointer">\u25b6 ALL fields on page (${allFieldNames.length})</summary>
                                <div style="font-size:9px;color:#94a3b8;max-height:120px;overflow-y:auto;margin-top:2px">${allFieldNames.join(', ')}</div>
                            </details>
                        `;
                        toast(`Applied ${applied}, not found: ${failed.join(', ')}`, 'info');
                        applyBtn.disabled = false;
                    }
                };

            } catch (err) {
                runBtn.textContent = '\u2717 Error';
                runBtn.style.background = '#dc2626';
                runBtn.disabled = false;
                toast('Final calc failed: ' + err.message, 'error');
                console.error('[Copilot] Final calc error:', err);
            }
        };
    }

    // ═══════════════════════════════════════════════════════
    //  Auto-Compute: Years/Months of Service from Date Fields
    //  Listens to onChange/onBlur on ServiceComputationDate & RetireDate.
    //  When both have values, computes RetireDate − SCD and sets
    //  CurrectYrsMonthsOfSvcYY (years) and CurrectYrsMonthsOfSvcMM (months).
    //  If either date is cleared, both computed fields are cleared.
    // ═══════════════════════════════════════════════════════
    function startServiceYearsAutoCompute() {
        const SCD_KEY    = 'servicecomputationdate';
        const RETIRE_KEY = 'retiredate';
        const YY_KEY     = 'currectyrsmonthsofsvcyy';
        const MM_KEY     = 'currectyrsmonthsofsvcmm';

        function parseDate(val) {
            if (!val) return null;
            const s = String(val).trim();
            if (!s) return null;
            const d = new Date(s);
            return isNaN(d.getTime()) ? null : d;
        }

        function diffYearsMonths(from, to) {
            let years = to.getFullYear() - from.getFullYear();
            let months = to.getMonth() - from.getMonth();
            if (to.getDate() < from.getDate()) months -= 1;
            if (months < 0) { years -= 1; months += 12; }
            return { years: Math.max(0, years), months: Math.max(0, months) };
        }

        function recompute() {
            ActFieldMapper.scanFields([SCD_KEY, RETIRE_KEY, YY_KEY, MM_KEY]);
            const scdVal    = ActFieldMapper.getFieldValue(SCD_KEY) || '';
            const retireVal = ActFieldMapper.getFieldValue(RETIRE_KEY) || '';
            const scdDate    = parseDate(scdVal);
            const retireDate = parseDate(retireVal);

            if (!scdDate || !retireDate || retireDate <= scdDate) {
                ActFieldMapper.setFieldValue(YY_KEY, '');
                ActFieldMapper.setFieldValue(MM_KEY, '');
                return;
            }

            const diff = diffYearsMonths(scdDate, retireDate);
            ActFieldMapper.setFieldValue(YY_KEY, String(diff.years));
            ActFieldMapper.setFieldValue(MM_KEY, String(diff.months));
            verboseDebug && console.log(`[Copilot] SvcYears: ${diff.years}Y ${diff.months}M`);
        }

        // Retry until both date fields are found in the DOM, then attach listeners
        let attempts = 0;
        const maxAttempts = 5;

        function tryAttach() {
            attempts++;
            ActFieldMapper.scanFields([SCD_KEY, RETIRE_KEY, YY_KEY, MM_KEY]);
            const scdEl    = ActFieldMapper.getFieldElement(SCD_KEY);
            const retireEl = ActFieldMapper.getFieldElement(RETIRE_KEY);

            if (!scdEl || !retireEl) {
                if (attempts < maxAttempts) {
                    setTimeout(tryAttach, 3000);
                } else {
                    // Silent — LES Info tab was never loaded
                }
                return;
            }

            // Attach onChange + onBlur listeners (slight delay for value to settle)
            const handler = () => setTimeout(recompute, 150);
            scdEl.addEventListener('change', handler);
            scdEl.addEventListener('blur', handler);
            retireEl.addEventListener('change', handler);
            retireEl.addEventListener('blur', handler);

            verboseDebug && console.log('[Copilot] SvcYears: onChange/onBlur listeners attached');

            // Compute once immediately in case both dates already have values
            recompute();
        }

        tryAttach();
    }

    // ═══════════════════════════════════════════════════════
    //  Auto-Compute: Age (Years/Months) from Birthday
    //  Listens to onChange/onBlur on the Birthday field.
    //  Computes today − Birthday and sets AgeYY (years) and
    //  AgeMM (months).  Also recomputes on initial page load
    //  so the displayed age is always current.
    //  Tries multiple possible Act! field-name variants.
    // ═══════════════════════════════════════════════════════
    function startAgeAutoCompute() {
        // All possible internal Act! names for the DOB field
        const DOB_CANDIDATES = ['birth date', 'birthday', 'birthdate'];
        // All possible internal Act! names for the output fields
        const YY_CANDIDATES  = ['ageyy', 'age_yy', 'ageyears'];
        const MM_CANDIDATES  = ['agemm', 'age_mm', 'agemonths'];

        // Resolved keys (set during tryAttach)
        let DOB_KEY = null;
        let YY_KEY  = null;
        let MM_KEY  = null;

        function parseDate(val) {
            if (!val) return null;
            const s = String(val).trim();
            if (!s) return null;
            const d = new Date(s);
            return isNaN(d.getTime()) ? null : d;
        }

        function diffYearsMonths(from, to) {
            let years = to.getFullYear() - from.getFullYear();
            let months = to.getMonth() - from.getMonth();
            if (to.getDate() < from.getDate()) months -= 1;
            if (months < 0) { years -= 1; months += 12; }
            return { years: Math.max(0, years), months: Math.max(0, months) };
        }

        function recompute() {
            if (!DOB_KEY) return;
            ActFieldMapper.scanFields([DOB_KEY, YY_KEY, MM_KEY].filter(Boolean));
            const dobVal = ActFieldMapper.getFieldValue(DOB_KEY) || '';
            const dobDate = parseDate(dobVal);

            verboseDebug && console.log(`[Copilot] Age recompute: DOB_KEY=${DOB_KEY}, raw="${dobVal}", parsed=${dobDate}`);

            if (!dobDate || dobDate > new Date()) {
                // No DOB or future date — clear the computed fields
                if (YY_KEY) ActFieldMapper.setFieldValue(YY_KEY, '');
                if (MM_KEY) ActFieldMapper.setFieldValue(MM_KEY, '');
                return;
            }

            const diff = diffYearsMonths(dobDate, new Date());
            if (YY_KEY) ActFieldMapper.setFieldValue(YY_KEY, String(diff.years));
            if (MM_KEY) ActFieldMapper.setFieldValue(MM_KEY, String(diff.months));
            verboseDebug && console.log(`[Copilot] Age: ${diff.years}Y ${diff.months}M  (DOB=${DOB_KEY}, YY=${YY_KEY}, MM=${MM_KEY})`);
        }

        // Retry until the DOB field appears in the DOM, then attach listeners
        let attempts = 0;
        const maxAttempts = 8;

        function tryAttach() {
            attempts++;

            // Scan for all candidate field names at once
            const allCandidates = [...DOB_CANDIDATES, ...YY_CANDIDATES, ...MM_CANDIDATES];
            ActFieldMapper.scanFields(allCandidates);

            // Debug: log every candidate and whether it was found
            const debugInfo = allCandidates.map(k => {
                const el = ActFieldMapper.getFieldElement(k);
                const val = ActFieldMapper.getFieldValue(k);
                return `${k}=${el ? '✓' : '✗'}${val !== undefined ? `(${val})` : ''}`;
            });
            verboseDebug && console.log(`[Copilot] Age tryAttach #${attempts}: ${debugInfo.join(', ')}`);

            // Also dump all field names on page that contain "age", "birth", or "dob"
            const fullMap = ActFieldMapper.scanPage();
            const ageRelated = Object.keys(fullMap).filter(k =>
                k.includes('age') || k.includes('birth') || k.includes('dob') || k.includes('date')
            );
            verboseDebug && console.log(`[Copilot] Age-related fields on page: ${ageRelated.join(', ') || '(none)'}`);

            // Resolve the actual DOB key
            for (const k of DOB_CANDIDATES) {
                if (ActFieldMapper.getFieldElement(k)) { DOB_KEY = k; break; }
            }
            // Resolve the actual YY key
            for (const k of YY_CANDIDATES) {
                if (ActFieldMapper.getFieldElement(k)) { YY_KEY = k; break; }
            }
            // Resolve the actual MM key
            for (const k of MM_CANDIDATES) {
                if (ActFieldMapper.getFieldElement(k)) { MM_KEY = k; break; }
            }

            if (!DOB_KEY) {
                verboseDebug && console.log(`[Copilot] Age: DOB field not found (attempt ${attempts}/${maxAttempts})`);
                if (attempts < maxAttempts) {
                    setTimeout(tryAttach, 3000);
                }
                return;
            }

            verboseDebug && console.log(`[Copilot] Age: resolved DOB=${DOB_KEY}, YY=${YY_KEY || '(not found)'}, MM=${MM_KEY || '(not found)'}`);

            const dobEl = ActFieldMapper.getFieldElement(DOB_KEY);

            // Attach onChange + onBlur listeners (slight delay for value to settle)
            const handler = () => setTimeout(recompute, 150);
            dobEl.addEventListener('change', handler);
            dobEl.addEventListener('blur', handler);

            verboseDebug && console.log('[Copilot] Age: onChange/onBlur listeners attached to ' + DOB_KEY);

            // Compute once immediately so age is current on page load
            recompute();
        }

        tryAttach();
    }

})();

