"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AddSheetContext, type AddMode } from "./AddSheetContext";
import { AddSheet } from "./AddSheet";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { listCategories } from "@/lib/data/categories";
import { listEmployers } from "@/lib/data/employers";
import type { CategoryRow, EmployerRow } from "@/lib/supabase/types";

export function AddSheetProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AddMode>("out");
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [employers, setEmployers] = useState<EmployerRow[]>([]);

  // Load the pick-lists once for the capture form.
  useEffect(() => {
    const sb = createBrowserSupabase();
    listCategories(sb).then(setCategories).catch(() => {});
    listEmployers(sb).then(setEmployers).catch(() => {});
  }, []);

  function open(next: AddMode = "out") {
    setMode(next);
    setIsOpen(true);
  }
  function close() {
    setIsOpen(false);
  }

  return (
    <AddSheetContext.Provider value={{ isOpen, mode, open, close }}>
      {children}
      <AddSheet
        open={isOpen}
        onClose={close}
        defaultMode={mode}
        categories={categories}
        employers={employers}
        onCreated={() => router.refresh()}
      />
    </AddSheetContext.Provider>
  );
}
