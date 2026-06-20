"use client";

import { useAddSheet } from "./AddSheetContext";

export function AddButton() {
  const { open } = useAddSheet();
  return (
    <button
      onClick={() => open()}
      aria-label="Add"
      className="grid h-14 w-14 -translate-y-5 place-items-center rounded-full text-3xl leading-none text-white transition active:scale-90"
      style={{
        background: "linear-gradient(135deg, var(--accent-bright), var(--accent))",
        boxShadow: "0 8px 20px -4px rgba(190, 24, 93, 0.5)",
      }}
    >
      <span className="-mt-0.5">+</span>
    </button>
  );
}
