-- VA Offboarding table
-- Stores all offboarding form data for both admin and VA sections
-- Run this in the Supabase SQL editor

create table if not exists public.va_offboarding (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  -- Admin fills
  last_day text default '',
  reason text default 'contract_end',
  offboard_notes text default '',
  kpi_summary text default '',
  kpi_phase1 text default '',
  kpi_hours text default '',
  kpi_weeks text default '',
  invoice_period text default '',
  invoice_amount text default '',
  invoice_status text default 'pending',
  invoice_notes text default '',
  slack_removed boolean default false,
  drive_removed boolean default false,
  email_deactivated boolean default false,
  ghl_removed boolean default false,
  notion_removed boolean default false,
  geekbot_removed boolean default false,
  onepw_removed boolean default false,
  other_tools text default '',
  handoff_tasks text default '',
  handoff_docs text default '',
  replacement_needed boolean default false,
  notify_stakeholders boolean default false,
  final_notes text default '',
  -- VA fills
  last_project text default '',
  sops_used text default '',
  -- Status
  va_submitted boolean default false,
  va_submitted_at timestamptz,
  updated_at timestamptz default now()
);

alter table public.va_offboarding enable row level security;

-- VA can manage their own record
create policy "Users manage own offboarding record" on public.va_offboarding
  for all using (auth.uid() = user_id);

-- Admins can read and update all records
create policy "Admins manage all offboarding records" on public.va_offboarding
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role in ('admin', 'super_admin')
    )
  );
