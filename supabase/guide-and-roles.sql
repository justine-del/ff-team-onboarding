-- Batch 4 schema additions. Additive and idempotent — safe to run on the live DB
-- in the Supabase SQL editor.

-- Phase 0 (Guide) completion flag, read alongside the existing profile row.
alter table public.profiles
  add column if not exists guide_completed boolean default false;

-- Roles / expectations on the task sheet. A role is a va_custom_tasks row with
-- is_role = true (time-tracked like any custom task); its sub-tasks point at it
-- via parent_id.
alter table public.va_custom_tasks
  add column if not exists is_role boolean default false;
alter table public.va_custom_tasks
  add column if not exists parent_id int references public.va_custom_tasks(id) on delete cascade;

create index if not exists idx_va_custom_tasks_parent on public.va_custom_tasks (parent_id);
