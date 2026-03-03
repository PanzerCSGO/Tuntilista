-- ============================================================
-- Tuntilista V3 migraatio
-- Aja Supabase SQL Editorissa
-- ============================================================

-- 1) Luo timesheet_days taulu (päiväkohtaiset tiedot)
create table if not exists public.timesheet_days (
  id uuid primary key default gen_random_uuid(),
  timesheet_id uuid not null references public.timesheets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  project_no text not null default '',
  meters numeric(10, 2),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(timesheet_id, date)
);

-- 2) Indeksit
create index if not exists timesheet_days_timesheet_id_idx on public.timesheet_days(timesheet_id);
create index if not exists timesheet_days_date_idx on public.timesheet_days(date);

-- 3) RLS
alter table public.timesheet_days enable row level security;

create policy "days_select_own" on public.timesheet_days
  for select using (auth.uid() = user_id);
create policy "days_insert_own" on public.timesheet_days
  for insert with check (auth.uid() = user_id);
create policy "days_update_own" on public.timesheet_days
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "days_delete_own" on public.timesheet_days
  for delete using (auth.uid() = user_id);

-- 4) updated_at trigger
drop trigger if exists timesheet_days_updated_at on public.timesheet_days;
create trigger timesheet_days_updated_at
  before update on public.timesheet_days
  for each row execute function public.set_updated_at();

-- 5) Muuttaa timesheets-taulusta project_number -> ei poisteta,
--    mutta uudet insertit ei enää sitä käytä. Taaksepäin yhteensopiva.
