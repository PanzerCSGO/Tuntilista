import { createClient } from "@/lib/supabase/server";
import type { TimeEntry } from "@/lib/types";
import EntryForm from "@/components/EntryForm";
import EntryList from "@/components/EntryList";

export default async function AppPage() {
  const supabase = await createClient();

  const { data: entries, error } = await supabase
    .from("time_entries")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="rounded-2xl bg-red-50 border border-red-100 p-4 text-sm text-red-600">
        Merkintöjen lataus epäonnistui: {error.message}
      </div>
    );
  }

  const typedEntries = (entries ?? []) as TimeEntry[];

  return (
    <div className="space-y-6">
      <EntryForm />
      <EntryList entries={typedEntries} />
    </div>
  );
}
