"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  upsertEntry,
  updateTimesheetHeader,
  deleteDayRow,
  addDay,
} from "@/lib/actions/timesheet";
import { MACHINES } from "@/lib/types";
import type { TimesheetWithRows, DayRow } from "@/lib/types";
import DayRowComponent from "./DayRowComponent";
import MachineModal from "./MachineModal";

interface Props {
  sheet: TimesheetWithRows;
  userEmail: string;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function TimesheetCard({ sheet, userEmail }: Props) {
  const router = useRouter();

  const [rows, setRows] = useState<DayRow[]>(sheet.rows);
  const [address, setAddress] = useState(sheet.address);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [addingDay, setAddingDay] = useState(false);
  const [modal, setModal] = useState<{
    date: string;
    machine: string;
    currentHours: number;
  } | null>(null);

  const headerDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const newDayRef = useRef<HTMLDivElement | null>(null);

  const totalHours = rows.reduce(
    (sum, row) =>
      sum + Object.values(row.machines).reduce((s, h) => s + (h ?? 0), 0),
    0
  );

  function triggerHeaderSave(addr: string) {
    if (headerDebounce.current) clearTimeout(headerDebounce.current);
    setSaveStatus("saving");
    headerDebounce.current = setTimeout(async () => {
      try {
        await updateTimesheetHeader(sheet.id, { address: addr });
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch {
        setSaveStatus("error");
      }
    }, 600);
  }

  const saveCell = useCallback(
    async (date: string, machine: string, hours: number) => {
      setSaveStatus("saving");
      setRows((prev) => {
        const existing = prev.find((r) => r.date === date);
        if (existing) {
          return prev.map((r) => {
            if (r.date !== date) return r;
            const machines = { ...r.machines };
            if (hours === 0) delete machines[machine];
            else machines[machine] = hours;
            return { ...r, machines };
          });
        }
        return [
          ...prev,
          { date, project_no: "", meters: null, note: null, machines: hours > 0 ? { [machine]: hours } : {} },
        ].sort((a, b) => a.date.localeCompare(b.date));
      });
      try {
        await upsertEntry({ timesheet_id: sheet.id, date, machine, hours });
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch {
        setSaveStatus("error");
      }
    },
    [sheet.id]
  );

  async function handleAddDay() {
    if (addingDay) return;
    setAddingDay(true);
    setSaveStatus("saving");
    try {
      const newDate = await addDay(sheet.id);
      setRows((prev) => {
        if (prev.find((r) => r.date === newDate)) return prev;
        return [
          ...prev,
          { date: newDate, project_no: "", meters: null, note: null, machines: {} },
        ].sort((a, b) => a.date.localeCompare(b.date));
      });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
      setTimeout(() => {
        newDayRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    } catch (err) {
      console.error("addDay:", err);
      setSaveStatus("error");
    } finally {
      setAddingDay(false);
    }
  }

  function copyPrevDay(targetDate: string) {
    const idx = rows.findIndex((r) => r.date === targetDate);
    if (idx <= 0) return;
    const prev = rows[idx - 1];
    // Copy project_no only, NOT meters or note
    setRows((prevRows) =>
      prevRows.map((r) =>
        r.date === targetDate
          ? { ...r, project_no: prev.project_no, machines: { ...prev.machines } }
          : r
      )
    );
    Object.entries(prev.machines).forEach(([machine, hours]) => {
      saveCell(targetDate, machine, hours ?? 0);
    });
  }

  async function handleDeleteDay(date: string) {
    setRows((prev) => prev.filter((r) => r.date !== date));
    await deleteDayRow(sheet.id, date);
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 1500);
  }

  function openModal(date: string, machine: string) {
    const row = rows.find((r) => r.date === date);
    setModal({ date, machine, currentHours: row?.machines[machine] ?? 0 });
  }

  function handleModalSave(hours: number) {
    if (!modal) return;
    saveCell(modal.date, modal.machine, hours);
    setModal(null);
  }

  return (
    <div className="space-y-4">
      {/* Back */}
      <button
        type="button"
        onClick={() => router.push("/app")}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Kaikki laput
      </button>

      {/* Paper card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

        {/* Header */}
        <div className="border-b-2 border-gray-800 px-4 pt-4 pb-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-black text-gray-500 tracking-widest uppercase">
              KMR INFRA OY
            </span>
            <div className="min-w-[90px] flex justify-end">
              {saveStatus === "saving" && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Tallennetaan
                </span>
              )}
              {saveStatus === "saved" && (
                <span className="text-xs text-green-600 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Tallennettu
                </span>
              )}
              {saveStatus === "error" && (
                <span className="text-xs text-red-500">Virhe!</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Työntekijä
              </label>
              <div className="text-sm text-gray-600 border-b border-gray-100 pb-1">
                {userEmail}
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Osoite / Kohde
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  triggerHeaderSave(e.target.value);
                }}
                className="w-full text-sm border-b border-gray-300 bg-transparent pb-1 focus:outline-none focus:border-orange-500 text-gray-800"
                placeholder="esim. Metsätie 4, Helsinki"
              />
            </div>
          </div>
        </div>

        {/* Summary bar */}
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center justify-between">
          <span className="text-xs text-gray-500">{rows.length} päivää</span>
          <span className="text-sm font-bold text-gray-900">
            Yht.{" "}
            <span className="text-orange-600">{totalHours.toFixed(1)} h</span>
          </span>
        </div>

        {/* Day rows */}
        <div className="divide-y divide-gray-100">
          {rows.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-gray-400">Paina "Lisää päivä" alta.</p>
            </div>
          ) : (
            rows.map((row, idx) => (
              <div
                key={row.date}
                ref={idx === rows.length - 1 ? newDayRef : null}
              >
                <DayRowComponent
                  row={row}
                  isFirst={idx === 0}
                  canCopyPrev={idx > 0}
                  timesheetId={sheet.id}
                  onOpenMachine={openModal}
                  onCopyPrev={() => copyPrevDay(row.date)}
                  onDeleteDay={() => handleDeleteDay(row.date)}
                  onSaveStatus={setSaveStatus}
                />
              </div>
            ))
          )}
        </div>

        {/* Add day */}
        <div className="p-4 border-t border-dashed border-gray-300">
          <button
            type="button"
            onClick={handleAddDay}
            disabled={addingDay}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-orange-300 hover:text-orange-500 hover:bg-orange-50 active:scale-[0.98] transition-all text-sm font-semibold disabled:opacity-50"
          >
            {addingDay ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Lisätään...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Lisää päivä
              </>
            )}
          </button>
        </div>
      </div>

      {modal && (
        <MachineModal
          machine={modal.machine}
          currentHours={modal.currentHours}
          onSave={handleModalSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
