"use client";

import { createContext, useContext } from "react";
import type { ShiftRow, TransactionRow } from "@/lib/supabase/types";

export type AddMode = "in" | "out" | "shift";

export const AddSheetContext = createContext<{
  isOpen: boolean;
  mode: AddMode;
  editShift: ShiftRow | null;
  editTransaction: TransactionRow | null;
  open: (mode?: AddMode) => void;
  openEditShift: (shift: ShiftRow) => void;
  openEditTransaction: (transaction: TransactionRow) => void;
  close: () => void;
} | null>(null);

export function useAddSheet() {
  const ctx = useContext(AddSheetContext);
  if (!ctx) throw new Error("useAddSheet must be used within AddSheetProvider");
  return ctx;
}
