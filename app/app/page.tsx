import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTimesheets } from "@/lib/actions/timesheet";
import NewTimesheetButton from "@/components/timesheet/NewTimesheetButton";
import DeleteTimesheetButton from "@/components/timesheet/DeleteTimesheetButton";

function formatDate(d: string | null) {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}.${m}.${y}`;
}

async function checkTablesExist(): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("timesheets").select("id").limit(1);
  // error.code 42P01 = table does not exist
  return !error;
}

export default async function AppPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tablesExist = await checkTablesExist();

  if (!tablesExist) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-bold text-gray-900 tracking-tight">Tuntilaput</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-semibold text-amber-800 mb-1">Tietokantamigraatio tarvitaan</p>
              <p className="text-sm text-amber-700 mb-3">
                Taulut <code className="bg-amber-100 px-1 rounded">timesheets</code> ja{" "}
                <code className="bg-amber-100 px-1 rounded">timesheet_entries</code> puuttuvat.
              </p>
              <ol className="text-sm text-amber-700 space-y-1 list-decimal list-inside">
                <li>Avaa <strong>Supabase → SQL Editor</strong></li>
                <li>Kopioi tiedoston <code className="bg-amber-100 px-1 rounded">supabase-v2-migration.sql</code> sisältö</li>
                <li>Paina <strong>Run</strong></li>
                <li>Päivitä tämä sivu</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const sheets = await getTimesheets();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900 tracking-tight">Tuntilaput</h1>
          <p className="text-xs text-gray-400 mt-0.5">{sheets.length} lappua</p>
        </div>
        <NewTimesheetButton />
      </div>

      {sheets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-sm font-medium text-gray-500">Ei tuntilistoja</p>
          <p className="text-xs text-gray-400 mt-1">Luo ensimmäinen lappu yllä olevalla napilla.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {sheets.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <Link href={`/app/timesheet/${s.id}`} className="block p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 text-xs font-semibold">
                        #{s.project_number || "–"}
                      </span>
                      {s.period_start && (
                        <span className="text-xs text-gray-400">
                          {formatDate(s.period_start)}{s.period_end ? ` – ${formatDate(s.period_end)}` : ""}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-800 truncate">{s.address || "Ei osoitetta"}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Luotu {formatDate(s.created_at.split("T")[0])}</p>
                  </div>
                  <div className="text-orange-400 flex-shrink-0 mt-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
              <div className="border-t border-gray-50 px-4 py-2 flex justify-end">
                <DeleteTimesheetButton id={s.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
