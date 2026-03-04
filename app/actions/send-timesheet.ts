"use server";

import { createClient } from "@/lib/supabase/server";
import { getTimesheetWithRows, markTimesheetSent } from "@/lib/actions/timesheet";
import { generateTimesheetPdf } from "@/lib/pdf/generate";
import { sendTimesheetEmail } from "@/lib/email/send";
import { revalidatePath } from "next/cache";

export async function sendTimesheet(timesheetId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Ei kirjautunut");

  const ts = await getTimesheetWithRows(timesheetId);
  if (!ts) throw new Error("Tuntilista ei löydy");
  if (ts.user_id !== user.id) throw new Error("Ei oikeus lähettää tätä lappua");
  if (ts.status === "sent") throw new Error("Lappu on jo lähetetty");

  // Get worker's display name from profiles
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  const workerName =
    user.user_metadata?.full_name ||
    profile?.username ||
    user.email ||
    "";

  const pdfBytes = await generateTimesheetPdf(ts, workerName);

  // TODO: poista override kun domain on verifioitu
  const recipientOverride = process.env.EMAIL_TO_OVERRIDE;
  await sendTimesheetEmail({
    to: recipientOverride || user.email || "",
    pdfBytes,
    timesheetId,
    workerName,
    weekLabel: ts.rows.length > 0 ? getWeekLabel(ts.rows) : "",
  });

  await markTimesheetSent(timesheetId);

  revalidatePath(`/app/timesheet/${timesheetId}`);
  revalidatePath("/app");
  return { success: true };
}

function getWeekNumber(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getWeekLabel(rows: { date: string }[]): string {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const first = getWeekNumber(sorted[0].date);
  const last = getWeekNumber(sorted[sorted.length - 1].date);
  return first === last ? String(first) : `${first}–${last}`;
}
