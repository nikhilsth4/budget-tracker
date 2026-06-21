"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { validatePassword } from "@/lib/authValidation";

const fieldClass =
  "w-full rounded-xl border border-black/10 bg-[var(--surface)] px-4 py-3.5 text-base outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]";

export default function ResetPassword() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const errs = validatePassword(password, confirm);
    if (errs.length) {
      setError(errs[0]);
      return;
    }

    setLoading(true);
    // The recovery link established a session via /auth/callback, so updateUser
    // applies to the signed-in (recovery) user.
    const { error } = await createBrowserSupabase().auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/budget");
    router.refresh();
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-[var(--bg)] p-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Set a new password</h1>
          <p className="mt-1 text-[var(--muted)]">Choose a new password for your account.</p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-3 rounded-2xl bg-[var(--surface)] p-5 shadow-[var(--shadow)]"
        >
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            autoComplete="new-password"
            className={fieldClass}
          />
          <input
            type="password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm new password"
            autoComplete="new-password"
            className={fieldClass}
          />
          <button
            disabled={loading}
            className="w-full rounded-xl bg-[var(--accent)] py-3.5 font-semibold text-white shadow-[0_8px_20px_-8px_rgba(190,24,93,0.6)] transition active:scale-[0.99] disabled:opacity-60"
          >
            {loading ? "Saving…" : "Save new password"}
          </button>
          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        </form>
      </motion.div>
    </main>
  );
}
