-- ============================================================
-- Fix recursive RLS policies on profiles table
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Helper functions that bypass RLS (security definer)
--    These read the current user's own row safely without recursion.

create or replace function public.get_my_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.get_my_company_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select company_id from public.profiles where id = auth.uid()
$$;

-- 2. Drop the recursive policies

drop policy if exists "Super admins can read all profiles" on public.profiles;
drop policy if exists "Admins can read company profiles" on public.profiles;
drop policy if exists "Super admins can insert profiles" on public.profiles;
drop policy if exists "Admins can insert company profiles" on public.profiles;
drop policy if exists "Admins can update company profiles" on public.profiles;

-- 3. Recreate using the helper functions (no recursion)

-- Super admins see all profiles
create policy "Super admins can read all profiles" on public.profiles
  for select using (public.get_my_role() = 'super_admin');

-- Company admins see only their company's profiles
create policy "Admins can read company profiles" on public.profiles
  for select using (
    public.get_my_role() = 'admin'
    and company_id = public.get_my_company_id()
  );

-- Super admins can insert any profile
create policy "Super admins can insert profiles" on public.profiles
  for insert with check (public.get_my_role() = 'super_admin');

-- Company admins can insert profiles scoped to their company
create policy "Admins can insert company profiles" on public.profiles
  for insert with check (
    public.get_my_role() = 'admin'
    and company_id = public.get_my_company_id()
  );

-- Admins can update profiles within their scope
create policy "Admins can update company profiles" on public.profiles
  for update using (
    public.get_my_role() = 'super_admin'
    or (public.get_my_role() = 'admin' and company_id = public.get_my_company_id())
  );
