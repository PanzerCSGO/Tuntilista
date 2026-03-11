-- Add tunkkaus_meters column to timesheet_days
ALTER TABLE timesheet_days ADD COLUMN IF NOT EXISTS tunkkaus_meters numeric DEFAULT NULL;
