"use client";

import { useState, useEffect, useRef } from "react";

interface Props {
  machine: string;
  currentHours: number;
  onSave: (hours: number) => void;
  onClose: () => void;
}

const QUICK_VALUES = [0.5, 1, 1.5, 2, 3, 4, 5, 6, 7, 7.5, 8, 8.5, 9, 10];

export default function MachineModal({ machine, currentHours, onSave, onClose }: Props) {
  const [value, setValue] = useState(currentHours > 0 ? String(currentHours) : "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  function handleSave() {
    const parsed = parseFloat(value);
    const hours = isNaN(parsed) ? 0 : Math.min(24, Math.max(0, parsed));
    onSave(hours);
  }

  function handleQuick(h: number) {
    setValue(String(h));
    // Auto-save on quick select
    onSave(h);
  }

  function handleClear() {
    onSave(0);
  }

  function handleAdd(delta: number) {
    const current = parseFloat(value) || 0;
    const next = Math.min(24, Math.max(0, current + delta));
    setValue(String(next));
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Sheet from bottom */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl safe-area-bottom">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        <div className="px-5 pb-8 pt-2">
          {/* Title */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-bold text-gray-900">{machine}</h3>
              <p className="text-xs text-gray-400">Syötä tunnit</p>
            </div>
            <button
              onClick={handleClear}
              className="text-xs text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors font-medium"
            >
              Tyhjennä
            </button>
          </div>

          {/* Main input */}
          <div className="flex items-center gap-3 mb-5">
            <button
              onClick={() => handleAdd(-0.5)}
              className="w-12 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-xl font-bold text-gray-600 transition-colors active:scale-95"
            >
              −
            </button>
            <input
              ref={inputRef}
              type="number"
              inputMode="decimal"
              min={0}
              max={24}
              step={0.5}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              className="flex-1 text-center text-3xl font-bold text-gray-900 border-2 border-gray-200 focus:border-orange-500 rounded-2xl py-3 focus:outline-none bg-gray-50"
              placeholder="0"
            />
            <button
              onClick={() => handleAdd(0.5)}
              className="w-12 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-xl font-bold text-gray-600 transition-colors active:scale-95"
            >
              +
            </button>
          </div>

          {/* Quick values */}
          <div className="flex flex-wrap gap-2 mb-5">
            {QUICK_VALUES.map((h) => (
              <button
                key={h}
                onClick={() => handleQuick(h)}
                className={`
                  px-3 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95
                  ${parseFloat(value) === h
                    ? "bg-orange-500 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }
                `}
              >
                {h % 1 === 0 ? h.toFixed(0) : h.toFixed(1)}
              </button>
            ))}
          </div>

          {/* Confirm button */}
          <button
            onClick={handleSave}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl text-base transition-colors active:scale-[0.98] shadow-lg shadow-orange-200"
          >
            Tallenna
          </button>
        </div>
      </div>
    </>
  );
}
