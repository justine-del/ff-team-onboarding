-- Allow admins to update reference tables
create policy "Admins can update lessons" on public.incubator_lessons
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update sop documents" on public.sop_documents
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update task definitions" on public.task_definitions
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
