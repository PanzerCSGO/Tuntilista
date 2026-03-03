"use client";

import { useState, useTransition } from "react";
import { sendTimesheet } from "@/app/actions/send-timesheet";

interface Props {
  timesheetId: string;
  disabled?: boolean;
  onSent?: () => void;
}

export default function SendButton({ timesheetId, disabled = false, onSent }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSend = () => {
    if (disabled || isPending) return;
    setError(null);

    startTransition(async () => {
      try {
        await sendTimesheet(timesheetId);
        onSent?.();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Lahetys epaonnistui");
      }
    });
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleSend}
        disabled={disabled || isPending}
        className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Lahetetaan..." : "Laheta sahkopostiin"}
      </button>
      {error && <p className="mt-2 text-center text-sm text-red-500">{error}</p>}
    </div>
  );
}
