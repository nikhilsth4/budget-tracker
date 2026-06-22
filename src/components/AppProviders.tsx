"use client";

import { MotionConfig } from "framer-motion";
import { ToastProvider } from "@/components/ui/Toast";
import { AddSheetProvider } from "@/components/add/AddSheetProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  // reducedMotion="user" makes Framer Motion honor the OS prefers-reduced-motion
  // setting for JS-driven (spring/transform/drag) animations — the global CSS guard
  // in globals.css only covers CSS animation/transition durations.
  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <AddSheetProvider>{children}</AddSheetProvider>
      </ToastProvider>
    </MotionConfig>
  );
}
