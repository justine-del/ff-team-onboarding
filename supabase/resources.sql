-- Resources library (FF-internal, not company-scoped)
create table if not exists public.resources (
  id serial primary key,
  title text not null,
  description text,
  loom_url text,
  category text not null default 'General',
  sort_order int not null default 0,
  created_at timestamptz default now()
);

alter table public.resources enable row level security;

-- All authenticated users can read
create policy "Authenticated users can read resources" on public.resources
  for select using (auth.uid() is not null);

-- Only admins can write
create policy "Admins can manage resources" on public.resources
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'super_admin')
    )
  );
