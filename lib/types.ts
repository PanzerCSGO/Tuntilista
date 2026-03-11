// ---- V1 legacy (säilytetään) ----
export type TimeEntry = {
  id: string;
  user_id: string;
  date: string;
  project_number: string;
  address: string;
  meters_dug: number;
  machine: string;
  hours: number;
  created_at: string;
};
export type TimeEntryInsert = Omit<TimeEntry, "id" | "user_id" | "created_at">;

// ---- Koneet ----
export const MACHINES = [
  "Hitachi 85",
  "Wacker 65",
  "Hitachi 55",
  "Hitachi 33",
  "AM",
  "Iveco",
  "Man",
  "Pulla-auto",
  "Tunkkaus",
] as const;
export type Machine = (typeof MACHINES)[number];

// ---- Timesheet (lappu) ----
export type Timesheet = {
  id: string;
  user_id: string;
  period_start: string | null;
  period_end: string | null;
  project_number: string;
  address: string;
  status: "draft" | "sent";
  sent_at: string | null;
  created_at: string;
  updated_at: string;
};

// ---- TimesheetEntry (kone+tunnit per päivä) ----
export type TimesheetEntry = {
  id: string;
  timesheet_id: string;
  user_id: string;
  date: string;
  machine: string;
  hours: number;
  created_at: string;
  updated_at: string;
};

// ---- TimesheetDay (päiväkohtainen projekti/metrit/huomio) ----
export type TimesheetDay = {
  id: string;
  timesheet_id: string;
  user_id: string;
  date: string;
  project_no: string;
  meters: number | null;
  tunkkaus_meters: number | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

// ---- Ryhmitelty päivärivi ----
export type DayRow = {
  day_id: string;
  date: string;
  address: string;
  project_no: string;
  meters: number | null;
  note: string | null;
  tunkkaus_meters: number | null;
  machines: Partial<Record<string, number>>;
};

// ---- Timesheet + kaikki rivit ----
export type TimesheetWithRows = Timesheet & {
  rows: DayRow[];
  totalHours: number;
};
