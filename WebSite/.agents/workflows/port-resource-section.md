---
description: Port a resource section from Current/ into the New/ site and add it to the Resources menu
---

## Workflow: Port a Resource Section

Use this workflow to bring one of the three legacy sections (`benefits-analysis`, `fegli-analysis`, or `social-security-analysis`) into the new site.

### Prerequisites
- Identify the section to port (e.g., `benefits-analysis`)
- Have `New/index.html` and `New/Header_Menu.png` available for reference
- Have `Current/Current_Site_Header_Section.png` available for reference

### Steps

1. **Review the source section**
   - Open `Current/<section-name>/` and review all HTML, CSS, and asset files.
   - Note any external dependencies (fonts, images, scripts) that need to be copied.

2. **Copy section folder into New/**
   - Copy `Current/<section-name>/` → `New/<section-name>/`
   - Do NOT copy from `New - Copy/` — that folder is read-only backup.

3. **Audit and fixup paths in the copied HTML**
   - Update any absolute WordPress paths to relative paths.
   - Ensure images, CSS, and JS references resolve correctly from within `New/<section-name>/`.

4. **Add menu item to New/index.html**
   - Locate the `Resources` dropdown menu in `New/index.html`.
   - Add a new `<li>` entry pointing to `<section-name>/index.html` (or the appropriate page).
   - Match the existing `<li>` structure and class names exactly.
   - Reference `New/Header_Menu.png` and `Current/Current_Site_Header_Section.png` for visual guidance.

5. **Verify in browser**
   - Open `New/index.html` in a browser.
   - Confirm the new menu item appears under Resources.
   - Click the link and confirm the section page loads correctly.

6. **Repeat for remaining sections**
   - Run this workflow again for each of the three sections.
