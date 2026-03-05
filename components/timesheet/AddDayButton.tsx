"use client";

import { useState } from "react";
import { addDay } from "@/lib/actions/timesheet";

interface Day {
  id: string;
  date: string;
  project_no?: string | null;
  address?: string | null;
  meters?: number | null;
  note?: string | null;
  hours?: number;
  machine_entries?: never[];
}

interface Props {
  timesheetId: string;
  copyFrom?: { project_no: string; address: string };
  onAdded: (day: Day) => void;
}

export function AddDayButton({ timesheetId, copyFrom, onAdded }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async () => {
    setLoading(true);
    setError(null);
    try {
      // Seuraava päivä kalenteripäivillä
      const { dayId, date: newDate } = await addDay(timesheetId);
      onAdded({ id: dayId, date: newDate, project_no: copyFrom?.project_no ?? null, address: copyFrom?.address ?? null, machine_entries: [] });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Virhe");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2">
      <button
        onClick={handle}
        disabled={loading}
        className="w-full border-2 border-dashed border-gray-300 rounded-lg py-3 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-50 transition-colors"
      >
        {loading ? "Lisätään…" : "+ Lisää päivä"}
      </button>
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
}