-- ============================================================
-- Multi-tenant migration: companies table + super_admin role
-- Run this once in the Supabase SQL Editor
-- ============================================================

-- 1. Create companies table
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_at timestamptz default now(),
  is_active boolean default true
);

alter table public.companies enable row level security;

-- Anyone authenticated can read companies
create policy "Authenticated users can read companies" on public.companies
  for select using (auth.uid() is not null);

-- Only super_admins can insert/update/delete companies
-- (API routes use service role key which bypasses RLS anyway)
create policy "Super admins can manage companies" on public.companies
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin')
  );

-- 2. Expand profiles role check to include super_admin and offboarded
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('admin', 'member', 'super_admin', 'offboarded'));

-- 3. Add company_id column to profiles (nullable so migration is safe)
alter table public.profiles add column if not exists company_id uuid references public.companies(id);

-- 4. Seed Funnel Futurist as the first company
insert into public.companies (name, slug)
values ('Funnel Futurist', 'funnel-futurist')
on conflict (slug) do nothing;

-- 5. Assign ALL existing profiles (without a company) to Funnel Futurist
update public.profiles
set company_id = (select id from public.companies where slug = 'funnel-futurist')
where company_id is null;

-- 6. Promote Justine and Phoenix to super_admin
--    Replace these emails with the actual ones if different.
--    You can also do this manually in Supabase Table Editor.
-- update public.profiles set role = 'super_admin'
-- where email in ('justine@joburn.com', 'phoenix@joburn.com');

-- 7. Update profiles RLS policies

-- Drop old generic admin policies
drop policy if exists "Admins can read all profiles" on public.profiles;
drop policy if exists "Admins can insert profiles" on public.profiles;

-- Super admins can read every profile across all companies
create policy "Super admins can read all profiles" on public.profiles
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin')
  );

-- Company admins can read profiles belonging to their own company
create policy "Admins can read company profiles" on public.profiles
  for select using (
    company_id = (
      select company_id from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Super admins can insert profiles for any company
create policy "Super admins can insert profiles" on public.profiles
  for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'super_admin')
  );

-- Company admins can insert profiles scoped to their own company
create policy "Admins can insert company profiles" on public.profiles
  for insert with check (
    company_id = (
      select company_id from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Admins (company or super) can update profiles within their scope
create policy "Admins can update company profiles" on public.profiles
  for update using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and (
          p.role = 'super_admin'
          or (p.role = 'admin' and p.company_id = profiles.company_id)
        )
    )
  );

-- 8. Update completion table policies to cover super_admin

drop policy if exists "Admins manage all phase1 completion" on public.phase1_completion;
create policy "Admins manage all phase1 completion" on public.phase1_completion
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin'))
  );

drop policy if exists "Admins manage all lesson completion" on public.lesson_completion;
create policy "Admins manage all lesson completion" on public.lesson_completion
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin'))
  );

-- sop_completion and task_completions had no explicit admin policy — add them now
create policy "Admins manage all sop completion" on public.sop_completion
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin'))
  );

create policy "Admins manage all task completions" on public.task_completions
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin'))
  );

-- 9. Update reference table update policies to cover super_admin

drop policy if exists "Admins can update lessons" on public.incubator_lessons;
create policy "Admins can update lessons" on public.incubator_lessons
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin'))
  );

drop policy if exists "Admins can update sop documents" on public.sop_documents;
create policy "Admins can update sop documents" on public.sop_documents
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin'))
  );

drop policy if exists "Admins can update task definitions" on public.task_definitions;
create policy "Admins can update task definitions" on public.task_definitions
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin'))
  );

-- ============================================================
-- After running this migration, manually run in SQL Editor:
--
--   update public.profiles set role = 'super_admin'
--   where email in ('your_email@domain.com', 'phoenix_email@domain.com');
--
-- ============================================================
