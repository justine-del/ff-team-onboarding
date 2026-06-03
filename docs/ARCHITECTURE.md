# Architecture

> **Living document.** When you add a route, table, integration, or config value,
> update the relevant section here in the same change. Keep it accurate over
> exhaustive — this is the map people read before touching the code.

## What this app is

A multi-tenant onboarding + task-tracking portal for virtual-assistant (VA) teams.
New members work through sequential onboarding **phases**; active members log daily
work on a **task sheet** and submit **end-of-week (EOW) reports**; admins invite
members, manage content/SOPs, track performance, and run offboarding.

## Tech stack

| Concern | Choice |
| --- | --- |
| Framework | **Next.js 16** (App Router, React 19, TypeScript strict) |
| Database / Auth | **Supabase** (Postgres + Supabase Auth + Row-Level Security) |
| Styling | **Tailwind CSS 4** (dark theme), tokens in [lib/ui.ts](../lib/ui.ts) |
| AI | Anthropic Claude (chat, content), Groq (EOW reports), Google GenAI |
| Integrations | Google Drive (SOP context, EOW docs), Slack (weekly notifications) |
| Export | ExcelJS (timesheet XLSX), Recharts (dashboard charts) |
| Hosting | Vercel (+ a weekly cron, see [vercel.json](../vercel.json)) |

> ⚠️ **This is not stock Next.js.** Middleware lives in [proxy.ts](../proxy.ts)
> and is exported as `proxy` (not `middleware`). Read `node_modules/next/dist/docs/`
> before relying on framework conventions from memory. See [AGENTS.md](../AGENTS.md).

## Directory layout

```
app/                      # App Router — routes ARE the URLs
  (auth)  login/ update-password/ auth/signout/
  dashboard/              # member + admin landing (server component)
  onboarding/
    phase1/               # System Access checklist
    phase2/  + layout.tsx # Foundations lessons — layout = server gate
    sops/    + layout.tsx # Core SOPs — layout = server gate
  tasks/                  # weekly task sheet + XLSX export (client)
  resources/  guide/      # learning resources, help guide
  admin/                  # users, companies, performance, content, offboarding
  api/                    # route handlers (chat, invite, offboard, eow-*, …)
components/
  chat/      FloatingChat.tsx       # global bottom-right AI widget
  stats/     MemberStats.tsx        # Recharts dashboard
  nav/       QuickNav.tsx           # member tab bar
  offboarding/ VAOffboardingForm.tsx
  providers/ ThemeProvider.tsx
config/
  brand.ts                # tenant branding/config — EDIT HERE, not source
  chat-prompt.ts          # FF-specific chat system prompt (tenant data)
lib/
  supabase/{server,client}.ts   # SSR + browser Supabase clients
  google-drive.ts               # Drive context fetch (30-min cache)
  constants.ts                  # phase totals, timezone, week window, ID offset
  types.ts                      # shared domain types
  ui.ts                         # shared Tailwind class tokens
  onboarding/{gating,server}.ts # phase-gating logic + server resolver
supabase/                 # raw SQL migrations (run in order, see SCHEMA.md)
docs/                     # this folder
```

**Conventions:** route folders & SQL files are kebab-case; components are
PascalCase grouped by domain; DB tables/columns are snake_case; the `@/*` import
alias maps to the repo root (see [tsconfig.json](../tsconfig.json)).

## Render & data model

- **Server components** (dashboard, admin/performance, guide, onboarding layouts)
  read Supabase server-side. The dashboard and a few admin reads use the **service
  role key** to bypass RLS for cross-user reads — this is deliberate but means
  those files must enforce their own authorization (they check `role` first).
- **Client components** (tasks, admin/users, sops, phase pages, offboarding form,
  FloatingChat) fetch on mount via the browser client or `POST` to `/api/*`.
- **API routes** under `app/api/` handle mutations and integrations (invites,
  password setup, offboarding, EOW doc/report generation, chat, weekly health check).

## Auth flow

1. [proxy.ts](../proxy.ts) (middleware) refreshes the Supabase session on every
   request and redirects unauthenticated users to `/login`.
2. Admins invite members → `/api/invite` creates the auth user + profile and
   returns a one-time password-setup link (`/update-password`).
3. `profiles.role` (`super_admin | admin | member | offboarding | offboarded`)
   drives navigation and RLS. A DB trigger auto-creates a profile on signup.

## Onboarding phases & gating

Three sequential phases, each with its own completion table:

| Phase | Route | Reference table | Completion table |
| --- | --- | --- | --- |
| 1 — System Access | `/onboarding/phase1` | `phase1_tasks` | `phase1_completion` |
| 2 — Foundations | `/onboarding/phase2` | `incubator_lessons` | `lesson_completion` |
| 2.1 — Core SOPs | `/onboarding/sops` | `sop_documents` | `sop_completion` |

**Gating is the single source of truth in [lib/onboarding/gating.ts](../lib/onboarding/gating.ts).**
A phase unlocks only when the prior phase's checklist is complete; admins bypass.
- The **dashboard** uses `computePhaseGates()` to lock the phase cards.
- The **phase2 / sops `layout.tsx`** files call `getPhaseContext()`
  ([lib/onboarding/server.ts](../lib/onboarding/server.ts)) and `redirect('/dashboard')`
  if the prerequisite isn't met — so direct URL access is blocked, not just hidden.
- Thresholds live in `PHASE_TOTALS` ([lib/constants.ts](../lib/constants.ts)).

## External integrations (at a glance)

| Service | Used for | Required? |
| --- | --- | --- |
| Supabase | DB + auth (everything) | **Yes** |
| Anthropic | FloatingChat, resource generation | Yes for AI features |
| Groq | EOW report text generation | Optional |
| Google Drive | live SOP context for chat, EOW Google Docs | Optional |
| Slack | weekly health-check notification | Optional |

See [PORTABILITY.md](./PORTABILITY.md) for the full env-var matrix and setup steps,
and [SCHEMA.md](./SCHEMA.md) for the database design and performance notes.
