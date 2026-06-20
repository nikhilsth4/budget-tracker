"use client";

import { ToastProvider } from "@/components/ui/Toast";
import { AddSheetProvider } from "@/components/add/AddSheetProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AddSheetProvider>{children}</AddSheetProvider>
    </ToastProvider>
  );
}
