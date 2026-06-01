-- 1. Create Profiles table (for Staff)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  role text,
  department text,
  type text default 'Staff',
  status text default 'Active',
  email text,
  phone text,
  joined text,
  avatar_url text
);

-- 2. Create Students table
create table students (
  id bigint primary key generated always as identity,
  name text,
  role text,
  department text,
  type text default 'Student',
  status text default 'Enrolled',
  email text,
  phone text,
  joined text,
  diagnosis text
);

-- 3. Create Rooms table
create table rooms (
  id bigint primary key generated always as identity,
  name text,
  type text,
  max_capacity int default 7
);

-- 4. Create Sessions table
create table sessions (
  id bigint primary key generated always as identity,
  title text,
  therapist_id uuid references auth.users,
  student_ids bigint[], -- Array of student IDs
  room text,
  start_hour int,
  span int,
  type text -- 'sped', 'rehab', 'playschool'
);

-- Enable RLS (Optional for now, but recommended)
alter table profiles enable row level security;
alter table students enable row level security;
alter table rooms enable row level security;
alter table sessions enable row level security;

-- Create basic access policies (Allow all for development)
create policy "Allow public access" on profiles for all using (true);
create policy "Allow public access" on students for all using (true);
create policy "Allow public access" on rooms for all using (true);
create policy "Allow public access" on sessions for all using (true);