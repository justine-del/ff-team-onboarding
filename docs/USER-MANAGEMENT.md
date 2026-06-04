# User Management & Roles

## Roles (`profiles.role`)

| Role | Who | Sees |
| --- | --- | --- |
| `super_admin` | Platform owners (Phoenix, Justine) | Everything, all companies (`/admin/companies`) |
| `admin` | A company's admin | Their company's members, content, performance, offboarding |
| `member` | A VA / contractor | Their own onboarding (Phase 0→2.1), task sheet, dashboard |
| `offboarding` | A member being exited | Their VA offboarding form (dashboard branches to it) |
| `offboarded` | A former member | Record-keeping only; login disabled |

`admin`/`super_admin` **bypass phase gating** (see `lib/onboarding/gating.ts`).

> The `offboarding` value was missing from the DB role CHECK constraint (only `offboarded` was allowed), which would break the offboard-initiate flow. Fixed by `supabase/fix-offboarding-role.sql` — run it once in the SQL editor.

## Multi-tenant model

- `companies` table; each `profiles.company_id` ties a user to one company.
- Row-Level Security scopes `admin` to their own company; `super_admin` sees all. Helper funcs `get_my_company_id()` / `get_my_role()`.
- New companies are created either by a `super_admin` (`/admin/companies`) or programmatically via `POST /api/external/provision-company` (called by the separate **ff-client-portal**).

## Inviting / creating users

`/admin/users` → "Invite New Member" → `POST /api/invite`:
1. Creates the Supabase auth user + a `profiles` row (scoped to the inviter's company).
2. Returns a **one-time magic link** to set a password (`/update-password`).

The invite form now has an **Account Type** selector (Member / Admin).

## Previewing a role (test accounts)

There's no "impersonate" feature, but you can **preview any role** in ~30s:
1. `/admin/users` → Invite New Member.
2. Set **Account Type** = Member or Admin, use an email you control (e.g. `you+testmember@…`).
3. Copy the returned magic link, open it in an **incognito window**, set a password → you're now signed in as that role and see exactly what they see.

## Is there a "client" view?

**No.** Today the app serves the *company* (FF) onboarding its VAs. Clients live in the **separate** `ff-client-portal` app and have **no login or view inside this portal**. So "sign in as a client" isn't possible yet — there's nothing client-specific to show.

Adding a real client role + a client dashboard (their VA team's progress/hours, RLS-scoped) is a scoped future build — see [BOTTLENECKS-AND-LEVERAGE.md](./BOTTLENECKS-AND-LEVERAGE.md).
