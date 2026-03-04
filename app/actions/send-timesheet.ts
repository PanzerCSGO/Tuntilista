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

  const pdfBytes = await generateTimesheetPdf(ts, user.email ?? "");

  // TODO: poista override kun domain on verifioitu
  const recipientOverride = process.env.EMAIL_TO_OVERRIDE;
  await sendTimesheetEmail({
    to: recipientOverride || user.email || "",
    pdfBytes,
    timesheetId,
  });

  await markTimesheetSent(timesheetId);

  revalidatePath(`/app/timesheet/${timesheetId}`);
  revalidatePath("/app");
  return { success: true };
}
