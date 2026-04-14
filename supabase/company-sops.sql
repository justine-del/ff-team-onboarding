-- ============================================================
-- Company-scoped SOPs + EOW policy fix
-- Run this in Supabase SQL Editor
-- Requires: multi-tenant.sql and fix-rls-recursion.sql already run
-- ============================================================

-- 1. Add company_id to sop_documents
alter table public.sop_documents add column if not exists company_id uuid references public.companies(id);

-- 2. Assign FF's existing 10 SOPs to Funnel Futurist
update public.sop_documents
set company_id = (select id from public.companies where slug = 'funnel-futurist')
where company_id is null;

-- 3. Update the actual Google Doc links (the seed had placeholder text)
update public.sop_documents set link = 'https://docs.google.com/document/d/1-w9XLBzLirHQuicHnScLaAhVEHhV21PyRRVR8mLy0zo/edit?pli=1&tab=t.gtqrj7ku20p4'
  where document_name = 'Funnel Futurist Overview';
update public.sop_documents set link = 'https://docs.google.com/document/d/14mB6RywUjrdX0ZsNSLMIKD16eDFv6i_nLlhrZ-138z0/edit?tab=t.ncr9g63k9qqu#heading=h.yisnceh2al87'
  where document_name = 'Daily Sheet Tracking Update';
update public.sop_documents set link = 'https://docs.google.com/document/d/14mB6RywUjrdX0ZsNSLMIKD16eDFv6i_nLlhrZ-138z0/edit?tab=t.gwffa3gfippg'
  where document_name = 'Weekly Reporting';
update public.sop_documents set link = 'https://docs.google.com/document/d/14mB6RywUjrdX0ZsNSLMIKD16eDFv6i_nLlhrZ-138z0/edit?tab=t.vf3ywukchg7k#heading=h.oj7uvula8pw9'
  where document_name = 'Accountability';
update public.sop_documents set link = 'https://docs.google.com/document/d/14mB6RywUjrdX0ZsNSLMIKD16eDFv6i_nLlhrZ-138z0/edit?tab=t.l48nut1f9s1v#heading=h.1839bfphqn1f'
  where document_name = 'Data Privacy & Security';
update public.sop_documents set link = 'https://docs.google.com/document/d/14mB6RywUjrdX0ZsNSLMIKD16eDFv6i_nLlhrZ-138z0/edit?tab=t.l48nut1f9s1v#heading=h.cq5dxg6tgbo9'
  where document_name = 'LastPass Complete Guide';
update public.sop_documents set link = 'https://docs.google.com/document/d/14mB6RywUjrdX0ZsNSLMIKD16eDFv6i_nLlhrZ-138z0/edit?tab=t.vo7m77jnvd96'
  where document_name = 'Communication Policy - Slack';
update public.sop_documents set link = 'https://docs.google.com/document/d/14mB6RywUjrdX0ZsNSLMIKD16eDFv6i_nLlhrZ-138z0/edit?tab=t.vo7m77jnvd96#heading=h.1aab3yccu4dr'
  where document_name = 'Time Off Policy';
update public.sop_documents set link = 'https://docs.google.com/document/d/14mB6RywUjrdX0ZsNSLMIKD16eDFv6i_nLlhrZ-138z0/edit?tab=t.deqnt61hseb7#heading=h.91k1s8vt8v7h'
  where document_name = 'Invoice Policy';
update public.sop_documents set link = 'https://docs.google.com/document/d/14mB6RywUjrdX0ZsNSLMIKD16eDFv6i_nLlhrZ-138z0/edit?tab=t.8yg4y9ikur76#heading=h.r006pmpy0wwk'
  where document_name = 'ClickUp Training';

-- 4. Update RLS on sop_documents — replace shared "anyone" policy with company-scoped ones
drop policy if exists "Anyone can read sop docs" on public.sop_documents;
drop policy if exists "Admins can update sop documents" on public.sop_documents;

-- Members and admins read only their company's SOPs
create policy "Users read company sops" on public.sop_documents
  for select using (company_id = public.get_my_company_id());

-- Admins can insert SOPs for their company
create policy "Admins insert company sops" on public.sop_documents
  for insert with check (
    public.get_my_role() in ('admin', 'super_admin')
    and company_id = public.get_my_company_id()
  );

-- Admins can update their company's SOPs
create policy "Admins update company sops" on public.sop_documents
  for update using (
    public.get_my_role() in ('admin', 'super_admin')
    and company_id = public.get_my_company_id()
  );

-- Admins can delete their company's SOPs
create policy "Admins delete company sops" on public.sop_documents
  for delete using (
    public.get_my_role() in ('admin', 'super_admin')
    and company_id = public.get_my_company_id()
  );

-- 5. Fix EOW reports admin policy (had same recursion bug)
drop policy if exists "Admins can read all EOW reports" on public.eow_reports;
create policy "Admins can read all EOW reports" on public.eow_reports
  for select using (public.get_my_role() in ('admin', 'super_admin'));
