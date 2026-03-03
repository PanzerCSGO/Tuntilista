"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type {
  Timesheet,
  TimesheetEntry,
  TimesheetDay,
  TimesheetWithRows,
  DayRow,
} from "@/lib/types";

// ── Helper: get authenticated user or throw ──
async function requireUser(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Ei kirjautunut");
  return user;
}

// ── Helper: verify ownership + check lock ──
async function requireOwnDraftSheet(
  supabase: Awaited<ReturnType<typeof createClient>>,
  timesheetId: string,
  userId: string
) {
  const { data: sheet, error } = await supabase
    .from("timesheets")
    .select("id, status")
    .eq("id", timesheetId)
    .eq("user_id", userId)
    .single();

  if (error || !sheet) throw new Error("Tuntilista ei löydy tai ei ole sinun");
  if (sheet.status === "sent")
    throw new Error("Lähetettyä lappua ei voi muokata");
  return sheet;
}

// ---- Fetch all timesheets ----
export async function getTimesheets(): Promise<Timesheet[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("timesheets")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("getTimesheets:", error.message);
    return [];
  }
  return (data ?? []) as Timesheet[];
}

// ---- Fetch one timesheet with days + entries ----
export async function getTimesheetWithRows(
  id: string
): Promise<TimesheetWithRows | null> {
  const supabase = await createClient();

  const { data: sheet, error: sheetErr } = await supabase
    .from("timesheets")
    .select("*")
    .eq("id", id)
    .single();
  if (sheetErr || !sheet) return null;

  const [{ data: entries }, { data: days }] = await Promise.all([
    supabase
      .from("timesheet_entries")
      .select("*")
      .eq("timesheet_id", id)
      .order("date", { ascending: true }),
    supabase
      .from("timesheet_days")
      .select("*")
      .eq("timesheet_id", id)
      .order("date", { ascending: true }),
  ]);

  const rowMap = new Map<string, DayRow>();

  for (const d of (days ?? []) as TimesheetDay[]) {
    rowMap.set(d.date, {
      date: d.date,
      project_no: d.project_no ?? "",
      meters: d.meters ?? null,
      note: d.note ?? null,
      machines: {},
    });
  }

  for (const e of (entries ?? []) as TimesheetEntry[]) {
    if (!rowMap.has(e.date)) {
      rowMap.set(e.date, {
        date: e.date,
        project_no: "",
        meters: null,
        note: null,
        machines: {},
      });
    }
    const row = rowMap.get(e.date)!;
    if (e.hours > 0 && e.machine !== "_empty") {
      row.machines[e.machine] = e.hours;
    }
  }

  const rows = Array.from(rowMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  const totalHours = rows.reduce(
    (sum, row) =>
      sum + Object.values(row.machines).reduce<number>((s, h) => s + (h ?? 0), 0),
    0
  );

  return { ...(sheet as Timesheet), rows, totalHours };
}

// ---- Create new timesheet ----
export async function createTimesheet(data: {
  address: string;
}): Promise<Timesheet> {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const { data: sheet, error } = await supabase
    .from("timesheets")
    .insert({
      user_id: user.id,
      project_number: "",
      address: data.address,
      status: "draft",
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/app");
  return sheet as Timesheet;
}

// ---- Update timesheet header (address only) ----
export async function updateTimesheetHeader(
  id: string,
  data: { address: string }
): Promise<void> {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  await requireOwnDraftSheet(supabase, id, user.id);

  const { error } = await supabase
    .from("timesheets")
    .update({ address: data.address })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
}

// ---- Delete timesheet ----
export async function deleteTimesheet(id: string): Promise<void> {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const { error } = await supabase
    .from("timesheets")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/app");
}

// ---- Add a new day ----
export async function addDay(timesheetId: string): Promise<string> {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  await requireOwnDraftSheet(supabase, timesheetId, user.id);

  const { data: latest } = await supabase
    .from("timesheet_days")
    .select("date")
    .eq("timesheet_id", timesheetId)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  let nextDate: string;
  if (latest?.date) {
    const d = new Date(latest.date + "T00:00:00");
    d.setDate(d.getDate() + 1);
    nextDate = d.toISOString().split("T")[0];
  } else {
    nextDate = new Date().toISOString().split("T")[0];
  }

  const { error } = await supabase.from("timesheet_days").upsert(
    {
      timesheet_id: timesheetId,
      user_id: user.id,
      date: nextDate,
      project_no: "",
      meters: null,
      note: null,
    },
    { onConflict: "timesheet_id,date" }
  );
  if (error) throw new Error(error.message);

  return nextDate;
}

// ---- Upsert day meta (project_no, meters, note) ----
export async function upsertDayMeta(data: {
  timesheet_id: string;
  date: string;
  project_no: string;
  meters: number | null;
  note: string | null;
}): Promise<void> {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  await requireOwnDraftSheet(supabase, data.timesheet_id, user.id);

  const { error } = await supabase.from("timesheet_days").upsert(
    {
      timesheet_id: data.timesheet_id,
      user_id: user.id,
      date: data.date,
      project_no: data.project_no,
      meters: data.meters,
      note: data.note,
    },
    { onConflict: "timesheet_id,date" }
  );
  if (error) throw new Error(error.message);
}

// ---- Upsert machine hours ----
export async function upsertEntry(data: {
  timesheet_id: string;
  date: string;
  machine: string;
  hours: number;
}): Promise<void> {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  await requireOwnDraftSheet(supabase, data.timesheet_id, user.id);

  if (data.hours === 0) {
    await supabase
      .from("timesheet_entries")
      .delete()
      .eq("timesheet_id", data.timesheet_id)
      .eq("date", data.date)
      .eq("machine", data.machine);
    return;
  }

  const { error } = await supabase.from("timesheet_entries").upsert(
    {
      timesheet_id: data.timesheet_id,
      user_id: user.id,
      date: data.date,
      machine: data.machine,
      hours: data.hours,
    },
    { onConflict: "timesheet_id,date,machine" }
  );
  if (error) throw new Error(error.message);
}

// ---- Delete a full day (days + entries) ----
export async function deleteDayRow(
  timesheet_id: string,
  date: string
): Promise<void> {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  await requireOwnDraftSheet(supabase, timesheet_id, user.id);

  await Promise.all([
    supabase
      .from("timesheet_days")
      .delete()
      .eq("timesheet_id", timesheet_id)
      .eq("date", date),
    supabase
      .from("timesheet_entries")
      .delete()
      .eq("timesheet_id", timesheet_id)
      .eq("date", date),
  ]);
}

// ---- Mark timesheet as sent ----
export async function markTimesheetSent(id: string): Promise<void> {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  const { error } = await supabase
    .from("timesheets")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .neq("status", "sent");

  if (error) throw new Error(error.message);
}

// ---- Autocomplete: last project_no used ----
export async function getLastProjectNo(
  timesheetId: string
): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("timesheet_days")
    .select("project_no")
    .eq("timesheet_id", timesheetId)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.project_no ?? "";
}

// ---- Last used defaults for new timesheet ----
export async function getLastUsedDefaults(): Promise<{
  project_number: string;
  address: string;
} | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("timesheets")
    .select("project_number, address")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  return data ?? null;
}
