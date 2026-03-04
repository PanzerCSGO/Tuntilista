import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTimesheetWithRows } from "@/lib/actions/timesheet";
import TimesheetCard from "@/components/timesheet/TimesheetCard";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TimesheetPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sheet = await getTimesheetWithRows(id);
  if (!sheet) notFound();

  // Get display name from profiles
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  const workerName =
    user.user_metadata?.full_name || profile?.username || user.email || "";

  return <TimesheetCard sheet={sheet} workerName={workerName} />;
}
