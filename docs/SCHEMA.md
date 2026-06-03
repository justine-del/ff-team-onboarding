# Database Schema & Performance

> **Living document.** Update when you add/alter a table, index, or RLS policy.

Supabase Postgres. Migrations are **raw SQL files in `supabase/`** with no
versioning tool — run them in order in the Supabase SQL editor.

## Migration order

```
schema.sql                      # core tables + RLS + profile trigger
multi-tenant.sql                # companies, company_id, role expansion, seeds "Funnel Futurist"
company-sops.sql                # company-scoped SOPs + RLS
phase1-member-tasks.sql         # member-side Phase 1 tasks
eow-tables.sql                  # eow_reports, day_off
va-offboarding.sql              # va_offboarding form table
va-custom-tasks.sql             # va_custom_tasks, va_task_links
va-custom-tasks-week-scope.sql  # week-scoped custom task completion
va-task-notes.sql               # task notes
resources.sql                   # resources library
admin-update-policies.sql       # RLS policy fixes
fix-rls-recursion.sql           # RLS recursion fix (see note below)
fix-custom-task-completions.sql
fix-va-task-links-fk.sql
seed.sql                        # reference content (FF-specific)
indexes.sql                     # ← NEW: performance indexes (safe, idempotent)
drop-wellness.sql               # ← NEW: optional, removes the retired wellness table
```

## Tables

**Identity / tenancy**
- `profiles` — one per auth user; `role`, `job_role`, `start_date`, `company_id`.
  Auto-created by a trigger on `auth.users` insert.
- `companies` — tenants; `slug` is unique and drives tenant-specific behavior
  (e.g. the `funnel-futurist` slug loads the FF chat prompt).

**Reference / lookup** (read-mostly): `phase1_tasks`, `incubator_lessons`,
`sop_documents` (company-scoped), `task_definitions`, `resources`.

**Per-user progress** (write-heavy): `phase1_completion`, `lesson_completion`,
`sop_completion`, `task_completions` (per day/week/task), `day_off`, `eow_reports`,
`va_offboarding`, `va_custom_tasks`, `va_task_links`.

All relate back to `profiles.id` (→ `auth.users`, on delete cascade). Per-user
tables enforce unique keys (e.g. `task_completions` is unique on
`(user_id, task_id, week_start, day)`).

## RLS

Every user-writable table has Row-Level Security. Policies are role-based
(`member` reads/writes own rows; `admin` is company-scoped; `super_admin` is
global) and lean on helper functions `get_my_company_id()` / `get_my_role()`.

> **Recursion caveat:** policies that read `profiles` from within a `profiles`
> policy previously caused infinite recursion (`fix-rls-recursion.sql`). This is
> why server components that need a user's `role` use the **service-role client**
> for the profile read rather than the RLS-scoped client. Keep that pattern.

## Performance

### Indexes — apply `supabase/indexes.sql`

Additive, idempotent (`CREATE INDEX IF NOT EXISTS`), no table/RLS changes — safe
to run on the live DB. It indexes the hot read paths:

| Index | Serves |
| --- | --- |
| `task_completions (user_id, week_start)` | dashboard 8-week pull, member-tasks |
| `task_completions (user_id, completed)` | "tasks checked off" counts |
| `phase1_completion (user_id, status)` | Phase 1 progress |
| `lesson_completion (user_id, completed)` | Phase 2 progress |
| `sop_completion (user_id, completed)` | SOP progress |
| `eow_reports (user_id, created_at)` | weekly-check + admin lookups |
| `va_custom_tasks (user_id, active)` | task sheet custom-task list |
| `profiles (company_id)`, `profiles (role)` | member/company filters |

### Known hotspots (for future work)

1. **Dashboard fan-out** — `app/dashboard/page.tsx` issues ~6 queries via
   `Promise.all`, then 2 more for admins. The indexes above cover them; consider a
   single RPC if member counts grow large.
2. **Admin performance N+1** — `app/admin/performance/page.tsx` loops members and
   queries `task_completions` per member. Fine for small teams; batch with a single
   `in('user_id', ids)` query + in-memory grouping when it gets slow.
3. **`va_task_links.task_id` offset hack** — custom-task IDs are stored as
   `va_custom_tasks.id + CUSTOM_TASK_ID_OFFSET` (10000) to avoid colliding with
   `task_definitions` IDs, and there's **no FK**, so orphans are possible. A cleaner
   model is a nullable polymorphic reference or a discriminator column.
4. **Drive context cache** — chat SOP context is cached 30 min in
   `lib/google-drive.ts`; updates to Drive SOPs lag by up to that window.

## Retired: `wellness_checkins`

The wellness feature was removed. The table had no migration file and the app no
longer reads/writes it. `supabase/drop-wellness.sql` will drop it (optional; run
only after archiving any data you want).
