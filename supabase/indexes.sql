-- Performance indexes — additive and idempotent.
--
-- Safe to run against a live database: every statement uses IF NOT EXISTS and
-- creates an index only (no table/RLS changes, no data migration). Re-running
-- is a no-op. These target the hottest read paths identified in docs/SCHEMA.md:
-- the dashboard's per-user completion lookups, the 8-week task-history pull, and
-- the admin performance/EOW queries.
--
-- For zero-downtime on a busy table, run the individual statements with
-- CREATE INDEX CONCURRENTLY from a non-transactional session instead.

-- task_completions: dashboard 8-week history, member-tasks, performance page.
create index if not exists idx_task_completions_user_week
  on public.task_completions (user_id, week_start);
create index if not exists idx_task_completions_user_completed
  on public.task_completions (user_id, completed);

-- Phase / lesson / SOP completion: per-user progress counts on the dashboard.
create index if not exists idx_phase1_completion_user_status
  on public.phase1_completion (user_id, status);
create index if not exists idx_lesson_completion_user_completed
  on public.lesson_completion (user_id, completed);
create index if not exists idx_sop_completion_user_completed
  on public.sop_completion (user_id, completed);

-- EOW reports: weekly-check window and admin "who submitted" lookups.
create index if not exists idx_eow_reports_user_created
  on public.eow_reports (user_id, created_at);

-- VA custom tasks: task sheet lists a member's active custom tasks.
create index if not exists idx_va_custom_tasks_user_active
  on public.va_custom_tasks (user_id, active);

-- Profiles: company-scoped member lookups and role filters.
create index if not exists idx_profiles_company on public.profiles (company_id);
create index if not exists idx_profiles_role on public.profiles (role);
