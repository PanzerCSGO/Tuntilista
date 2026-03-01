"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { TimeEntry } from "@/lib/types";

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-");
  return `${day}.${month}.${year}`;
}

interface EntryListProps {
  entries: TimeEntry[];
}

export default function EntryList({ entries }: EntryListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Poistetaanko merkintä?")) return;

    setError(null);
    setDeletingId(id);

    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("time_entries")
      .delete()
      .eq("id", id);

    if (deleteError) {
      setError("Poisto epäonnistui: " + deleteError.message);
    } else {
      router.refresh();
    }

    setDeletingId(null);
  }

  const totalHours = entries.reduce((sum, e) => sum + Number(e.hours), 0);
  const totalMeters = entries.reduce((sum, e) => sum + Number(e.meters_dug), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900">
          Merkinnät{" "}
          <span className="text-sm font-normal text-gray-400">
            ({entries.length} kpl)
          </span>
        </h2>
        {entries.length > 0 && (
          <div className="flex gap-4 text-xs text-gray-500">
            <span>
              Yhteensä:{" "}
              <span className="font-medium text-gray-700">
                {totalHours.toFixed(1)} h
              </span>
            </span>
            <span>
              Kaivettu:{" "}
              <span className="font-medium text-gray-700">
                {totalMeters.toFixed(1)} m
              </span>
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {entries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <div className="text-3xl mb-2">📋</div>
          <p className="text-sm text-gray-400">Ei merkintöjä vielä.</p>
          <p className="text-xs text-gray-300 mt-1">
            Lisää ensimmäinen merkintä yllä olevalla lomakkeella.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Top row */}
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-gray-900">
                      {formatDate(entry.date)}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 text-xs font-medium">
                      #{entry.project_number}
                    </span>
                  </div>

                  {/* Address */}
                  <p className="text-sm text-gray-600 truncate mb-3">
                    {entry.address}
                  </p>

                  {/* Stats row */}
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <svg
                        className="w-3.5 h-3.5 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span className="font-medium text-gray-700">
                        {Number(entry.hours).toFixed(1)} h
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <svg
                        className="w-3.5 h-3.5 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2z"
                        />
                      </svg>
                      <span className="font-medium text-gray-700">
                        {Number(entry.meters_dug).toFixed(1)} m
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <svg
                        className="w-3.5 h-3.5 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"
                        />
                      </svg>
                      <span className="font-medium text-gray-700">
                        {entry.machine}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Delete button */}
                <button
                  onClick={() => handleDelete(entry.id)}
                  disabled={deletingId === entry.id}
                  aria-label="Poista merkintä"
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                >
                  {deletingId === entry.id ? (
                    <svg
                      className="w-4 h-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
