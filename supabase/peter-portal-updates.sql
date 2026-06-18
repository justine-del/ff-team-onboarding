-- Peter's VA Portal updates (Section XI of the master task doc).
-- Additive + idempotent. Safe to run on live DB.
--
-- 1) Benchmarkable estimated time on tasks (numeric, alongside existing text est_time).
-- 2) Task audit log for HR-style anomaly detection on time entries and admin edits.

-- 1. est_minutes on both task surfaces. Existing est_time text column stays.
alter table public.va_custom_tasks
  add column if not exists est_minutes int;

alter table public.task_definitions
  add column if not exists est_minutes int;

-- 2. Audit log. Service-role writes only; members read their own target rows;
--    admins read everything.
create table if not exists public.task_audit_log (
  id bigserial primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_role text,
  target_user_id uuid references public.profiles(id) on delete cascade,
  entity_type text not null,        -- 'task_completions' | 'va_custom_tasks'
  entity_id text,                   -- text so we can store composite keys ('taskId:day:weekStart') for completions
  action text not null,             -- 'create' | 'update' | 'delete'
  before_json jsonb,
  after_json jsonb,
  context jsonb,                    -- free-form: { week_start, day, task_id, source: 'client'|'admin-api' }
  created_at timestamptz default now()
);

create index if not exists idx_task_audit_log_target on public.task_audit_log (target_user_id, created_at desc);
create index if not exists idx_task_audit_log_actor on public.task_audit_log (actor_id, created_at desc);
create index if not exists idx_task_audit_log_entity on public.task_audit_log (entity_type, entity_id);

alter table public.task_audit_log enable row level security;

-- Admins read everything.
drop policy if exists "Admins read audit log" on public.task_audit_log;
create policy "Admins read audit log" on public.task_audit_log
  for select using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'super_admin')
    )
  );

-- Members read rows that target them (so a VA can see their own activity log if we surface it).
drop policy if exists "Members read own audit rows" on public.task_audit_log;
create policy "Members read own audit rows" on public.task_audit_log
  for select using (auth.uid() = target_user_id);

-- No insert/update/delete policies — only service-role inserts via API routes.
