# FEDSafe Retirement – Website Project Conventions

## Project Overview

This project integrates content sections from the legacy **FEDSafe Retirement** WordPress site into a new static HTML website. The goal is to port three resource sections into the new site while preserving design consistency.

## Folder Structure

```
c:\WIP\FEDSafeRetirement\WebSite\
├── .agents/                  ← Antigravity config & workflows
├── Current/                  ← Legacy site sections to port (DO NOT DELETE)
│   ├── benefits-analysis/
│   ├── fegli-analysis/
│   └── social-security-analysis/
├── New/                      ← The active working site (edit HERE)
│   ├── index.html            ← Main entry point
│   ├── resources/            ← Existing Resources section
│   └── ...
├── New - Copy/               ← BACKUP — DO NOT MODIFY
├── PRD.md                    ← Project requirements
└── the_ask.md                ← Customer brief
```

## ⚠️ Critical Rules

- **`New - Copy/`** is a safety backup. **Never modify or delete files in this folder.**
- All active work goes into **`New/`**.
- The WIP cloud reference site is: https://fedsafev2.zeppelinwebsites.com/
- The production site is: https://fedsaferetirement.com/

## Technology Stack

- **Static HTML/CSS/JS** — No build system, no npm, no framework.
- The site originated as a WordPress export; the `New/` folder contains raw HTML.
- Styling should be consistent with the existing `index.html` design language.

## Key Tasks (from PRD)

1. Port three sections from `Current/` into the `New/` site:
   - `benefits-analysis/`
   - `fegli-analysis/`
   - `social-security-analysis/`
2. Add these three sections as sub-menu items under the **Resources** menu in `New/index.html`.
3. Match the existing header/menu style (reference: `New/Header_Menu.png` and `Current/Current_Site_Header_Section.png`).

## Workflow

- Reference screenshots in `Current/` and `New/` before making UI changes.
- When modifying `index.html`, always preserve the existing navigation structure before adding new items.
- Test changes by opening `New/index.html` in a browser.
