"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  upsertEntry,
  deleteDayRow,
  addDay,
  deleteEntry,
  updateDayDate,
} from "@/lib/actions/timesheet";
import { sendTimesheet } from "@/app/actions/send-timesheet";
import type { TimesheetWithRows, DayRow } from "@/lib/types";
import DayRowComponent from "./DayRowComponent";
import MachineModal from "./MachineModal";

interface Props {
  sheet: TimesheetWithRows;
  workerName: string;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function TimesheetCard({ sheet, workerName }: Props) {
  const router = useRouter();

  const [rows, setRows] = useState<DayRow[]>(sheet.rows);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [addingDay, setAddingDay] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [locked, setLocked] = useState(sheet.status === "sent");
  const [modal, setModal] = useState<{
    date: string;
    machine: string;
    currentHours: number;
  } | null>(null);

  const newDayRef = useRef<HTMLDivElement | null>(null);

  const totalHours = rows.reduce(
    (sum, row) =>
      sum + Object.values(row.machines).reduce<number>((s, h) => s + (h ?? 0), 0),
    0
  );

  const saveCell = useCallback(
    async (date: string, machine: string, hours: number) => {
      if (locked) return;
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
          { date, address: "", project_no: "", meters: null, note: null, machines: hours > 0 ? { [machine]: hours } : {} },
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
    [sheet.id, locked]
  );

  const handleRowChange = useCallback((date: string, updated: Partial<DayRow>) => {
    setRows((prev) =>
      prev.map((r) => (r.date === date ? { ...r, ...updated } : r))
    );
  }, []);

  async function handleAddDay() {
    if (addingDay || locked) return;
    setAddingDay(true);
    setSaveStatus("saving");
    try {
      const newDate = await addDay(sheet.id);
      setRows((prev) => {
        if (prev.find((r) => r.date === newDate)) return prev;
        return [
          ...prev,
          { date: newDate, address: "", project_no: "", meters: null, note: null, machines: {} },
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
    if (locked) return;
    const idx = rows.findIndex((r) => r.date === targetDate);
    if (idx <= 0) return;
    const prev = rows[idx - 1];
    setRows((prevRows) =>
      prevRows.map((r) =>
        r.date === targetDate
          ? { ...r, address: prev.address, project_no: prev.project_no, machines: { ...prev.machines } }
          : r
      )
    );
    Object.entries(prev.machines).forEach(([machine, hours]) => {
      saveCell(targetDate, machine, hours ?? 0);
    });
  }

  async function handleDeleteDay(date: string) {
    if (locked) return;
    setRows((prev) => prev.filter((r) => r.date !== date));
    await deleteDayRow(sheet.id, date);
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 1500);
  }

  async function handleDeleteMachine(date: string, machine: string) {
    if (locked) return;
    setRows((prev) =>
      prev.map((r) => {
        if (r.date !== date) return r;
        const machines = { ...r.machines };
        delete machines[machine];
        return { ...r, machines };
      })
    );
    setSaveStatus("saving");
    try {
      await deleteEntry(sheet.id, date, machine);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 1500);
    } catch {
      setSaveStatus("error");
    }
  }

  async function handleDateChange(oldDate: string, newDate: string) {
    if (locked) return;
    // Check for duplicate date
    if (rows.some((r) => r.date === newDate)) return;
    setRows((prev) =>
      prev
        .map((r) => (r.date === oldDate ? { ...r, date: newDate } : r))
        .sort((a, b) => a.date.localeCompare(b.date))
    );
    setSaveStatus("saving");
    try {
      await updateDayDate(sheet.id, oldDate, newDate);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
    }
  }

  function openModal(date: string, machine: string) {
    if (locked) return;
    if (!machine) {
      // This shouldn't happen anymore since we use dropdown, but fallback
      setModal({ date, machine: "", currentHours: 0 });
    } else {
      const row = rows.find((r) => r.date === date);
      setModal({ date, machine, currentHours: row?.machines[machine] ?? 0 });
    }
  }

  function handleModalSave(hours: number) {
    if (!modal) return;
    saveCell(modal.date, modal.machine, hours);
    setModal(null);
  }

  async function handleSend() {
    if (locked || sending) return;
    if (!confirm("Lähetetäänkö tuntilista sähköpostiin? Tätä ei voi perua.")) return;
    setSending(true);
    setSendError(null);
    try {
      await sendTimesheet(sheet.id);
      setLocked(true);
    } catch (e: unknown) {
      setSendError(e instanceof Error ? e.message : "Lähetys epäonnistui");
    } finally {
      setSending(false);
    }
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
            <div className="flex items-center gap-3">
              {locked && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold border border-green-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                  Lähetetty
                </span>
              )}
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
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Työntekijä
            </label>
            <div className="text-sm text-gray-600 border-b border-gray-100 pb-1">
              {workerName}
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
              <p className="text-sm text-gray-400">Paina &quot;Lisää kohde&quot; alta.</p>
            </div>
          ) : (
            rows.map((row, idx) => (
              <div
                key={row.date}
                ref={idx === rows.length - 1 ? newDayRef : null}
              >
                <DayRowComponent
                  row={row}
                  canCopyPrev={idx > 0}
                  timesheetId={sheet.id}
                  locked={locked}
                  onOpenMachine={openModal}
                  onCopyPrev={() => copyPrevDay(row.date)}
                  onDeleteDay={() => handleDeleteDay(row.date)}
                  onDeleteMachine={handleDeleteMachine}
                  onDateChange={handleDateChange}
                  onSaveStatus={setSaveStatus}
                  onRowChange={handleRowChange}
                />
              </div>
            ))
          )}
        </div>

        {/* Add day */}
        {!locked && (
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
                  Lisää kohde
                </>
              )}
            </button>
          </div>
        )}

        {/* Send button */}
        {!locked && (
          <div className="p-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || rows.length === 0}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Lähetetään...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Lähetä sähköpostiin
                </>
              )}
            </button>
            {sendError && (
              <p className="text-sm text-red-500 text-center mt-2">{sendError}</p>
            )}
          </div>
        )}
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
