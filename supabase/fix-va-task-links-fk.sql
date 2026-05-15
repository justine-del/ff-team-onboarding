-- Fix: remove FK constraint on va_task_links.task_id so custom tasks
-- (stored as va_custom_tasks.id + 10000) can save loom_link / sop_doc_link
-- without FK violation against task_definitions(id).
-- Mirrors fix-custom-task-completions.sql.

ALTER TABLE public.va_task_links
  DROP CONSTRAINT IF EXISTS va_task_links_task_id_fkey;
