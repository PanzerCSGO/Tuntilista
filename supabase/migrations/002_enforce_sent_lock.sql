-- =====================================================
-- 002: Estä lähetettyjen tuntilistojen muokkaus DB-tasolla
-- =====================================================

-- 1) Trigger: estä timesheet_entries muokkaus jos parent on 'sent'
CREATE OR REPLACE FUNCTION public.check_timesheet_not_sent_for_entry()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.timesheets
    WHERE id = COALESCE(NEW.timesheet_id, OLD.timesheet_id)
      AND status = 'sent'
  ) THEN
    RAISE EXCEPTION 'Lähetettyä lappua ei voi muokata';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'timesheet_entries') THEN
    DROP TRIGGER IF EXISTS enforce_sent_lock_entries_insert ON public.timesheet_entries;
    CREATE TRIGGER enforce_sent_lock_entries_insert
      BEFORE INSERT ON public.timesheet_entries
      FOR EACH ROW EXECUTE FUNCTION public.check_timesheet_not_sent_for_entry();

    DROP TRIGGER IF EXISTS enforce_sent_lock_entries_update ON public.timesheet_entries;
    CREATE TRIGGER enforce_sent_lock_entries_update
      BEFORE UPDATE ON public.timesheet_entries
      FOR EACH ROW EXECUTE FUNCTION public.check_timesheet_not_sent_for_entry();

    DROP TRIGGER IF EXISTS enforce_sent_lock_entries_delete ON public.timesheet_entries;
    CREATE TRIGGER enforce_sent_lock_entries_delete
      BEFORE DELETE ON public.timesheet_entries
      FOR EACH ROW EXECUTE FUNCTION public.check_timesheet_not_sent_for_entry();
  END IF;
END
$$;

-- 2) Trigger: estä timesheet_days muokkaus jos parent on 'sent'
CREATE OR REPLACE FUNCTION public.check_timesheet_not_sent_for_day()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.timesheets
    WHERE id = COALESCE(NEW.timesheet_id, OLD.timesheet_id)
      AND status = 'sent'
  ) THEN
    RAISE EXCEPTION 'Lähetettyä lappua ei voi muokata';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'timesheet_days') THEN
    DROP TRIGGER IF EXISTS enforce_sent_lock_days_insert ON public.timesheet_days;
    CREATE TRIGGER enforce_sent_lock_days_insert
      BEFORE INSERT ON public.timesheet_days
      FOR EACH ROW EXECUTE FUNCTION public.check_timesheet_not_sent_for_day();

    DROP TRIGGER IF EXISTS enforce_sent_lock_days_update ON public.timesheet_days;
    CREATE TRIGGER enforce_sent_lock_days_update
      BEFORE UPDATE ON public.timesheet_days
      FOR EACH ROW EXECUTE FUNCTION public.check_timesheet_not_sent_for_day();

    DROP TRIGGER IF EXISTS enforce_sent_lock_days_delete ON public.timesheet_days;
    CREATE TRIGGER enforce_sent_lock_days_delete
      BEFORE DELETE ON public.timesheet_days
      FOR EACH ROW EXECUTE FUNCTION public.check_timesheet_not_sent_for_day();
  END IF;
END
$$;

-- 3) Trigger: estä timesheets-taulun muokkaus paitsi status-päivitys
CREATE OR REPLACE FUNCTION public.check_timesheet_sent_self()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Sallitaan vain status-muutos (draft -> sent)
  IF OLD.status = 'sent' AND NEW.status = 'sent' THEN
    RAISE EXCEPTION 'Lähetettyä lappua ei voi muokata';
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'timesheets') THEN
    DROP TRIGGER IF EXISTS enforce_sent_lock_timesheets ON public.timesheets;
    CREATE TRIGGER enforce_sent_lock_timesheets
      BEFORE UPDATE ON public.timesheets
      FOR EACH ROW EXECUTE FUNCTION public.check_timesheet_sent_self();
  END IF;
END
$$;
