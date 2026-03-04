-- ============================================================
-- Migration 005: profiles table for username-based login
-- ============================================================

-- 1. Create profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  email text not null,
  created_at timestamptz not null default now()
);

-- 2. Unique index on lowercase username
create unique index if not exists profiles_username_unique
  on public.profiles (lower(username));

-- 3. Enable RLS
alter table public.profiles enable row level security;

-- 4. Users can read their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- 5. Users can update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 6. Auto-create profile on new user signup (trigger)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, username, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

-- Drop trigger if exists, then create
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- MANUAL MIGRATION FOR EXISTING USERS:
-- Run this after creating the table to backfill profiles
-- for any users that already exist:
--
--   INSERT INTO public.profiles (id, username, email)
--   SELECT id, split_part(email, '@', 1), email
--   FROM auth.users
--   WHERE id NOT IN (SELECT id FROM public.profiles)
--   ON CONFLICT DO NOTHING;
--
-- Then update usernames manually if needed:
--   UPDATE public.profiles SET username = 'kmr-matti' WHERE email = 'matti@example.com';
-- ============================================================
