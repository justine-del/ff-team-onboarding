# Bottlenecks & Admin-Leverage — suggestions

Findings from a full read-only codebase pass. Nothing here is built yet (except where noted); it's a prioritized menu.

## Technical bottlenecks / risks

| Item | Where | Fix | Priority |
| --- | --- | --- | --- |
| **`task_id + 10000` offset hack** for custom tasks in `task_completions`/`va_task_notes` | `app/tasks/page.tsx` (e.g. `${task.id + 10000}`), `va_task_links` | Replace with an explicit `task_type` ('builtin'\|'custom') column; fragile if IDs ever exceed 10000 | Medium |
| **No pagination** on admin lists | `app/admin/users/page.tsx`, `app/admin/companies/*` | Add `.range()`/`.limit()` + virtualized list; matters at 50–100+ members | Medium (scale) |
| **Wide `va_offboarding` table** (~30 cols) | `supabase/va-offboarding.sql` | Normalize into core + invoice + tools when it next changes | Low |
| **No error boundaries / failure UI** | most client pages | Add error states + toasts so a failed query isn't an infinite spinner | Medium |
| **No tests** | whole repo | Vitest for phase gating, task-time entry, offboarding state | Medium |
| **Task sheet is one ~1,800-line client file** | `app/tasks/page.tsx` | Split into data / table / EOW / export pieces; also lets us server-render parts | Medium |
| **Loading** | see [PERFORMANCE.md](./PERFORMANCE.md) | Round-trip reduction done; DB co-location is the remaining lever | — |

## Admin-leverage features (add)

Ranked by leverage for an admin managing a team:

1. **⭐ Per-member drill-down** — `/admin/member/[id]`: one page with their phase progress, 8-week task heatmap, hours, notes, recent EOW reports. Today an admin jumps between `/admin`, `/admin/performance`, `/admin/users`, `/admin/offboarding` to assemble this. Reuse the offboarding KPI fetch + `/api/admin/member-tasks`. (~2–3h)
2. **⭐ Nudges / reminders** — from `/admin/performance`, a "needs attention" member gets a button to send a Slack/email reminder (Resend already used for invites). Closes the follow-up loop. (~2h)
3. **Bulk invite** — paste CSV → batch-create + links, instead of one form at a time. (~1.5h)
4. **Assign tasks/roles to a member** — today `/api/admin/member-custom-tasks` is read-only (admins can *view* but not *create* a member's custom tasks/roles). Let admins push a Role or task to a member. (~2h)
5. **Member tags** — "blocked on lesson 5", "on leave" — persist context across manager handoffs. (~1.5h)
6. **Task templates** — admin defines standard task/role sets; applied on invite so similar VAs don't each rebuild them. (~2h)

## Subtract / simplify

- **Claude-generated EOW report** (`/api/eow-report`): low ROI, adds an LLM dependency for a "nice-to-have." Consider a plain auto-summary from the logged data with copy-to-clipboard.
- **`/api/weekly-check`**: route exists but isn't triggered from any UI; fold into the nudges feature or remove.

## Client view (future, scoped)

There's no `client` role/view today (clients use the separate ff-client-portal). To add one inside this app (~8–10h, reuses the existing multi-tenant + RLS patterns):
1. Add `client` to the role CHECK + RLS policies scoping a client to their company's members (read-only).
2. `client` doesn't bypass phase gating; gets its own dashboard.
3. `/dashboard` (or a `/client` route) showing their VA team's progress + hours; block `/onboarding/*` and `/tasks`.
4. Invite path: account-type selector already supports adding roles; extend to `client`.
