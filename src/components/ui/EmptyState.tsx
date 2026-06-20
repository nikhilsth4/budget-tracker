"use client";

import { motion } from "framer-motion";

export function EmptyState({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto flex max-w-xs flex-col items-center px-6 py-16 text-center"
    >
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-[var(--surface-2)] text-3xl">
        {icon}
      </div>
      <p className="text-lg font-semibold">{title}</p>
      {subtitle && <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-5 rounded-xl bg-[var(--ink)] px-5 py-2.5 text-sm font-medium text-white transition active:scale-[0.98]"
        >
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
}
