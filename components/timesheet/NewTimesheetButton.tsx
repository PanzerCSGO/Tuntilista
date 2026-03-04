"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createTimesheet } from "@/lib/actions/timesheet";

export default function NewTimesheetButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const creating = useRef(false);

  async function handleCreate() {
    if (creating.current) return;
    creating.current = true;
    setLoading(true);
    try {
      const sheet = await createTimesheet({ address: "" });
      router.push(`/app/timesheet/${sheet.id}`);
    } catch {
      creating.current = false;
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCreate}
      disabled={loading}
      className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
      {loading ? "..." : "Uusi lappu"}
    </button>
  );
}
