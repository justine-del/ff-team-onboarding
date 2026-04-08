-- Fix: remove FK constraint on task_completions.task_id so custom tasks
-- (stored as va_custom_tasks.id + 10000) can be saved without FK violation.
-- Also ensure time_spent column exists.

ALTER TABLE public.task_completions
  DROP CONSTRAINT IF EXISTS task_completions_task_id_fkey;

ALTER TABLE public.task_completions
  ADD COLUMN IF NOT EXISTS time_spent int default 0;
