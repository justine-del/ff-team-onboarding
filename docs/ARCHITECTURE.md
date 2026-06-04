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

Sequential steps, each gating the next:

| Phase | Route | Reference | Completion |
| --- | --- | --- | --- |
| 0 — Getting Started (Guide) | `/guide` | static content | `profiles.guide_completed` |
| 1 — System Access | `/onboarding/phase1` | `phase1_tasks` | `phase1_completion` |
| 2 — Foundations | `/onboarding/phase2` | `incubator_lessons` | `lesson_completion` |
| 2.1 — Core SOPs | `/onboarding/sops` | `sop_documents` | `sop_completion` |

**Gating is the single source of truth in [lib/onboarding/gating.ts](../lib/onboarding/gating.ts).**
A step unlocks only when the prior one is complete; admins bypass.
- **Phase 0:** new members land on the Guide and click "Mark complete" (→ `POST /api/guide-complete` sets `profiles.guide_completed`). Phase 1 is locked until then. The Guide renders from **`content/getting-started.md`** (the canonical user-facing "how it works" doc) via `app/guide/page.tsx` — edit the markdown to update the page; the sidebar TOC is generated from its headings.
- The **dashboard** uses `computePhaseGates()` to lock the phase cards (Phase 0 → 1 → 2 → SOPs).
- Each **`onboarding/*/layout.tsx`** (phase1, phase2, sops) calls `getPhaseContext()`
  ([lib/onboarding/server.ts](../lib/onboarding/server.ts)) and, if the prerequisite isn't met,
  renders a clean **`LockedPhase`** screen (🔒 + link to the prior step) instead of redirecting —
  so a locked phase *shows as locked* rather than bouncing.
- Within a phase, items unlock sequentially via `lib/onboarding/taskGating.ts` (Mark-complete per item).
- Thresholds live in `PHASE_TOTALS` ([lib/constants.ts](../lib/constants.ts)).

**Navigation:** one universal top bar — [components/nav/QuickNav.tsx](../components/nav/QuickNav.tsx) —
renders on every member page (brand → Getting Started, Home, phases, Task Sheet, Resources → admin links + sign out), so nothing is buried. Locked phases render as a non-clickable 🔒 tab (via `lockedPaths`).

**Auth/perf:** the middleware ([proxy.ts](../proxy.ts)) gates with `getSession()` (cookie read, no network) rather than `getUser()` on every request; server components still call `getUser()` to validate. This removes a per-navigation round-trip to the (Tokyo) auth server.

**Task sheet roles:** besides recurring tasks, a VA can have **Roles** (`va_custom_tasks.is_role`) —
time-tracked like a task, with optional sub-tasks (`va_custom_tasks.parent_id`) that expand/collapse
to log at the role level or per sub-task.

> **Performance note:** the Supabase DB is in **Tokyo** while the app's serverless functions run in **US-East** — every query crosses the Pacific, which dominates page-load latency. The real fix is co-locating them (move the DB to US-East, or functions to Asia). Indexes are applied; the geographic hop remains an open decision.

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
