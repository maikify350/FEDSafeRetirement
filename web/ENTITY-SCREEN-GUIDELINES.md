# Web Entity Detail & Edit Screen — Implementation Guidelines

> ⚠️ **WEB VERSION ONLY**: These guidelines **do not apply** to the Mobile version of the application. The Mobile application has entirely different layout paradigms, components, and navigational structures.
> 
> **USE REUSABLE COMPONENTS**: This architecture relies heavily on shared, imported components. **DO NOT** reinvent the wheel, and **DO NOT** duplicate code across entities. If a subsection exists as a shared component (e.g., Addresses, Phones, Emails), you must import and use it.

---

## 1. Architecture — "Full Page Edit" Dialog Pattern

Entity screens in the Web App now support two modes based on a global user setting (`fullPageEdit`). 

While the system retains fallback support for the legacy side-slider drawer, **the new standard for complex entities is the Draggable Full-Page Popup Dialog**. 

When `fullPageEdit` is active:
1. Double-clicking a grid row opens an array-managed `[Entity]FullPageDetail` component (a custom draggable Material-UI `Dialog`).
2. The component completely manages its own `isEditing` state internally.
3. **Read Mode**: Displays a multi-panel resizable layout using `react-resizable-panels`.
4. **Edit Mode**: Flips the internal content to the `[Entity]EditPanel` passing `inline={true}`, cleanly transitioning layouts WITHOUT opening a brand new modal.

### ❌ Anti-patterns — NEVER do these
- Do NOT use browser native `alert()`, `confirm()`, or `prompt()`. Always use a MUI `<Dialog>` (e.g., for delete confirmation).
- Do NOT rewrite phone, email, or address mappers in the individual entity edit forms.
- Do NOT let the dialog opening animation flash the screen backdrop (must use `transitionDuration={0}`).
- Do NOT close the entire dialog when the user clicks "Cancel" in Edit mode. Hitting Cancel or Escape should strictly revert `isEditing` to `false` and return them to the Read mode.

---

## 2. Shared Reusable Components

Always import these instead of building custom layouts for standard fields:

| Component | Import Path | Purpose |
|-----------|-------------|---------|
| `MultiPhoneSection` | `@/components/MultiPhoneSection` | Manages an array of phones. Contains standard `22px` trash icons. |
| `MultiEmailSection` | `@/components/MultiEmailSection` | Manages an array of emails. Contains standard `22px` trash icons. |
| `MultiAddressSection` | `@/components/MultiAddressSection` | Manages addresses with Google Places autocomplete, cloud/maps/earth interactive buttons, and `22px` trash icons. |
| `SectionHeader` | `@/components/SectionHeader` | Standardized header typography for subsections. |
| `EditPanel` | `@/components/EditPanel` | Base form container logic. Renders cleanly alongside inline layouts. |
| `ContactLink` | `@/components/ContactLink` | For clickable links (`tel:`, `mailto:`, new tab URLs). |
| `DictationButton`| `@/components/DictationButton` | Adds a microphone to input fields for speech-to-text. |

---

## 3. Detail View Layout (Read Mode)

The read-only detail panel is embedded inside the draggable popup.

1. **Draggable Dialog Wrapper**: 
   - Uses `react-draggable` wrapped around a MUI `<Dialog>`.
   - **Crucial Props**: `hideBackdrop`, `disableScrollLock`, `disableEnforceFocus`, `transitionDuration={0}`, and `pointerEvents: 'none'`. (The inner Paper wrapper restores pointer events).
2. **Top Header (`DialogTitle`)**:
   - Left: Avatar (`CustomAvatar` with `getInitials()`) and Entity Name.
   - Right (Action Controls): **Pencil Icon** (Switch to Edit) + **X Icon** (Close Dialog completely).
3. **Body Layout (`react-resizable-panels`)**:
   - `PanelGroup` is used to create horizontal splits between form data and related records.
   - Left Panel (Details): Grid mapped fields using `FieldDisplay` and shared components. Multi-line fields take equal vertical space with `minHeight: 0` handling overflow.
   - Right Panel (Related): Accordions (Quotes, Jobs, Invoices) defaulted to **collapsed**. Credit status displays with thumb up/down icons next to bad/good status text.
4. **Fixed Footer (`DialogActions`)**:
   - Exclusively shows the Entity's Audit footprint (e.g., "Created by... Last modified by...").
   - Requires `justifyContent: 'center'`, `Typography variant="caption"`, and `fontStyle="italic"`.

---

## 4. Edit View Layout (`inline={true}`)

When the Pencil icon is clicked, the internal view transforms to editing mode smoothly inside the same popup boundaries.

1. **Top Header Changes (`DialogTitle`)**:
   - The Pencil icon swaps out for standard edit controls:
     - **Red Trash Icon:** Triggers a strict MUI confirmation dialog for record deletion.
     - **Cancel Button:** Returns the view to Read Mode (`setIsEditing(false)`).
     - **Save Button:** Submits changes and shows loading states.
   - The X Icon remains but is re-routed to also act as a Cancel/Exit-Edit button so the user doesn't accidentally terminate the entire popup window.
2. **Body Layout**:
   - Swaps text displays for `CustomTextField` inputs.
   - Embedded UI enhancements: Validated Website fields display a dynamic `tabler-external-link` button inside the input's `InputAdornment` when formatted correctly (only showing when valid).
   - Multi-line notes fields on the right side of the split take equal vertical space instead of scrolling endlessly. Use `minHeight: 0` and `overflow: 'hidden'` boundaries to prevent textareas from breaking out of the dialog bounds.
3. **Fixed Footer (`DialogActions`)**:
   - The same Audit footprint text remains permanently displayed and centered across the bottom border.

---

## 5. UI Transitions & Flashes

- **Background Flashes:** Standard Material UI dialogs will trigger a gray background overlay sequence. Because these popup windows operate alongside grid views and other tools, `<Dialog>` components MUST enforce `transitionDuration={0}` to seamlessly render.
- **Row Clicking:** Firing off triggers from the Data Grid should instantly surface the detail popup. Do not push full-page router navigations that clear out the background workspace. Manage open popups natively via an ID array (e.g., `openDetailIds` passed to `<EntityDetailPanel>`).
- **Data Loading:** When fetching data, do not let the legacy side-drawer flash on the screen before the new Draggable layout renders. Use proper conditional tracking to suppress the side drawer if `fullPageEdit` is active and data is fetching.
