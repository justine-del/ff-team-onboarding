-- VA custom tasks (tasks VAs add themselves)
create table if not exists public.va_custom_tasks (
  id serial primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  task_name text not null,
  description text,
  days text[] default ARRAY['Mon','Tue','Wed','Thu','Fri'],
  time_window text,
  est_time text,
  loom_link text default '',
  sop_doc_link text default '',
  active boolean default true,
  created_at timestamptz default now()
);

alter table public.va_custom_tasks enable row level security;

create policy "Users manage own custom tasks" on public.va_custom_tasks
  for all using (auth.uid() = user_id);

-- VA personal links per task (personal loom/sop they attach to default tasks)
create table if not exists public.va_task_links (
  id serial primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  task_id int references public.task_definitions(id) on delete cascade,
  loom_link text default '',
  sop_doc_link text default '',
  updated_at timestamptz default now(),
  unique(user_id, task_id)
);

alter table public.va_task_links enable row level security;

create policy "Users manage own task links" on public.va_task_links
  for all using (auth.uid() = user_id);
