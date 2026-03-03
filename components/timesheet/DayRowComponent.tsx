"use client";

import { useState, useRef } from "react";
import { MACHINES } from "@/lib/types";
import type { DayRow } from "@/lib/types";
import { upsertDayMeta } from "@/lib/actions/timesheet";

interface Props {
  row: DayRow;
  isFirst: boolean;
  canCopyPrev: boolean;
  timesheetId: string;
  onOpenMachine: (date: string, machine: string) => void;
  onCopyPrev: () => void;
  onDeleteDay: () => void;
  onSaveStatus: (s: "saving" | "saved" | "error") => void;
}

function formatDate(d: string) {
  const [, m, day] = d.split("-");
  const date = new Date(d + "T12:00:00");
  const weekdays = ["Su", "Ma", "Ti", "Ke", "To", "Pe", "La"];
  const wd = weekdays[date.getDay()];
  return { short: `${day}.${m}`, wd };
}

export default function DayRowComponent({
  row,
  canCopyPrev,
  timesheetId,
  onOpenMachine,
  onCopyPrev,
  onDeleteDay,
  onSaveStatus,
}: Props) {
  const [projectNo, setProjectNo] = useState(row.project_no ?? "");
  const [meters, setMeters] = useState(
    row.meters != null ? String(row.meters) : ""
  );
  const [note, setNote] = useState(row.note ?? "");
  const [showNote, setShowNote] = useState(!!(row.note));

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { short, wd } = formatDate(row.date);
  const dayTotal = Object.values(row.machines).reduce(
    (s, h) => s + (h ?? 0),
    0
  );
  const filledMachines = MACHINES.filter((m) => (row.machines[m] ?? 0) > 0);

  function scheduleSave(
    pNo: string,
    m: string,
    n: string
  ) {
    if (debounce.current) clearTimeout(debounce.current);
    onSaveStatus("saving");
    debounce.current = setTimeout(async () => {
      try {
        await upsertDayMeta({
          timesheet_id: timesheetId,
          date: row.date,
          project_no: pNo,
          meters: m !== "" ? parseFloat(m) : null,
          note: n || null,
        });
        onSaveStatus("saved");
      } catch (err) {
        console.error("upsertDayMeta:", err);
        onSaveStatus("error");
      }
    }, 600);
  }

  const inputBase =
    "w-full text-sm bg-transparent border-b border-gray-200 pb-0.5 focus:outline-none focus:border-orange-500 text-gray-800 transition-colors";

  return (
    <div className="px-4 py-3">
      {/* Top row: date + total + actions */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-xs font-bold text-gray-600 select-none">
              {wd}
            </span>
            <span className="text-sm font-bold text-gray-900">{short}</span>
          </div>
          {dayTotal > 0 && (
            <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
              {dayTotal.toFixed(1)} h
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {canCopyPrev && (
            <button
              type="button"
              onClick={onCopyPrev}
              className="text-[11px] text-blue-500 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors"
            >
              Kopioi ↑
            </button>
          )}
          <button
            type="button"
            onClick={onDeleteDay}
            className="text-gray-300 hover:text-red-400 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Day meta: project + meters */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            Projekti nro
          </label>
          <input
            type="text"
            value={projectNo}
            onChange={(e) => {
              setProjectNo(e.target.value);
              scheduleSave(e.target.value, meters, note);
            }}
            className={inputBase}
            placeholder="esim. 8435"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            Metrit (m)
          </label>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            value={meters}
            onChange={(e) => {
              setMeters(e.target.value);
              scheduleSave(projectNo, e.target.value, note);
            }}
            className={inputBase}
            placeholder="0.0"
          />
        </div>
      </div>

      {/* Note toggle */}
      {!showNote ? (
        <button
          type="button"
          onClick={() => setShowNote(true)}
          className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-3 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Lisää huomio
        </button>
      ) : (
        <div className="mb-3">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            Huomio
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              scheduleSave(projectNo, meters, e.target.value);
            }}
            className={inputBase}
            placeholder="Vapaa huomio..."
            autoFocus
          />
        </div>
      )}

      {/* Machine chips */}
      <div className="flex flex-wrap gap-2">
        {MACHINES.map((machine) => {
          const hours = row.machines[machine] ?? 0;
          const filled = hours > 0;
          return (
            <button
              key={machine}
              type="button"
              onClick={() => onOpenMachine(row.date, machine)}
              className={`
                flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all active:scale-95
                ${filled
                  ? "bg-orange-500 text-white shadow-sm shadow-orange-200"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }
              `}
            >
              <span className="text-xs leading-none">{machine}</span>
              {filled && (
                <span className="text-xs font-bold leading-none bg-white/25 px-1.5 py-0.5 rounded-md">
                  {hours % 1 === 0 ? hours.toFixed(0) : hours.toFixed(1)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {filledMachines.length > 1 && (
        <div className="mt-2 text-xs text-gray-400">
          {filledMachines
            .map((m) => `${m}: ${(row.machines[m] ?? 0).toFixed(1)}h`)
            .join(" · ")}
        </div>
      )}
    </div>
  );
}
