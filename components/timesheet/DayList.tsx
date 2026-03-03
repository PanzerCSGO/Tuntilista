"use client";

import type { DayRow } from "@/lib/types";
import DayRowComponent from "./DayRowComponent";

interface Props {
  rows: DayRow[];
  timesheetId: string;
  locked: boolean;
  onOpenMachine: (date: string, machine: string) => void;
  onCopyPrev: (date: string) => void;
  onDeleteDay: (date: string) => void;
  onSaveStatus: (status: "idle" | "saving" | "saved" | "error") => void;
  onRowChange: (date: string, updated: Partial<DayRow>) => void;
}

export default function DayList({
  rows,
  timesheetId,
  locked,
  onOpenMachine,
  onCopyPrev,
  onDeleteDay,
  onSaveStatus,
  onRowChange,
}: Props) {
  if (rows.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-sm text-gray-400">Paina "Lisää päivä" alta.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {rows.map((row, idx) => (
        <DayRowComponent
          key={row.date}
          row={row}
          canCopyPrev={idx > 0}
          timesheetId={timesheetId}
          locked={locked}
          onOpenMachine={onOpenMachine}
          onCopyPrev={() => onCopyPrev(row.date)}
          onDeleteDay={() => onDeleteDay(row.date)}
          onSaveStatus={onSaveStatus}
          onRowChange={onRowChange}
        />
      ))}
    </div>
  );
}
