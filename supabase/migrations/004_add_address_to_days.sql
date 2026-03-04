-- ============================================================
-- V4 migraatio: Osoite/kohde päiväkohtaiseksi
-- Aja Supabase SQL Editorissa
-- ============================================================

-- 1) Lisää address-sarake timesheet_days -tauluun
ALTER TABLE public.timesheet_days
  ADD COLUMN IF NOT EXISTS address text NOT NULL DEFAULT '';

-- 2) Kopioi olemassa olevat osoitteet timesheets → timesheet_days
--    (jokaiselle päivälle kopioidaan lapun osoite, jotta data ei katoa)
UPDATE public.timesheet_days d
SET address = t.address
FROM public.timesheets t
WHERE d.timesheet_id = t.id
  AND d.address = ''
  AND t.address != '';
