# nexa-admin

The admin panel. Next.js (App Router) → Vercel. Talks to `nexa-server` over one env var:
`NEXT_PUBLIC_API_URL`.

**Source of truth is `nexa-docs`.** Read `nexa-docs/CLAUDE.md`, `docs/API.md`,
`docs/CONVENTIONS.md` (§Frontend) before writing code. Rules live there, never forked here.

## Repo-specific rules
- **All API calls go through `src/lib/api.ts`.** No raw `fetch`/`axios` in a component (ESLint
  enforces this). It is the one place base URL, credentials, and error mapping live.
- Response types are hand-written in `src/lib/types.ts` only, from `docs/API.md`. If an endpoint
  isn't in `API.md`, it doesn't exist yet — stop, don't guess the shape.
- Server state via **TanStack Query** only; Redux/Zustand for genuine client state (modals,
  filters, wizard steps) — not for API responses.
- `src/lib/money.ts` **formats** money strings; it never does arithmetic. Totals come from the
  server already computed.
- Every list screen handles four states: loading, empty, error, populated.
- Admin and distributor may hold near-identical components — that duplication is accepted
  (ADR-0007). Copy, don't share.

## Commands
```bash
npm install
cp .env.example .env.local        # set NEXT_PUBLIC_API_URL
npm run dev                        # http://localhost:3000
npm run lint && npm run build
```

@AGENTS.md
