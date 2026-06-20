"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/money";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { deleteTransaction } from "@/lib/data/transactions";
import { useToast } from "@/components/ui/Toast";
import type { TransactionRow } from "@/lib/supabase/types";

function formatDate(d: string): string {
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function TransactionList({ transactions }: { transactions: TransactionRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  async function remove(id: string) {
    setBusy(id);
    try {
      await deleteTransaction(createBrowserSupabase(), id);
      toast.show("Deleted");
      router.refresh();
    } catch {
      toast.show("Couldn't delete", "error");
      setBusy(null);
    }
  }

  return (
    <ul className="space-y-2">
      <AnimatePresence initial={false}>
        {transactions.map((t) => (
          <motion.li
            key={t.id}
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 rounded-2xl bg-[var(--surface)] p-4 shadow-[var(--shadow)]"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{t.note || "—"}</p>
              <p className="text-sm text-[var(--muted)]">{formatDate(t.occurred_at)}</p>
            </div>
            <span
              className="font-semibold"
              style={{ color: t.direction === "in" ? "var(--ok)" : "var(--ink)" }}
            >
              {t.direction === "in" ? "+" : "−"}
              {formatMoney(t.amount)}
            </span>
            <button
              onClick={() => remove(t.id)}
              disabled={busy === t.id}
              aria-label="Delete transaction"
              className="grid h-8 w-8 place-items-center rounded-full text-[var(--muted)] transition hover:bg-black/5 disabled:opacity-50"
            >
              ✕
            </button>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
