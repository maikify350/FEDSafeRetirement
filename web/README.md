# JobMaster Web Admin

Desktop-first admin panel built on Vuexy (Next.js + MUI + TypeScript). Shares the same Hono backend and `shared/contracts.ts` as the mobile app.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | Material UI v7 |
| Styling | Tailwind CSS 4 + Emotion |
| Backend | Hono (same as mobile — port 3000) |

## Local Setup (Windows)

```bash
cd web
pnpm install
cp .env.example .env.local
pnpm dev   # starts on http://localhost:3001
```

Backend must be running: `cd backend && bun dev`

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_BACKEND_URL` | `http://localhost:3000` | Hono backend URL |

## Port Layout (local)

| Service | Port |
|---------|------|
| Expo mobile | 8081 |
| Hono backend | 3000 |
| Next.js web admin | 3001 |

## Architecture

- **API client**: `src/lib/api.ts` — fetch wrapper, attaches JWT from localStorage
- **Auth**: `src/context/AuthContext.tsx` — calls `/api/mvp-auth/login`, no NextAuth
- **Shared types**: `@shared/contracts` resolves to `../shared/contracts.ts`
- **Isolated**: Own `node_modules`, zero impact on mobile/backend
