/**
 * ACTGenie Co-Pilot — Field Schema (Phase 1)
 * ============================================
 * Builds an AGENT-FRIENDLY, ACT-GENERIC field definition for a contact layout
 * from the Act! Web API contact response, and persists it across sessions.
 *
 * Design goals (this is destined for the ACTGenie product, not just FedSafe):
 *   • Self-describing: every field carries key / label / aliases / dataType /
 *     group / access / calculated, so an LLM can resolve "set the client's date
 *     of birth" → a field key, and know how to read/write/validate it.
 *   • ACT-generic: no FedSafe-specific field names in the engine. FedSafe
 *     specifics (Age-from-DOB etc.) live later as DATA in `rules`, not code.
 *   • Two-part identity: `api` (canonical list + values) is joined to `dom`
 *     (get/set mechanics, filled in Phase 2) via a normalized correlation key.
 *
 * The SCHEMA (field definitions) is layout-stable and persisted; VALUES are
 * never persisted — they're read fresh per record (DOM-first, API fallback).
 *
 * Phase 1 scope: API → master field list + persistence. DOM pairing is Phase 2.
 * Nothing here changes runtime behavior until content.js opts in (USE_SCHEMA_V2).
 */

const ActFieldSchema = (() => {
  const SCHEMA_VERSION = 1;
  const STORAGE_PREFIX = 'actgenie_schema_v' + SCHEMA_VERSION + '_';

  // ── Standard top-level API keys that are metadata, not user-editable fields ──
  const SYSTEM_KEYS = new Set([
    'id', 'companyID', 'isUser', 'isImported', 'importDate', 'isPrivate', 'acl',
    'latitude', 'longitude', 'amaScore', 'recordManagerID', 'quickbooksId',
    'nylasContactId', 'created', 'edited', 'editedBy', 'recordOwner',
    'recordManager', 'customFields',
    // *MaskFormat / *CountryCode are phone-rendering metadata, not fields
  ]);

  // Standard API keys whose name differs from the ACT internal/DOM name.
  // Used in Phase 2 to join api↔dom; listed here so the map travels with the schema.
  const API_TO_DOM_OVERRIDES = {
    birthday: 'birthdate',
    emailAddress: 'email',
    altEmailAddress: 'altemail',
    personalEmailAddress: 'personalemail',
    jobTitle: 'title',
    idStatus: 'idstatus',
  };

  // Lightweight synonym seeds for natural-language matching (extend over time).
  const ALIAS_SEEDS = {
    birthday: ['dob', 'date of birth', 'birth date', 'birthdate'],
    spousedob: ['spouse dob', 'spouse date of birth', 'spouse birthday'],
    servicecomputationdate: ['scd', 'service computation date'],
    retiredate: ['retirement date', 'retire date'],
    emailAddress: ['email', 'e-mail'],
    mobilePhone: ['cell', 'cell phone', 'mobile'],
    maritalstatus: ['marital status'],
    ssn: ['social security number'],
  };

  // ── Helpers ──────────────────────────────────────────────────────────────

  // Normalized join key: lowercase, drop CUST_ prefix + _<layoutId> suffix +
  // non-alphanumerics. Makes api `cust_age_033220843`, `ageyy` and dom
  // `CUST_Age_033220843`, `CUST_AgeYY_013844239` correlate to `age`, `ageyy`.
  function normalizeForJoin(name) {
    return String(name || '')
      .replace(/^.*\./, '')          // drop table prefix (TBL_CONTACT.)
      .replace(/^cust_/i, '')        // drop CUST_ prefix
      .replace(/_\d{6,}$/, '')       // drop _<layoutInstanceId> suffix
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');    // drop separators
  }

  // Infer a semantic data type from the field name and a sample value.
  function inferDataType(name, value) {
    const n = String(name).toLowerCase();
    if (typeof value === 'boolean') return 'boolean';
    if (/(^|_)(dob|birth|date|scd)(_|$)|date$/.test(n)) return 'date';
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) return 'date';
    if (/email/.test(n)) return 'email';
    if (/phone|fax|mobile|pager/.test(n)) return 'phone';
    if (/income|cost|salary|pension|balance|amount|value|net|gross|fegli|tsp|assets?|expenses?|mortage|mortgage|pay/.test(n)) return 'currency';
    if (/age|year|month|rate|percent|score|count|qty|number|num/.test(n)) return 'number';
    if (typeof value === 'string' && value !== '' && !isNaN(+value.replace(/[$,]/g, ''))) return 'number';
    return 'text';
  }

  // Calculated/read-only outputs (ACT calc fields + common derived ones).
  function isCalculated(joinKey, rawName) {
    const r = String(rawName).toLowerCase();
    return /^calculated/.test(joinKey) || /^calculated/.test(r) ||
           /(^|_)age($|yy|mm)/.test(joinKey) || joinKey === 'age' ||
           /feglicost|feglinetcost|fegliperpayperiodcalc|feglireduction/.test(joinKey);
  }

  function titleCase(words) {
    return words.map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join(' ');
  }

  // Human label from a key: split camelCase + snake_case into words.
  function humanLabel(key) {
    const words = String(key)
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ');
    return titleCase(words);
  }

  function aliasesFor(apiKey, joinKey, label) {
    const set = new Set();
    const add = v => { if (v) set.add(String(v).toLowerCase()); };
    add(label);
    add(joinKey);
    add(apiKey);
    (ALIAS_SEEDS[apiKey] || ALIAS_SEEDS[joinKey] || []).forEach(add);
    return [...set];
  }

  // ── Core builder (PURE — no chrome/DOM) ───────────────────────────────────
  // Returns { meta, fields: { <joinKey>: <descriptor> } } from an Act! Web API
  // contact object. `value` is captured only for type inference / validation;
  // callers persist the descriptors, not the values.
  function buildSchemaFromApi(apiContact, opts = {}) {
    const fields = {};
    const addField = (apiPath, rawName, value, group) => {
      const joinKey = normalizeForJoin(rawName);
      if (!joinKey) return;
      // First writer wins, but prefer an entry that has a non-null sample value.
      if (fields[joinKey] && (fields[joinKey].sampleValue != null || value == null)) return;
      const apiKey = rawName;
      const label = humanLabel(apiKey.replace(/^cust_/i, '').replace(/_\d{6,}$/, ''));
      fields[joinKey] = {
        key: joinKey,
        label,
        aliases: aliasesFor(apiKey, joinKey, label),
        group,                                   // 'standard' | 'custom' | 'system'
        dataType: inferDataType(rawName, value),
        access: isCalculated(joinKey, rawName) ? 'readonly' : 'readwrite',
        calculated: isCalculated(joinKey, rawName),
        api: { path: apiPath, key: apiKey, domHint: API_TO_DOM_OVERRIDES[apiKey] || null },
        dom: null,                               // filled in Phase 2 (pairing)
        sampleValue: value === '' ? null : value,
      };
    };

    // Standard scalar fields + flattened address objects.
    for (const [k, v] of Object.entries(apiContact || {})) {
      if (SYSTEM_KEYS.has(k)) continue;
      if (/MaskFormat$|CountryCode$/.test(k)) continue;       // phone render metadata
      if (Array.isArray(v)) continue;
      if (v && typeof v === 'object') {
        // businessAddress / homeAddress → business_line1, home_city, …
        const prefix = k.replace(/Address$/i, '');
        for (const [sk, sv] of Object.entries(v)) {
          if (sv && typeof sv === 'object') continue;
          if (/^(latitude|longitude)$/i.test(sk)) continue;
          addField(`${k}.${sk}`, `${prefix}_${sk}`, sv, 'standard');
        }
        continue;
      }
      addField(k, k, v, 'standard');
    }

    // Custom fields (flat object, lowercased keys).
    const cf = apiContact && apiContact.customFields;
    if (cf && typeof cf === 'object') {
      for (const [k, v] of Object.entries(cf)) {
        addField(`customFields.${k}`, k, v, 'custom');
      }
    }

    // Strip the transient sampleValue before returning the schema proper.
    const cleanFields = {};
    let withValue = 0;
    for (const [key, f] of Object.entries(fields)) {
      if (f.sampleValue != null) withValue++;
      const { sampleValue, ...rest } = f;
      cleanFields[key] = rest;
    }

    return {
      meta: {
        schemaVersion: SCHEMA_VERSION,
        db: opts.db || null,
        builtAt: opts.now || null,            // caller stamps (Date.* unavailable in some envs)
        source: 'api',
        fieldCount: Object.keys(cleanFields).length,
        fieldsWithValue: withValue,
        domPaired: 0,                          // updated in Phase 2
      },
      rules: [],                               // data-driven computes (Phase 4)
      fields: cleanFields,
    };
  }

  // ── Persistence (chrome.storage.local) ─────────────────────────────────────
  function storageKey(db) { return STORAGE_PREFIX + (db || 'default'); }

  function saveSchema(db, schema) {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.set({ [storageKey(db)]: schema }, () => resolve(true));
      } catch { resolve(false); }
    });
  }

  function loadSchema(db) {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get([storageKey(db)], (res) => resolve(res?.[storageKey(db)] || null));
      } catch { resolve(null); }
    });
  }

  function clearSchema(db) {
    return new Promise((resolve) => {
      try { chrome.storage.local.remove([storageKey(db)], () => resolve(true)); } catch { resolve(false); }
    });
  }

  // ── Natural-language field lookup (agent-facing) ───────────────────────────
  // Resolve free text ("client's date of birth") to candidate field keys.
  function findFieldsByText(schema, text) {
    const q = String(text || '').toLowerCase().trim();
    if (!q || !schema?.fields) return [];
    const hits = [];
    for (const f of Object.values(schema.fields)) {
      const hay = [f.key, f.label, ...(f.aliases || [])].map(s => String(s).toLowerCase());
      if (hay.some(h => h === q)) hits.push({ field: f, score: 3 });
      else if (hay.some(h => h.includes(q) || q.includes(h))) hits.push({ field: f, score: 1 });
    }
    return hits.sort((a, b) => b.score - a.score).map(h => h.field);
  }

  // ── DOM pairing (Phase 2) ──────────────────────────────────────────────────
  // Joins the API-built schema to the live DOM: for each field we capture how to
  // get/set it (element id, control type, date-picker companion, frame, tab) and
  // refine type/access/options from what's actually rendered (authoritative).

  function safeAtob(str) {
    try { return atob(str + '='.repeat((4 - str.length % 4) % 4)); } catch { return null; }
  }

  // ACT date fields hide their visible value in a Telerik picker input:
  // [ctl00_viewPlaceHolder_]dtp_<id>_dateInput. (Mirror of field-mapper's helper.)
  function findDatePickerInput(el) {
    if (!el || !el.id || !el.ownerDocument) return null;
    const doc = el.ownerDocument, token = 'dtp_' + el.id;
    const direct = doc.getElementById(token + '_dateInput')
                || doc.getElementById('ctl00_viewPlaceHolder_' + token + '_dateInput');
    if (direct) return direct;
    for (const i of doc.querySelectorAll('input[id*="dtp_"][id$="_dateInput"]')) {
      if (i.id.indexOf(token) !== -1) return i;
    }
    return null;
  }

  function detectControl(el) {
    const readonly = !!(el.readOnly || el.disabled || el.getAttribute('readonly') !== null);
    if (el.type === 'checkbox') return { control: 'checkbox', readonly };
    if (el.tagName === 'SELECT') {
      const options = [...el.options]
        .map(o => ({ value: o.value, label: (o.text || '').trim() }))
        .filter(o => o.label || o.value);
      return { control: 'select', options, readonly };
    }
    if (el.tagName === 'TEXTAREA') return { control: 'textarea', readonly };
    const dp = findDatePickerInput(el);
    if (dp || (el.closest && el.closest('.layout-datetime-container'))) {
      return { control: 'date', datePickerId: dp ? dp.id : null, readonly };
    }
    if (/\bDecimal\b/.test(el.className || '')) return { control: 'number', readonly };
    return { control: 'text', readonly };
  }

  function isContactDetailDoc(doc) {
    try { return /ContactDetail\.aspx/i.test(doc.defaultView.location.href); } catch { return false; }
  }

  // Best-effort: the currently-selected sub-tab label, searched across frames.
  // ACT's contact sub-tabs are <td class="newtabsel" id="tab…">; RadTabStrip
  // (used elsewhere) marks the selected item .rtsSelected.
  function detectActiveSubTab(docs) {
    for (const { doc } of docs) {
      try {
        const sel = doc.querySelector('td.newtabsel, .rtsSelected .rtsTxt, li.rtsSelected, .ui-tabs-active');
        const t = sel && (sel.textContent || '').trim();
        if (t) return t;
      } catch {}
    }
    return null;
  }

  // Collect same-origin documents reachable from `root` (main + nested iframes),
  // each tagged with a frame label and tab name. `tabOverride` forces the sub-tab
  // name (used during the sweep, where we just activated a known tab).
  function collectFrames(root, tabOverride) {
    const startDoc = (root && root.document) || (typeof document !== 'undefined' ? document : null);
    if (!startDoc) return [];
    const docs = [];
    const walk = (doc, label, depth) => {
      docs.push({ doc, frameLabel: label });
      if (depth > 5) return;
      try {
        doc.querySelectorAll('iframe,frame').forEach((f, i) => {
          try { if (f.contentDocument) walk(f.contentDocument, `${label}>f${i}`, depth + 1); } catch { /* cross-origin */ }
        });
      } catch {}
    };
    walk(startDoc, 'top', 0);
    const active = tabOverride || detectActiveSubTab(docs);
    return docs.map(({ doc, frameLabel }) => ({
      doc, frameLabel,
      tab: isContactDetailDoc(doc) ? 'main' : (active || null),
    }));
  }

  // ── Hybrid tab sweep ───────────────────────────────────────────────────────
  // ACT contact sub-tabs are <td id="tab…" class="newtab" onclick="tabClick(event)">
  // that load their content into a shared iframe. We activate each in-scope tab,
  // wait for it to render, and pair it — accumulating a complete schema.
  const EXCLUDE_TABS = /^(notes?|documents?|ora|history|activities|opportunities|secondary|contactaccess|campaign|marketing)/i;

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  function activateTab(td) {
    for (const t of ['mouseover', 'mousedown', 'mouseup', 'click']) {
      try { td.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: td.ownerDocument.defaultView })); } catch {}
    }
  }

  // Locate the contact sub-tab strip (the frame holding the most `td#tab*` cells).
  function findTabStrip(root) {
    const frames = collectFrames(root);
    let best = null;
    for (const { doc } of frames) {
      let tds;
      try { tds = [...doc.querySelectorAll('td[id^="tab"]')].filter(td => /newtab/.test(td.className)); } catch { continue; }
      if (tds.length > 3 && (!best || tds.length > best.tabs.length)) best = { doc, tabs: tds };
    }
    if (!best) return null;
    best.original = best.tabs.find(t => /newtabsel/.test(t.className)) || null;
    best.inScope = best.tabs.filter(t => !EXCLUDE_TABS.test((t.textContent || '').replace(/\s+/g, '')));
    return best;
  }

  // Activate each in-scope tab, pairing after each loads; restore the original.
  // opts: { root, tabDelayMs, onProgress }
  async function sweepAndPair(schema, opts = {}) {
    const root = opts.root || (typeof window !== 'undefined' ? window : null);
    const delay = opts.tabDelayMs || 1600;
    // Pair whatever is already loaded first.
    pairDom(schema, collectFrames(root));
    const strip = findTabStrip(root);
    if (!strip) { schema.meta.sweptTabs = []; return { swept: [], note: 'no tab strip found' }; }
    const swept = [];
    for (const td of strip.inScope) {
      const name = (td.textContent || '').trim();
      activateTab(td);
      await sleep(delay);
      const added = pairDom(schema, collectFrames(root, name));
      swept.push({ tab: name, id: td.id, added });
      if (typeof opts.onProgress === 'function') opts.onProgress(name, schema.meta.domPaired);
    }
    if (strip.original) { activateTab(strip.original); await sleep(400); }
    schema.meta.sweptTabs = swept.map(s => s.tab);
    return { swept };
  }

  // Build an index of every DOM join-key → schema field, honoring api↔dom name
  // overrides (e.g. API `birthday` is rendered as DOM `BIRTHDATE`).
  function buildDomKeyIndex(schema) {
    const idx = {};
    for (const f of Object.values(schema.fields)) {
      if (!idx[f.key]) idx[f.key] = f;
      const hint = f.api && f.api.domHint;
      if (hint) { const hk = normalizeForJoin(hint); if (!idx[hk]) idx[hk] = f; }
    }
    return idx;
  }

  // Pair the live DOM into `schema`. First match per field wins. DOM fields the
  // API didn't return are added as `group:'dom-only'` so the map is complete.
  // Returns the number of fields paired this call.
  function pairDom(schema, frames) {
    if (!schema || !schema.fields) return 0;
    const idx = buildDomKeyIndex(schema);
    let paired = 0;
    for (const { doc, frameLabel, tab } of frames) {
      let inputs;
      try { inputs = doc.querySelectorAll('input[id],select[id],textarea[id]'); } catch { continue; }
      for (const el of inputs) {
        if (!el.id || el.id.length < 8) continue;
        const decoded = safeAtob(el.id);
        if (!decoded || !/\./.test(decoded)) continue;
        const key = normalizeForJoin(decoded);
        let f = idx[key];
        if (!f) {
          // DOM field not present in the API result — capture it for completeness.
          const label = humanLabel(decoded.replace(/^.*\./, '').replace(/^CUST_/i, '').replace(/_\d{6,}$/, ''));
          f = {
            key, label, aliases: [key, label.toLowerCase()], group: 'dom-only',
            dataType: 'text', access: 'readwrite', calculated: false,
            api: null, dom: null,
          };
          schema.fields[key] = f;
          idx[key] = f;
        }
        if (f.dom) continue;                          // already paired (first wins)
        const c = detectControl(el);
        f.dom = {
          id: el.id, decoded, frame: frameLabel, tab: tab || null,
          control: c.control, datePickerId: c.datePickerId || null, readonly: c.readonly,
        };
        // Refine type/access/options from the authoritative rendered control.
        if (c.control === 'select') { f.dataType = 'enum'; f.options = c.options; }
        else if (c.control === 'date') f.dataType = 'date';
        else if (c.control === 'checkbox') f.dataType = 'boolean';
        if (c.readonly) f.access = 'readonly';
        paired++;
      }
    }
    schema.meta.domPaired = Object.values(schema.fields).filter(f => f.dom).length;
    schema.meta.domPairedTabs = [...new Set(Object.values(schema.fields).filter(f => f.dom?.tab).map(f => f.dom.tab))];
    return paired;
  }

  // ── Phase 3: fast resolver + get/set ───────────────────────────────────────
  // Resolve a field's LIVE element by id, re-finding the frame each time
  // (robust to frame-index drift and tab reloads). O(frames) getElementById —
  // no full DOM scan. Returns null if the field's tab isn't currently loaded.
  function resolveElement(field, root) {
    if (!field || !field.dom || !field.dom.id) return null;
    for (const { doc } of collectFrames(root)) {
      try { const el = doc.getElementById(field.dom.id); if (el) return el; } catch {}
    }
    return null;
  }

  // Visible value of an element (own value, or the Telerik date-picker value).
  function effectiveValueOf(el) {
    if (!el) return '';
    if (el.type === 'checkbox') return String(el.checked);
    const own = el.value;
    if (own && String(own).trim()) return own;
    const pick = findDatePickerInput(el);
    if (pick && String(pick.value).trim()) return pick.value;
    return own || '';
  }

  // Read a value from an API contact object by api path ("birthday",
  // "customFields.spousedob", "businessAddress.line1").
  function apiReadValue(apiContact, apiPath) {
    if (!apiContact || !apiPath) return null;
    return apiPath.split('.').reduce((o, k) => (o == null ? o : o[k]), apiContact) ?? null;
  }

  // DOM-first read, API fallback when the field's element isn't loaded.
  // opts: { root, apiContact }
  function getValue(field, opts = {}) {
    const el = resolveElement(field, opts.root);
    if (el) return effectiveValueOf(el);
    if (opts.apiContact && field.api) return apiReadValue(opts.apiContact, field.api.path);
    return null;
  }

  // ── DOM write mechanics (self-contained; mirrors field-mapper) ─────────────
  function fireOn(el, type) {
    let evt;
    if (type === 'input' || type === 'change') evt = new Event(type, { bubbles: true, cancelable: true });
    else if (type.startsWith('key')) evt = new KeyboardEvent(type, { bubbles: true, cancelable: true });
    else evt = new MouseEvent(type, { bubbles: true, cancelable: true });
    try { el.dispatchEvent(evt); } catch {}
  }
  function nativeSet(el, value) {
    const win = el.ownerDocument.defaultView || (typeof window !== 'undefined' ? window : null);
    const proto = el.tagName === 'TEXTAREA' ? win.HTMLTextAreaElement.prototype : win.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) setter.call(el, value); else el.value = value;
  }

  // Write `value` into a live element, firing the events ACT's layout handlers
  // listen for. Handles checkbox / select / Telerik date picker / text.
  function writeElement(el, value) {
    if (el.type === 'checkbox') {
      const v = typeof value === 'string' ? value.trim().toLowerCase() : value;
      el.checked = (v === true || v === 'true' || v === '1' || v === 'on' || v === 'yes');
      fireOn(el, 'change'); fireOn(el, 'blur');
      return true;
    }
    if (el.tagName === 'SELECT') {
      el.value = value;
      if (el.value !== value) {
        const opt = [...el.options].find(o => o.text.trim() === String(value).trim() || o.value === String(value));
        if (opt) el.value = opt.value;
      }
      fireOn(el, 'change'); fireOn(el, 'blur');
      return true;
    }
    const pick = findDatePickerInput(el);
    if (pick) {
      fireOn(pick, 'focus'); fireOn(pick, 'click');
      nativeSet(pick, value); pick.setAttribute('value', value);
      fireOn(pick, 'input'); fireOn(pick, 'keyup'); fireOn(pick, 'change'); fireOn(pick, 'blur');
      nativeSet(el, value); el.setAttribute('value', value);
      fireOn(el, 'change'); fireOn(el, 'blur');
      return true;
    }
    fireOn(el, 'focus'); fireOn(el, 'click');
    nativeSet(el, value); el.setAttribute('value', value);
    fireOn(el, 'input'); fireOn(el, 'keyup'); fireOn(el, 'keydown'); fireOn(el, 'change'); fireOn(el, 'blur');
    return true;
  }

  // Ensure a field's tab is loaded so its element resolves (activates the tab
  // and waits). Returns the resolved element or null.
  async function ensureFieldLoaded(field, root, waitMs = 1600) {
    let el = resolveElement(field, root);
    if (el) return el;
    const wantTab = field?.dom?.tab;
    if (!wantTab || wantTab === 'main') return null;
    const strip = findTabStrip(root);
    const td = strip && strip.tabs.find(t => (t.textContent || '').trim() === wantTab);
    if (!td) return null;
    activateTab(td);
    await sleep(waitMs);
    return resolveElement(field, root);
  }

  // Set a field's value. DOM-first (activating its tab if needed); optional API
  // write-back fallback. opts: { root, contactId, bgFetch, allowApi, activateTab }
  async function setValue(field, value, opts = {}) {
    let el = resolveElement(field, opts.root);
    if (!el && opts.activateTab !== false) el = await ensureFieldLoaded(field, opts.root);
    if (el) { writeElement(el, value); return { ok: true, via: 'dom' }; }
    if (opts.allowApi && opts.bgFetch && opts.contactId && field.api) {
      try { await apiSetValue(field, value, opts); return { ok: true, via: 'api' }; }
      catch (e) { return { ok: false, error: e.message }; }
    }
    return { ok: false, error: 'element not found and API write-back not enabled' };
  }

  // API write-back via our proxy (GET-merge-PUT compound update on the server).
  // bgFetch(path, method, body) → resolves the proxy JSON (background worker).
  async function apiSetValue(field, value, opts) {
    const body = { updates: { [field.api.path]: value } };
    return opts.bgFetch(`/api/proxy/act/contact/${opts.contactId}`, 'PUT', body);
  }

  return {
    SCHEMA_VERSION,
    buildSchemaFromApi,
    normalizeForJoin,
    inferDataType,
    humanLabel,
    saveSchema, loadSchema, clearSchema,
    findFieldsByText,
    // Phase 2
    pairDom, collectFrames, detectControl, detectActiveSubTab, findDatePickerInput, safeAtob,
    sweepAndPair, findTabStrip, activateTab,
    // Phase 3
    resolveElement, effectiveValueOf, getValue, setValue, writeElement,
    ensureFieldLoaded, apiReadValue, apiSetValue,
  };
})();

if (typeof window !== 'undefined') window.ActFieldSchema = ActFieldSchema;
if (typeof module !== 'undefined' && module.exports) module.exports = ActFieldSchema;
