"use client";

import { useAddSheet } from "./AddSheetContext";

export function AddButton() {
  const { open } = useAddSheet();
  return (
    <button
      onClick={() => open()}
      aria-label="Add"
      className="grid h-14 w-14 -translate-y-4 place-items-center rounded-full bg-[var(--accent)] text-3xl leading-none text-white shadow-[var(--shadow)] transition active:scale-95"
    >
      <span className="-mt-0.5">+</span>
    </button>
  );
}
