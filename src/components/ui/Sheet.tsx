"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { useMediaQuery } from "@/lib/useMediaQuery";

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  // Lock body scroll while the sheet is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Bottom-sheet on mobile, centered modal on desktop.
  const variants = isDesktop
    ? { initial: { opacity: 0, scale: 0.96 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.96 } }
    : { initial: { y: "100%" }, animate: { y: 0 }, exit: { y: "100%" } };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-4">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={title}
              className="safe-bottom pointer-events-auto max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-[var(--surface)] p-5 pb-8 shadow-[var(--shadow)] md:rounded-3xl md:pb-6"
              initial={variants.initial}
              animate={variants.animate}
              exit={variants.exit}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
            >
              <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-black/10 md:hidden" />
              {title && <h2 className="mb-4 text-lg font-semibold">{title}</h2>}
              {children}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
