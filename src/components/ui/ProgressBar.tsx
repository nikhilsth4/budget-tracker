"use client";

import { motion } from "framer-motion";

export function ProgressBar({
  value,
  over,
  color,
}: {
  value: number;
  over: boolean;
  color: string;
}) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/5">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
        className="h-full rounded-full"
        style={{ background: over ? "var(--danger)" : color }}
      />
    </div>
  );
}
