-- Add the 6 VA "Your Checklist" tasks to phase1_tasks so they can be persisted
-- in phase1_completion (which has an FK to phase1_tasks.id).
-- IDs 19-24 are reserved for these member-side tasks.

insert into public.phase1_tasks (id, task_name, description, responsible, login_type, sort_order, phase) values
  (19, 'Intro Video / Expectations',            'Watch the welcome video to understand your next steps',               'Member', 'Member task', 19, 1),
  (20, 'System Access — Category A & B',        'Review tool categories, confirm access, and bookmark login pages',    'Member', 'Member task', 20, 1),
  (21, 'Slack Workspace',                       'Accept Slack invite and set up your profile',                          'Member', 'Member task', 21, 1),
  (22, 'SuperWhisper',                          'Sign up, download the app, and configure your hotkey',                 'Member', 'Member task', 22, 1),
  (23, 'Google Drive',                          'Accept the Google Drive invite and confirm folder access',             'Member', 'Member task', 23, 1),
  (24, 'Send Final Phase 2 Completion Message', 'Post your completion message in the ramp-up thread with time taken',  'Member', 'Member task', 24, 1)
on conflict (id) do nothing;

-- Bump the serial sequence past our manually-inserted IDs so future inserts don't collide.
select setval(
  pg_get_serial_sequence('public.phase1_tasks', 'id'),
  greatest((select max(id) from public.phase1_tasks), 24)
);
