"use client";

import { useCallback, useRef } from "react";
import { upsertDayMeta } from "@/lib/actions/timesheet";
import type { DayRow } from "@/lib/types";

interface Props {
  row: DayRow;
  canCopyPrev: boolean;
  timesheetId: string;
  locked: boolean;
  onOpenMachine: (date: string, machine: string) => void;
  onCopyPrev: () => void;
  onDeleteDay: () => void;
  onSaveStatus: (status: "idle" | "saving" | "saved" | "error") => void;
  onRowChange: (date: string, updated: Partial<DayRow>) => void;
}

export default function DayRowComponent({
  row,
  canCopyPrev,
  timesheetId,
  locked,
  onOpenMachine,
  onCopyPrev,
  onDeleteDay,
  onSaveStatus,
  onRowChange,
}: Props) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleMetaSave = useCallback(
    (fields: { project_no: string; meters: number | null; note: string | null }) => {
      if (locked) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      onSaveStatus("saving");
      debounceRef.current = setTimeout(async () => {
        try {
          await upsertDayMeta({
            timesheet_id: timesheetId,
            date: row.date,
            project_no: fields.project_no,
            meters: fields.meters,
            note: fields.note,
          });
          onSaveStatus("saved");
          setTimeout(() => onSaveStatus("idle"), 2000);
        } catch {
          onSaveStatus("error");
        }
      }, 600);
    },
    [timesheetId, row.date, locked, onSaveStatus]
  );

  function handleFieldChange(field: "project_no" | "meters" | "note", raw: string) {
    if (locked) return;
    let updated: Partial<DayRow>;
    let metersVal: number | null;

    switch (field) {
      case "project_no":
        updated = { project_no: raw };
        onRowChange(row.date, updated);
        scheduleMetaSave({ project_no: raw, meters: row.meters, note: row.note });
        break;
      case "meters":
        metersVal = raw === "" ? null : parseFloat(raw);
        if (raw !== "" && isNaN(metersVal!)) return;
        updated = { meters: metersVal };
        onRowChange(row.date, updated);
        scheduleMetaSave({ project_no: row.project_no, meters: metersVal, note: row.note });
        break;
      case "note":
        updated = { note: raw || null };
        onRowChange(row.date, updated);
        scheduleMetaSave({ project_no: row.project_no, meters: row.meters, note: raw || null });
        break;
    }
  }

  const dateObj = new Date(row.date + "T00:00:00");
  const weekday = dateObj.toLocaleDateString("fi-FI", { weekday: "short" });
  const dateLabel = dateObj.toLocaleDateString("fi-FI", { day: "numeric", month: "numeric" });

  const dayHours = Object.values(row.machines).reduce<number>((s, h) => s + (h ?? 0), 0);

  const machineEntries = Object.entries(row.machines).filter(([, h]) => h && h > 0);

  return (
    <div className="px-4 py-3">
      {/* Date + hours */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-400 uppercase w-7">{weekday}</span>
          <span className="text-sm font-semibold text-gray-800">{dateLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          {dayHours > 0 && (
            <span className="text-sm font-bold text-orange-600">{dayHours} h</span>
          )}
          {!locked && (
            <button
              type="button"
              onClick={onDeleteDay}
              className="text-gray-300 hover:text-red-400 transition-colors p-1"
              title="Poista päivä"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Meta fields */}
      <div className="grid grid-cols-12 gap-2 mb-2">
        <div className="col-span-4">
          <input
            type="text"
            value={row.project_no}
            onChange={(e) => handleFieldChange("project_no", e.target.value)}
            disabled={locked}
            className="w-full text-xs border-b border-gray-200 bg-transparent pb-0.5 focus:outline-none focus:border-orange-400 text-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed placeholder:text-gray-300"
            placeholder="Projekti nro"
          />
        </div>
        <div className="col-span-3">
          <input
            type="number"
            step="0.1"
            value={row.meters != null ? String(row.meters) : ""}
            onChange={(e) => handleFieldChange("meters", e.target.value)}
            disabled={locked}
            className="w-full text-xs border-b border-gray-200 bg-transparent pb-0.5 focus:outline-none focus:border-orange-400 text-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed placeholder:text-gray-300"
            placeholder="Metrit"
          />
        </div>
        <div className="col-span-5">
          <input
            type="text"
            value={row.note ?? ""}
            onChange={(e) => handleFieldChange("note", e.target.value)}
            disabled={locked}
            className="w-full text-xs border-b border-gray-200 bg-transparent pb-0.5 focus:outline-none focus:border-orange-400 text-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed placeholder:text-gray-300"
            placeholder="Huomio"
          />
        </div>
      </div>

      {/* Machine chips */}
      <div className="flex flex-wrap gap-1.5">
        {machineEntries.map(([machine, hours]) => (
          <button
            key={machine}
            type="button"
            onClick={() => !locked && onOpenMachine(row.date, machine)}
            disabled={locked}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-50 text-orange-700 text-xs font-medium border border-orange-100 disabled:opacity-60 disabled:cursor-not-allowed hover:bg-orange-100 transition-colors"
          >
            {machine}
            <span className="font-bold">{hours}h</span>
          </button>
        ))}
        {!locked && (
          <button
            type="button"
            onClick={() => onOpenMachine(row.date, "")}
            className="inline-flex items-center gap-0.5 px-2 py-1 rounded-lg bg-gray-50 text-gray-400 text-xs border border-gray-100 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Kone
          </button>
        )}
      </div>

      {/* Copy prev */}
      {!locked && canCopyPrev && (
        <button
          type="button"
          onClick={onCopyPrev}
          className="mt-2 text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
        >
          Kopioi edellinen →
        </button>
      )}
    </div>
  );
}
