-- Fix: the profiles.role CHECK omitted 'offboarding', but the offboard-initiate
-- flow sets role='offboarding' (dashboard shows the VA offboarding form for it).
-- Without this, initiating offboarding fails the constraint. Additive/idempotent.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('admin', 'member', 'super_admin', 'offboarding', 'offboarded'));
