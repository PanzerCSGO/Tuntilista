"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { TimeEntryInsert } from "@/lib/types";

const initialForm: TimeEntryInsert = {
  date: new Date().toISOString().split("T")[0],
  project_number: "",
  address: "",
  meters_dug: 0,
  machine: "",
  hours: 0,
};

export default function EntryForm() {
  const router = useRouter();
  const [form, setForm] = useState<TimeEntryInsert>(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "number" ? (value === "" ? 0 : parseFloat(value)) : value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Et ole kirjautunut sisään.");
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("time_entries")
      .insert({ ...form, user_id: user.id });

    if (insertError) {
      setError("Tallennus epäonnistui: " + insertError.message);
      setLoading(false);
      return;
    }

    setForm({ ...initialForm, date: form.date });
    setLoading(false);
    router.refresh();
  }

  const inputClass =
    "w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <h2 className="font-semibold text-gray-900 mb-5">Uusi merkintä</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="date" className={labelClass}>
              Päivämäärä
            </label>
            <input
              id="date"
              name="date"
              type="date"
              required
              value={form.date}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="project_number" className={labelClass}>
              Projekti nro
            </label>
            <input
              id="project_number"
              name="project_number"
              type="text"
              required
              value={form.project_number}
              onChange={handleChange}
              className={inputClass}
              placeholder="esim. 2024-042"
            />
          </div>
        </div>

        <div>
          <label htmlFor="address" className={labelClass}>
            Osoite
          </label>
          <input
            id="address"
            name="address"
            type="text"
            required
            value={form.address}
            onChange={handleChange}
            className={inputClass}
            placeholder="esim. Metsätie 4, Helsinki"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="meters_dug" className={labelClass}>
              Kaivettu (m)
            </label>
            <input
              id="meters_dug"
              name="meters_dug"
              type="number"
              required
              min="0"
              step="0.1"
              value={form.meters_dug === 0 ? "" : form.meters_dug}
              onChange={handleChange}
              className={inputClass}
              placeholder="0.0"
            />
          </div>

          <div>
            <label htmlFor="machine" className={labelClass}>
              Kone
            </label>
            <input
              id="machine"
              name="machine"
              type="text"
              required
              value={form.machine}
              onChange={handleChange}
              className={inputClass}
              placeholder="esim. Volvo EC220"
            />
          </div>

          <div>
            <label htmlFor="hours" className={labelClass}>
              Tunnit (h)
            </label>
            <input
              id="hours"
              name="hours"
              type="number"
              required
              min="0"
              step="0.5"
              value={form.hours === 0 ? "" : form.hours}
              onChange={handleChange}
              className={inputClass}
              placeholder="0.0"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors duration-150"
        >
          {loading ? "Tallennetaan..." : "Tallenna merkintä"}
        </button>
      </form>
    </div>
  );
}
