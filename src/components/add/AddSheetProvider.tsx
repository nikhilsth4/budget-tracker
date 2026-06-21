"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AddSheetContext, type AddMode } from "./AddSheetContext";
import { AddSheet } from "./AddSheet";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { listCategories } from "@/lib/data/categories";
import { listEmployers } from "@/lib/data/employers";
import type {
  CategoryRow,
  EmployerRow,
  ShiftRow,
  TransactionRow,
} from "@/lib/supabase/types";

export function AddSheetProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AddMode>("out");
  const [editShift, setEditShift] = useState<ShiftRow | null>(null);
  const [editTransaction, setEditTransaction] = useState<TransactionRow | null>(null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [employers, setEmployers] = useState<EmployerRow[]>([]);

  useEffect(() => {
    const sb = createBrowserSupabase();
    listCategories(sb).then(setCategories).catch(() => {});
    listEmployers(sb).then(setEmployers).catch(() => {});
  }, []);

  function open(next: AddMode = "out") {
    setEditShift(null);
    setEditTransaction(null);
    setMode(next);
    setIsOpen(true);
  }
  function openEditShift(shift: ShiftRow) {
    setEditTransaction(null);
    setEditShift(shift);
    setMode("shift");
    setIsOpen(true);
  }
  function openEditTransaction(transaction: TransactionRow) {
    setEditShift(null);
    setEditTransaction(transaction);
    setMode(transaction.direction);
    setIsOpen(true);
  }
  function close() {
    setIsOpen(false);
    setEditShift(null);
    setEditTransaction(null);
  }

  return (
    <AddSheetContext.Provider
      value={{
        isOpen,
        mode,
        editShift,
        editTransaction,
        open,
        openEditShift,
        openEditTransaction,
        close,
      }}
    >
      {children}
      <AddSheet
        open={isOpen}
        onClose={close}
        defaultMode={mode}
        editShift={editShift}
        editTransaction={editTransaction}
        categories={categories}
        employers={employers}
        onCreated={() => router.refresh()}
      />
    </AddSheetContext.Provider>
  );
}
