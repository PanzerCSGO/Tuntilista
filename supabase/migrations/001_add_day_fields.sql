-- =====================================================
-- OSA 1: Lisää päiväkohtaiset kentät timesheet_days-tauluun
-- =====================================================
CREATE TABLE IF NOT EXISTS public.timesheet_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timesheet_id uuid NOT NULL REFERENCES public.timesheets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(timesheet_id, date)
);

CREATE INDEX IF NOT EXISTS timesheet_days_timesheet_id_idx ON public.timesheet_days(timesheet_id);
CREATE INDEX IF NOT EXISTS timesheet_days_date_idx ON public.timesheet_days(date);

ALTER TABLE timesheet_days
  ADD COLUMN IF NOT EXISTS project_no text,
  ADD COLUMN IF NOT EXISTS address    text,
  ADD COLUMN IF NOT EXISTS meters     numeric,
  ADD COLUMN IF NOT EXISTS note       text;

-- =====================================================
-- OSA 2: RLS — käyttäjä näkee vain omat laput
-- =====================================================

-- timesheets
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "timesheets_select_own"  ON timesheets;
DROP POLICY IF EXISTS "timesheets_insert_own"  ON timesheets;
DROP POLICY IF EXISTS "timesheets_update_own"  ON timesheets;
DROP POLICY IF EXISTS "timesheets_delete_own"  ON timesheets;

CREATE POLICY "timesheets_select_own"  ON timesheets FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "timesheets_insert_own"  ON timesheets FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "timesheets_update_own"  ON timesheets FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "timesheets_delete_own"  ON timesheets FOR DELETE USING (user_id = auth.uid());

-- timesheet_days (JOIN timesheets to verify ownership)
ALTER TABLE timesheet_days ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "timesheet_days_select_own"  ON timesheet_days;
DROP POLICY IF EXISTS "timesheet_days_insert_own"  ON timesheet_days;
DROP POLICY IF EXISTS "timesheet_days_update_own"  ON timesheet_days;
DROP POLICY IF EXISTS "timesheet_days_delete_own"  ON timesheet_days;

CREATE POLICY "timesheet_days_select_own" ON timesheet_days
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM timesheets t
      WHERE t.id = timesheet_days.timesheet_id
        AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "timesheet_days_insert_own" ON timesheet_days
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM timesheets t
      WHERE t.id = timesheet_days.timesheet_id
        AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "timesheet_days_update_own" ON timesheet_days
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM timesheets t
      WHERE t.id = timesheet_days.timesheet_id
        AND t.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM timesheets t
      WHERE t.id = timesheet_days.timesheet_id
        AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "timesheet_days_delete_own" ON timesheet_days
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM timesheets t
      WHERE t.id = timesheet_days.timesheet_id
        AND t.user_id = auth.uid()
    )
  );

-- machine_entries (Jos taulu on olemassa, sama logiikka)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'machine_entries') THEN
    EXECUTE 'ALTER TABLE machine_entries ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "machine_entries_select_own" ON machine_entries';
    EXECUTE 'DROP POLICY IF EXISTS "machine_entries_insert_own" ON machine_entries';
    EXECUTE 'DROP POLICY IF EXISTS "machine_entries_update_own" ON machine_entries';
    EXECUTE 'DROP POLICY IF EXISTS "machine_entries_delete_own" ON machine_entries';

    EXECUTE $p$
      CREATE POLICY "machine_entries_select_own" ON machine_entries
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM timesheet_days td
            JOIN timesheets t ON t.id = td.timesheet_id
            WHERE td.id = machine_entries.day_id
              AND t.user_id = auth.uid()
          )
        )
    $p$;

    EXECUTE $p$
      CREATE POLICY "machine_entries_insert_own" ON machine_entries
        FOR INSERT WITH CHECK (
          EXISTS (
            SELECT 1 FROM timesheet_days td
            JOIN timesheets t ON t.id = td.timesheet_id
            WHERE td.id = machine_entries.day_id
              AND t.user_id = auth.uid()
          )
        )
    $p$;

    EXECUTE $p$
      CREATE POLICY "machine_entries_update_own" ON machine_entries
        FOR UPDATE USING (
          EXISTS (
            SELECT 1 FROM timesheet_days td
            JOIN timesheets t ON t.id = td.timesheet_id
            WHERE td.id = machine_entries.day_id
              AND t.user_id = auth.uid()
          )
        ) WITH CHECK (
          EXISTS (
            SELECT 1 FROM timesheet_days td
            JOIN timesheets t ON t.id = td.timesheet_id
            WHERE td.id = machine_entries.day_id
              AND t.user_id = auth.uid()
          )
        )
    $p$;

    EXECUTE $p$
      CREATE POLICY "machine_entries_delete_own" ON machine_entries
        FOR DELETE USING (
          EXISTS (
            SELECT 1 FROM timesheet_days td
            JOIN timesheets t ON t.id = td.timesheet_id
            WHERE td.id = machine_entries.day_id
              AND t.user_id = auth.uid()
          )
        )
    $p$;
  END IF;
END
$$;

-- =====================================================
-- OSA 3: status + sent_at timesheets-tauluun
-- =====================================================
ALTER TABLE timesheets
  ADD COLUMN IF NOT EXISTS status  text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent')),
  ADD COLUMN IF NOT EXISTS sent_at timestamptz;
