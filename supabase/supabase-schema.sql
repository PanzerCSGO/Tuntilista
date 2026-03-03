-- Tuntilista V1 – Supabase Schema
-- Aja tämä Supabase SQL Editorissa

create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  project_number text not null,
  address text not null,
  meters_dug numeric(10, 2) not null,
  machine text not null,
  hours numeric(10, 2) not null,
  created_at timestamptz not null default now()
);

-- Row Level Security
alter table public.time_entries enable row level security;

-- Policies
create policy "Users can view own entries"
  on public.time_entries for select
  using (auth.uid() = user_id);

create policy "Users can insert own entries"
  on public.time_entries for insert
  with check (auth.uid() = user_id);

create policy "Users can update own entries"
  on public.time_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own entries"
  on public.time_entries for delete
  using (auth.uid() = user_id);

-- Index for performance
create index if not exists time_entries_user_id_idx on public.time_entries(user_id);
create index if not exists time_entries_date_idx on public.time_entries(date desc);
