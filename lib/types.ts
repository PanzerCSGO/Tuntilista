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
