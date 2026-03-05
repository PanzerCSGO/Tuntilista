-- ============================================================
-- Migration 006: Allow multiple rows with same date per timesheet
-- This enables multiple "kohde" (site/address) entries per day
-- ============================================================

-- 1. Drop the unique constraint on (timesheet_id, date)
ALTER TABLE public.timesheet_days
  DROP CONSTRAINT IF EXISTS timesheet_days_timesheet_id_date_key;

-- 2. Also update timesheet_entries to allow same date+machine for different day rows
--    We need to link entries to a specific day row, not just by date
ALTER TABLE public.timesheet_entries
  ADD COLUMN IF NOT EXISTS day_id uuid REFERENCES public.timesheet_days(id) ON DELETE CASCADE;

-- 3. Backfill day_id for existing entries
UPDATE public.timesheet_entries e
SET day_id = d.id
FROM public.timesheet_days d
WHERE e.timesheet_id = d.timesheet_id
  AND e.date = d.date
  AND e.day_id IS NULL;

-- 4. Create index for day_id lookups
CREATE INDEX IF NOT EXISTS timesheet_entries_day_id_idx
  ON public.timesheet_entries(day_id);
