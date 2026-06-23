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

  return {
    SCHEMA_VERSION,
    buildSchemaFromApi,
    normalizeForJoin,
    inferDataType,
    humanLabel,
    saveSchema, loadSchema, clearSchema,
    findFieldsByText,
  };
})();

if (typeof window !== 'undefined') window.ActFieldSchema = ActFieldSchema;
if (typeof module !== 'undefined' && module.exports) module.exports = ActFieldSchema;
