-- Create the 'requirements' storage bucket
insert into storage.buckets (id, name, public) 
values ('requirements', 'requirements', false)
on conflict (id) do nothing;

-- Create policies for storage bucket
create policy "Allow authenticated uploads" on storage.objects
  for insert with check ( bucket_id = 'requirements' and auth.role() = 'authenticated' );

create policy "Allow authenticated reads" on storage.objects
  for select using ( bucket_id = 'requirements' and auth.role() = 'authenticated' );

-- Create student_documents table
create table if not exists public.student_documents (
  id uuid default gen_random_uuid() primary key,
  student_id bigint references public.students(id) on delete cascade not null,
  uploaded_by uuid references auth.users(id) on delete set null,
  file_name text not null,
  file_url text not null,
  document_type text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for student_documents
alter table public.student_documents enable row level security;

-- Admin can see all
create policy "Admins can view all student documents" on public.student_documents
  for all
  using (
    exists (
      select 1 from public.user_roles 
      where user_id = auth.uid() 
      and role in ('admin', 'superadmin')
    )
  );

-- Parents can view and upload for their children
create policy "Parents can view their children's documents" on public.student_documents
  for select
  using (
    exists (
      select 1 from public.parent_student_relationships
      where parent_id = auth.uid() and student_id = student_documents.student_id
    )
  );

create policy "Parents can upload their children's documents" on public.student_documents
  for insert
  with check (
    exists (
      select 1 from public.parent_student_relationships
      where parent_id = auth.uid() and student_id = student_documents.student_id
    )
  );

-- Teachers and Therapists can view their students' documents
create policy "Instructors can view documents" on public.student_documents
  for select
  using (
    exists (
      select 1 from public.user_roles 
      where user_id = auth.uid() 
      and role in ('teacher', 'therapist')
    )
  );
