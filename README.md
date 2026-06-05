# VA Onboarding Portal

A multi-tenant onboarding and task-management portal for virtual-assistant teams,
built on Next.js 16 (App Router) + Supabase. New members work through sequential
onboarding phases; active members log daily work and submit end-of-week reports;
admins manage members, content, performance, and offboarding.

> Currently deployed for **Funnel Futurist**. Branding lives in
> [`config/brand.ts`](config/brand.ts) — edit it to re-skin. See
> [`docs/PORTABILITY.md`](docs/PORTABILITY.md) for what's still tenant-specific.

## Documentation

| Doc | What's in it |
| --- | --- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | App structure, routes, render model, auth, phase gating |
| [docs/SCHEMA.md](docs/SCHEMA.md) | Tables, RLS, migration order, indexes, performance hotspots |
| [docs/PORTABILITY.md](docs/PORTABILITY.md) | Env vars, setup, what's not yet portable, template roadmap |
| [docs/UI-IMPROVEMENTS.md](docs/UI-IMPROVEMENTS.md) | Safe presentation/polish backlog |

> ⚠️ This is a non-standard Next.js build — middleware is [`proxy.ts`](proxy.ts)
> (exported as `proxy`). See [AGENTS.md](AGENTS.md) before writing framework code.

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in Supabase keys (see docs/PORTABILITY.md)
npm run dev                  # http://localhost:3000
```

Database setup, the migration order, and first-admin bootstrap are documented in
[docs/SCHEMA.md](docs/SCHEMA.md) and [docs/PORTABILITY.md](docs/PORTABILITY.md).
Run [`supabase/indexes.sql`](supabase/indexes.sql) for the recommended performance
indexes (safe and idempotent).

## Scripts

- `npm run dev` — dev server
- `npm run build` — production build (also type-checks)
- `npm run lint` — ESLint
- `npm start` — serve the production build
