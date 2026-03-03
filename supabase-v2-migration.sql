-- ============================================================
-- Tuntilista V2 migraatio
-- Aja Supabase SQL Editorissa
-- ============================================================

-- 1) Timesheets (yksi "lappu" per projekti/ajanjakso)
create table if not exists public.timesheets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period_start date,
  period_end date,
  project_number text not null default '',
  address text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Timesheet entries (yksi rivi = yksi päivä + kone + tunnit)
create table if not exists public.timesheet_entries (
  id uuid primary key default gen_random_uuid(),
  timesheet_id uuid not null references public.timesheets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  machine text not null,
  hours numeric(5,2) not null default 0 check (hours >= 0 and hours <= 24),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (timesheet_id, date, machine)
);

-- 3) Indeksit
create index if not exists timesheets_user_id_idx on public.timesheets(user_id);
create index if not exists timesheets_created_at_idx on public.timesheets(created_at desc);
create index if not exists timesheet_entries_timesheet_id_idx on public.timesheet_entries(timesheet_id);
create index if not exists timesheet_entries_date_idx on public.timesheet_entries(date);

-- 4) RLS timesheets
alter table public.timesheets enable row level security;

create policy "timesheets_select_own" on public.timesheets
  for select using (auth.uid() = user_id);
create policy "timesheets_insert_own" on public.timesheets
  for insert with check (auth.uid() = user_id);
create policy "timesheets_update_own" on public.timesheets
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "timesheets_delete_own" on public.timesheets
  for delete using (auth.uid() = user_id);

-- 5) RLS timesheet_entries
alter table public.timesheet_entries enable row level security;

create policy "tse_select_own" on public.timesheet_entries
  for select using (auth.uid() = user_id);
create policy "tse_insert_own" on public.timesheet_entries
  for insert with check (auth.uid() = user_id);
create policy "tse_update_own" on public.timesheet_entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "tse_delete_own" on public.timesheet_entries
  for delete using (auth.uid() = user_id);

-- 6) Migraatiosovitin: luo "draft" timesheet vanhoille time_entries-riveille
-- Aja vain jos sinulla on vanhoja merkintöjä time_entries-taulussa
-- (Turvallinen ajaa uudellaankin - ei tee mitään jos ei löydy)
do $$
declare
  v_user_id uuid;
  v_timesheet_id uuid;
begin
  for v_user_id in
    select distinct user_id from public.time_entries
  loop
    -- Tarkista onko jo draft
    select id into v_timesheet_id
    from public.timesheets
    where user_id = v_user_id
      and project_number = 'TUONTI'
    limit 1;

    if v_timesheet_id is null then
      insert into public.timesheets (user_id, project_number, address)
      values (v_user_id, 'TUONTI', 'Vanhat merkinnät')
      returning id into v_timesheet_id;
    end if;

    -- Siirrä time_entries -> timesheet_entries (upsert)
    insert into public.timesheet_entries (timesheet_id, user_id, date, machine, hours)
    select
      v_timesheet_id,
      user_id,
      date,
      machine,
      hours
    from public.time_entries
    where user_id = v_user_id
    on conflict (timesheet_id, date, machine) do update
      set hours = excluded.hours;
  end loop;
end $$;

-- 7) updated_at triggerit
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists timesheets_updated_at on public.timesheets;
create trigger timesheets_updated_at
  before update on public.timesheets
  for each row execute function public.set_updated_at();

drop trigger if exists tse_updated_at on public.timesheet_entries;
create trigger tse_updated_at
  before update on public.timesheet_entries
  for each row execute function public.set_updated_at();
