"use client";

import { useState } from "react";
import { AddSheetContext, type AddMode } from "./AddSheetContext";

// NOTE: The actual capture form (AddSheet) is wired in here in Task 14. For now
// this provides the open/close state so the bottom tab bar's + button works.
export function AddSheetProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AddMode>("out");

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
    </AddSheetContext.Provider>
  );
}
