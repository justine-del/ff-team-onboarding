# Portability & Template Audit

> What makes this repo hard to hand to someone else today, what we've already
> parameterised, and the roadmap to a clone-and-configure template.

## TL;DR

The multi-tenant **core is portable** (companies, `company_id` RLS, a provisioning
API). What's *not* yet portable is **content and setup friction**: branding (now in
config), seeded data (still FF-specific), 11 env vars / external accounts, and a
few features that reimplement what external tooling already does.

## 1. Branding & config — ✅ now centralised

All code-level FF strings were moved to [config/brand.ts](../config/brand.ts):
product name, company name, tagline, billing email, founder names, timezone, and
the public site-URL fallback. Pages/routes/components import from there.
Change one file to re-skin the app.

The FF chat system prompt moved to [config/chat-prompt.ts](../config/chat-prompt.ts)
(loaded only for the `funnel-futurist` company slug; every other tenant uses the
generic DB-driven prompt in `app/api/chat/route.ts`).

## 2. Environment variables / external accounts — setup friction

A new owner must provision all of these (the hardest part of standing this up):

| Var | Service | Required | Notes |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | **Yes** | project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | **Yes** | browser client |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | **Yes** | server admin reads/writes |
| `ANTHROPIC_API_KEY` | Anthropic | for AI | FloatingChat, resource gen |
| `GROQ_API_KEY` | Groq | optional | EOW report text |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Google Cloud | optional | Drive + EOW Google Docs |
| `GOOGLE_DRIVE_FOLDER_ID` | Google Drive | optional | SOP source folder |
| `SLACK_BOT_TOKEN` | Slack | optional | weekly-check notification |
| `WEEKLY_CHECK_SECRET` | — | optional | bearer auth for the cron route |
| `PROVISION_SECRET` | — | optional | auth for the provisioning API |
| `NEXT_PUBLIC_SITE_URL` | — | optional | auth redirect base; falls back to a hardcoded Vercel URL in [config/brand.ts](../config/brand.ts) — **set this in any real deploy** |

See [.env.example](../.env.example). The Slack channel ID in
`app/api/weekly-check/route.ts` and the Google service-account flow are both
undocumented setup steps a new owner would hit.

## 3. Seeded / hardcoded DATA — ⚠️ still FF-specific (deferred)

These are **data**, not code, and were intentionally left for the template pass:

- `supabase/multi-tenant.sql` seeds the **"Funnel Futurist"** company (`slug =
  funnel-futurist`), which also triggers the FF-only chat prompt.
- `supabase/seed.sql` — FF phase tasks, lesson titles, SOP names, and the
  `EOW-3 — EOW FF Support Form` task definition.
- `app/tasks/page.tsx` `DEFAULT_TASKS` — hardcoded Loom / Google-Docs / Typeform
  URLs and an `EOW FF Support Form` entry.
- `app/onboarding/phase1/page.tsx` and `phase2/page.tsx` — hardcoded FF Loom /
  Google-Docs URLs and "Cyborg VA Incubator" lesson content.
- Timezone copy ("8am–6pm PHT", "8 PM EST" task windows) — the offset is now a
  config value, but human-readable copy in task definitions is still literal.

**To template:** move phase/lesson/task/SOP content out of source and seed into
the DB per company at provisioning time, and stop special-casing the
`funnel-futurist` slug.

## 4. Features that reimplement external tooling — review candidates

Flagged, **not removed** this pass. Each is a candidate to delete or replace with
a managed tool when slimming the template:

- **AI chat assistant** (`/api/chat`, `FloatingChat`) — a custom Claude wrapper
  over SOP text; could be a Slack bot or a docs search.
- **Weekly health check** (`/api/weekly-check` + Vercel cron + Slack) — duplicates
  uptime/monitoring tooling.
- **EOW LLM report generation** (`/api/eow-report`, Groq) — couples the app to a
  second LLM vendor for what could be a form/template.
- **Company provisioning API** (`/api/external/provision-company`) — service-to-
  service coupling that implies an external portal; drop if not needed by clones.

## 5. Setup steps (current reality)

1. Create a Supabase project; run the SQL files in the order listed in
   [SCHEMA.md](./SCHEMA.md).
2. Manually promote your first admin: `update profiles set role='admin' where email='…'`.
3. Set the env vars above (Supabase required; AI/Drive/Slack as needed).
4. Run `supabase/indexes.sql` (safe, recommended).
5. Edit [config/brand.ts](../config/brand.ts) to re-skin.
6. `npm install && npm run build && npm start` (or deploy to Vercel + set env vars
   + the weekly cron is already declared in `vercel.json`).

## Roadmap to a clean template

- [ ] Seed phase/lesson/task/SOP content per company (out of source).
- [ ] Remove the `funnel-futurist` slug special-case; make the chat prompt DB-driven for all.
- [ ] One-command setup (env validation + migration runner + first-admin bootstrap).
- [ ] Per-tenant timezone (not just a global offset).
- [ ] Decide which "reimplements external tooling" features ship in the template.
