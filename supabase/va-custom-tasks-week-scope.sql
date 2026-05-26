-- Scope custom-task visibility per week so adding/deleting in the current
-- week never rewrites history for previous weeks.
--
-- A task is visible for a viewed week W iff:
--   created_week_start <= W AND (deactivated_week_start IS NULL OR deactivated_week_start > W)

ALTER TABLE public.va_custom_tasks
  ADD COLUMN IF NOT EXISTS created_week_start date NOT NULL DEFAULT '1970-01-01'::date,
  ADD COLUMN IF NOT EXISTS deactivated_week_start date;

-- Backfill created_week_start from created_at (anchor to PHT Monday).
-- Without this, a task added today would visually appear as an empty row in
-- every past week. We only set rows still on the 1970 sentinel.
UPDATE public.va_custom_tasks
SET created_week_start = (
  date_trunc('week', (created_at AT TIME ZONE 'Asia/Manila'))::date
)
WHERE created_week_start = '1970-01-01'::date AND created_at IS NOT NULL;

-- For tasks that have completions BEFORE their created_at week (older data
-- migrated in), pull created_week_start back to the earliest completion week
-- so prior worked weeks still show the task.
WITH first_week AS (
  SELECT user_id, (task_id - 10000) AS custom_id, MIN(week_start) AS min_ws
  FROM public.task_completions
  WHERE task_id > 10000 AND time_spent > 0
  GROUP BY user_id, task_id
)
UPDATE public.va_custom_tasks t
SET created_week_start = LEAST(t.created_week_start, fw.min_ws)
FROM first_week fw
WHERE t.user_id = fw.user_id AND t.id = fw.custom_id;

-- Backfill: for tasks already flagged inactive that DID have logged time in
-- past weeks, set deactivated_week_start to the Monday AFTER their last
-- completion. This brings them back into the past-week views where they were
-- worked on, but keeps them out of the current view.
WITH last_week AS (
  SELECT user_id, (task_id - 10000) AS custom_id, MAX(week_start) AS max_ws
  FROM public.task_completions
  WHERE task_id > 10000 AND time_spent > 0
  GROUP BY user_id, task_id
)
UPDATE public.va_custom_tasks t
SET deactivated_week_start = (lw.max_ws + INTERVAL '7 days')::date
FROM last_week lw
WHERE t.active = false
  AND t.user_id = lw.user_id
  AND t.id = lw.custom_id
  AND t.deactivated_week_start IS NULL;

-- Inactive rows with no completions: leave deactivated_week_start = created_week_start
-- so they don't show anywhere (they were created and deleted without ever logging time).
UPDATE public.va_custom_tasks
SET deactivated_week_start = created_week_start
WHERE active = false AND deactivated_week_start IS NULL;
