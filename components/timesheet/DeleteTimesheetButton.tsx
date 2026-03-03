"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteTimesheet } from "@/lib/actions/timesheet";

export default function DeleteTimesheetButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("Poistetaanko tämä tuntilista?")) return;
    setLoading(true);
    try {
      await deleteTimesheet(id);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-xs text-gray-400 hover:text-red-500 transition-colors py-1 px-2 rounded-lg hover:bg-red-50 disabled:opacity-40"
    >
      {loading ? "..." : "Poista"}
    </button>
  );
}
