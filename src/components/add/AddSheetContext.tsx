"use client";

import { createContext, useContext } from "react";

export type AddMode = "in" | "out" | "shift";

export const AddSheetContext = createContext<{
  isOpen: boolean;
  mode: AddMode;
  open: (mode?: AddMode) => void;
  close: () => void;
} | null>(null);

export function useAddSheet() {
  const ctx = useContext(AddSheetContext);
  if (!ctx) throw new Error("useAddSheet must be used within AddSheetProvider");
  return ctx;
}
