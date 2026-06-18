# FEDSafe Retirement Website

Production website source for FEDSafe Retirement.

## Source Of Truth

- Edit pages in `New/`
- Build output is generated in `dist/`
- Do not manually edit `dist/`
- Do not edit `New - Copy/` (backup only)

## Prerequisites

- Node.js 20+ (see workspace `.nvmrc`)

## Install

```bash
npm install
```

## Commands

```bash
npm run layout   # apply shared header/footer layout dependencies
npm run shared   # refresh shared footer/component content in New/
npm run build    # layout + shared + vercel build pipeline to dist/
npm run preview  # serve dist/ at http://localhost:4173
npm run dev      # apply layout/shared then serve New/ at http://localhost:4173
```

## Typical Workflow

1. Edit files in `New/`
2. Run `npm run build`
3. Preview with `npm run preview`
4. Commit only intended source/build changes

## Related Documentation

- `docs/BUILD.md`
- `docs/LAYOUT.md`
- `docs/FORMS.md`
- `.agents/CONVENTIONS.md`
- `SHARED_LAYOUT.md`
