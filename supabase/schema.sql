-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  first_name text,
  last_name text,
  role text not null default 'member' check (role in ('admin', 'member')),
  job_role text,
  start_date date,
  created_at timestamptz default now()
);

-- Phase 1 tasks (reference)
create table if not exists public.phase1_tasks (
  id serial primary key,
  task_name text not null,
  description text,
  responsible text,
  login_type text,
  sort_order int,
  phase int default 1
);

-- Phase 1 completion
create table if not exists public.phase1_completion (
  id serial primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  task_id int references public.phase1_tasks(id),
  status text default 'pending' check (status in ('done', 'not_needed', 'pending')),
  completed_at timestamptz,
  completed_by uuid,
  unique(user_id, task_id)
);

-- Incubator lessons (reference)
create table if not exists public.incubator_lessons (
  id serial primary key,
  category text,
  lesson_name text not null,
  description text,
  loom_link text,
  benchmark_mins int,
  sort_order int
);

-- Lesson completion
create table if not exists public.lesson_completion (
  id serial primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  lesson_id int references public.incubator_lessons(id),
  completed boolean default false,
  time_spent int,
  completed_at timestamptz,
  unique(user_id, lesson_id)
);

-- SOP documents (reference)
create table if not exists public.sop_documents (
  id serial primary key,
  priority text check (priority in ('CRITICAL', 'HIGH')),
  document_name text not null,
  link text,
  est_minutes int,
  sort_order int
);

-- SOP completion
create table if not exists public.sop_completion (
  id serial primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  sop_id int references public.sop_documents(id),
  completed boolean default false,
  completed_at timestamptz,
  unique(user_id, sop_id)
);

-- Task definitions (reference)
create table if not exists public.task_definitions (
  id serial primary key,
  sop_number text,
  task_name text not null,
  description text,
  days text[],
  time_window text,
  est_time text,
  loom_link text,
  sop_doc_link text,
  is_eow boolean default false,
  active boolean default true
);

-- Task completions
create table if not exists public.task_completions (
  id serial primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  task_id int references public.task_definitions(id),
  week_start date,
  day text,
  completed boolean default false,
  completed_at timestamptz,
  unique(user_id, task_id, week_start, day)
);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.phase1_completion enable row level security;
alter table public.lesson_completion enable row level security;
alter table public.sop_completion enable row level security;
alter table public.task_completions enable row level security;

-- Profiles: users can read their own, admins can read all
create policy "Users can read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Admins can read all profiles" on public.profiles for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Admins can insert profiles" on public.profiles for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Completion tables: users manage their own rows, admins can do anything
create policy "Users manage own phase1 completion" on public.phase1_completion
  for all using (auth.uid() = user_id);
create policy "Admins manage all phase1 completion" on public.phase1_completion
  for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Users manage own lesson completion" on public.lesson_completion
  for all using (auth.uid() = user_id);
create policy "Admins manage all lesson completion" on public.lesson_completion
  for all using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Users manage own sop completion" on public.sop_completion
  for all using (auth.uid() = user_id);

create policy "Users manage own task completions" on public.task_completions
  for all using (auth.uid() = user_id);

-- Reference tables: everyone can read
create policy "Anyone can read phase1 tasks" on public.phase1_tasks for select using (true);
create policy "Anyone can read lessons" on public.incubator_lessons for select using (true);
create policy "Anyone can read sop docs" on public.sop_documents for select using (true);
create policy "Anyone can read task defs" on public.task_definitions for select using (true);

alter table public.phase1_tasks enable row level security;
alter table public.incubator_lessons enable row level security;
alter table public.sop_documents enable row level security;
alter table public.task_definitions enable row level security;

-- Trigger: auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, first_name, last_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    'member'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
