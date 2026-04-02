# Grid Row Spacing — Compact Design Standard

> Apply this to any project using **EntityListView** (TanStack Table) with the **Vuexy** (`@core/styles/table.module.css`) template.

---

## The Problem

Vuexy's `table.module.css` enforces a **fixed row height** via `block-size`:

```css
/* src/@core/styles/table.module.css */
tbody th, tbody td {
  block-size: 50px;   /* ← THIS forces every row to 50px regardless of padding */
}
thead th {
  block-size: 56px;   /* ← header also fixed */
}
```

Any `paddingBlock` changes on `<td>` are invisible until this is removed. MUI `<Checkbox>` components also add 9px internal padding by default, further inflating row height.

---

## Fix 1 — Remove fixed row height in `table.module.css`

File: `src/@core/styles/table.module.css`

```diff
  tbody {
    th,
    td {
      font-size: 0.9375rem;
      line-height: 1.4667;
-     block-size: 50px;
+     block-size: auto;
```

```diff
  thead {
    th {
      font-size: 0.8125rem;
-     block-size: 56px;
+     block-size: auto;
```

---

## Fix 2 — Control row padding in `EntityListView.tsx`

Use a two-state density system: **compact** (default, 1px) and **comfortable** (4px).

```ts
// Two-state density — compact is the default
const densityPy = density === 'compact' ? '1px' : '4px'
```

Apply it to every `<td>` in the row renderer:

```tsx
<td key={cell.id} style={{ paddingBlock: densityPy }}>
  {flexRender(cell.column.columnDef.cell, cell.getContext())}
</td>
```

Set the default density to `'compact'` in `useGridPreferences`:

```ts
const [gridPrefs, setGridPrefs] = useGridPreferences(storageKey, {
  density: 'compact',   // ← default compact for all users
  // ...other defaults
})
```

---

## Fix 3 — Simplify density toggle button (2 states only)

```tsx
<IconButton
  size='small'
  onClick={() => setDensity(density === 'compact' ? 'comfortable' : 'compact')}
  sx={{ px: 1, borderRadius: 0 }}
>
  <i className={`text-xl ${density === 'compact' ? 'tabler-layout-rows' : 'tabler-layout-list'}`} />
</IconButton>
```

---

## Fix 4 — Reduce MUI Checkbox internal padding

MUI `<Checkbox>` defaults to `padding: 9px`, making rows at least 36px tall.  
Add `size='small'` and `sx={{ p: '2px' }}` to every checkbox in grid columns:

```tsx
// Select-all header checkbox
<Checkbox
  size='small'
  sx={{ p: '2px' }}
  checked={table.getIsAllRowsSelected()}
  indeterminate={table.getIsSomeRowsSelected()}
  onChange={table.getToggleAllRowsSelectedHandler()}
/>

// Per-row checkbox
<Checkbox
  size='small'
  sx={{ p: '2px' }}
  checked={row.getIsSelected()}
  onChange={row.getToggleSelectedHandler()}
  onClick={(e) => e.stopPropagation()}
/>
```

Also tighten the action `IconButton` in `EntityListView`:

```tsx
// Action (edit) button auto-appended by EntityListView
<IconButton size='small' sx={{ color: 'primary.main', p: '2px' }}>
  <i className='tabler-pencil text-lg' />
</IconButton>
```

---

## Result

| Mode | Row padding | Approx. row height | Toggle icon |
|------|-------------|-------------------|-------------|
| **Compact** (default) | 1px top + 1px bottom | ~24px | `tabler-layout-rows` |
| **Comfortable** | 4px top + 4px bottom | ~32px | `tabler-layout-list` |

- Row height is content-driven (tallest cell wins — typically a `Chip` at `height: 22px`)
- Preference persists **per user** via `useGridPreferences` (localStorage + Supabase)
- The density button in the toolbar toggles between the two modes

---

## Chips & Other Cell Components

Keep Chip height explicitly small so they don't inflate the row:

```tsx
<Chip label={value} size='small' sx={{ height: 22, fontSize: 11 }} />
```

`Typography` cells are fine as-is — their line-height (~20px) is naturally compact.

---

## Files Changed (summary)

| File | Change |
|------|--------|
| `src/@core/styles/table.module.css` | `block-size: 50px` → `auto`, header `56px` → `auto` |
| `src/components/EntityListView.tsx` | `densityPy` 2-state, density toggle 2-state, `<td>` uses `densityPy`, action button `p: '2px'`, default density `'compact'` |
| `src/views/[Entity]View.tsx` | Checkbox `size='small' sx={{ p: '2px' }}` on select column cells |
