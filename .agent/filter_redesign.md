# Column Filter Redesign — Implementation Guide

> **Purpose:** Portable specification for the multi-condition column filter popup pattern.
> Apply this to any app using `EntityListView` + TanStack Table.

---

## UX Pattern: "Match ALL / ANY"

Inspired by Gmail filters, Apple Mail rules, and Airtable.
Intuitive to non-technical users — no jargon.

### Layout

```
COLUMN FILTER
  ? Match ALL conditions
  ? Match ANY condition
 -----------------------------------------
 [Starts With ?] [Paul            ] [×]
         ——— AND ———
 [Contains    ?] [Value...        ] [×]

 + Add condition                (up to 4)
 -----------------------------------------
                   [Clear]  [Apply]
```

### Behavior Rules

| Rule | Detail |
|---|---|
| **Progressive disclosure** | Opens with 1 row. Click "+ Add condition" to reveal more (max 4). |
| **Remove button** | Shows × when more than 1 condition visible. Clicking shifts rows up. |
| **AND/OR connector** | Small badge between rows shows combinator. Updates live when radio changes. |
| **Global combinator** | One AND/OR applies to ALL conditions — not per-pair. |
| **Restore state** | Re-opening shows as many rows as there are active conditions. |
| **Case insensitive** | All ops are case-insensitive (ILIKE in SQL, .toLowerCase() client-side). |

---

## Supported Operators

| Operator | SQL |
|---|---|
| contains | ILIKE '%v%' |
| notContains | NOT ILIKE '%v%' |
| startsWith | ILIKE 'v%' |
| endsWith | ILIKE '%v' |
| equals | = v (ilike) |
| notEquals | != v |
| isEmpty | IS NULL OR = '' |
| isNotEmpty | IS NOT NULL AND != '' |

---

## Data Model

### ColFilterValue (TanStack column filter state)

```typescript
type ColFilterValue = {
  combinator: 'and' | 'or'
  conditions: [FilterCondition, FilterCondition, FilterCondition, FilterCondition]
  // Always 4 slots. Unused = { op:'contains', value:'' }
}
```

### filter_criteria JSON (stored in Supabase collections table)

```json
{
  "state": "TX",
  "gender": "M",
  "favorite": false,
  "search": "",
  "sorting": [{ "id": "last_name", "desc": false }],
  "columnFilters": [
    {
      "id": "first_name",
      "value": {
        "combinator": "and",
        "conditions": [
          { "op": "startsWith", "value": "Paul" },
          { "op": "contains", "value": "" },
          { "op": "contains", "value": "" },
          { "op": "contains", "value": "" }
        ]
      }
    }
  ]
}
```

---

## Key Files

| File | Role |
|---|---|
| src/lib/columnFilter.ts | Types, isConditionActive(), multiConditionFilterFn |
| src/components/DraggableColumnHeader.tsx | FilterPopover UI, FilterInput pill |
| src/app/api/leads/route.ts | Fast path (RPC) vs slow path (PostgREST) routing |
| src/views/leads/LeadsView.tsx | handleFilterChange, filterSummaryChips, SaveToCollection wiring |
| src/components/SaveToCollectionDialog.tsx | Saves filter state to a collection |
| src/views/collections/CollectionsView.tsx | Filters column + Apply in Leads button |
| src/views/collections/CollectionEditDialog.tsx | Saved Filters read-only section |

---

## API Server-Side Routing

```
GET /api/leads?filters=[...]

  columnFilters.length > 0?
    YES -> PostgREST slow path  (ILIKE per condition, all SQL)
    NO  -> search_leads() RPC   (full-text index, fast)
```

CRITICAL: The leads table must have RLS SELECT policy for authenticated
users or the PostgREST slow path silently returns 0 rows
while the SECURITY DEFINER RPC keeps working.

```sql
CREATE POLICY "authenticated_read_leads"
ON public.leads FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_update_leads"
ON public.leads FOR UPDATE TO authenticated
USING (true) WITH CHECK (true);
```

---

## Save / Recall Collection Flow

**Saving:**
1. User applies filters ? clicks bookmark-plus icon in toolbar
2. SaveToCollectionDialog shows active filter chips + lead count
3. User picks existing collection or creates new
4. PUT /api/collections/[id] with filter_criteria JSON

**Recalling:**
1. User picks collection from Collection dropdown
2. handleCollectionChange fetches /api/collections/[id]
3. Applies filter_criteria fields to UI state (setStateFilter, setColumnFilters, etc.)
4. fetchLeads re-runs -> grid shows filtered results
5. Toast: "Filters from 'Collection Name' applied"

---

## isConditionActive — Key Helper

```typescript
export function isConditionActive(c: FilterCondition): boolean {
  // isEmpty/isNotEmpty need no value. All others need non-empty trimmed value.
  return c.op === 'isEmpty' || c.op === 'isNotEmpty' || c.value.trim() !== ''
}
```

---

## Human-Readable Filter Summary (for chips display)

```typescript
const opLabel = {
  contains: 'contains', notContains: 'not contains',
  startsWith: 'starts with', endsWith: 'ends with',
  equals: 'equals', notEquals: 'not equals',
  isEmpty: 'is empty', isNotEmpty: 'is not empty',
}

function filterSummaryChips(fc: FilterCriteria): string[] {
  const chips: string[] = []
  if (fc.state !== 'all')  chips.push(`State: ${fc.state}`)
  if (fc.gender !== 'all') chips.push(`Gender: ${fc.gender === 'M' ? 'Male' : 'Female'}`)
  if (fc.favorite)         chips.push('Favorites only')
  if (fc.search?.trim())   chips.push(`Search: "${fc.search}"`)
  for (const cf of fc.columnFilters ?? []) {
    for (const cond of cf.value.conditions.filter(isConditionActive)) {
      const col = cf.id.replace(/_/g, ' ')
      const label = cond.op === 'isEmpty' || cond.op === 'isNotEmpty'
        ? `${col} ${opLabel[cond.op]}`
        : `${col} ${opLabel[cond.op]} "${cond.value}"`
      chips.push(label)
    }
  }
  return chips
}
```

---

## Known Limitations / Future Work

| Item | Notes |
|---|---|
| Header indicator after recall | Filter pill in column header doesn't reappear. EntityListView internal TanStack state needs syncing from parent via controlledColumnFilters prop. |
| Per-pair AND/OR | Current model uses ONE global combinator. True per-pair needs conditions to carry own combinator field + API changes. |
| Slow path perf | ILIKE on 472K rows with no index is slow. Add pg_trgm GIN index on frequently filtered text columns for production scale. |
