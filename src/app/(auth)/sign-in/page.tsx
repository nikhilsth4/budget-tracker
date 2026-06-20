"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { createBrowserSupabase } from "@/lib/supabase/client";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <main className="min-h-dvh grid place-items-center p-6 bg-[var(--bg)]">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-[1.25rem] text-3xl text-white"
            style={{
              background: "linear-gradient(135deg, var(--accent-bright), var(--accent))",
              boxShadow: "0 12px 28px -8px rgba(190, 24, 93, 0.5)",
            }}
          >
            ◐
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Budget &amp; Shifts</h1>
          <p className="mt-1 text-[var(--muted)]">Track money in, money out, and the hours you work.</p>
        </div>

        {sent ? (
          <div className="rounded-2xl bg-[var(--surface)] p-6 text-center shadow-[var(--shadow)]">
            <p className="text-lg font-medium">Check your email</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              We sent a sign-in link to <span className="font-medium text-[var(--ink)]">{email}</span>.
            </p>
          </div>
        ) : (
          <form onSubmit={send} className="space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              inputMode="email"
              autoComplete="email"
              className="w-full rounded-xl border border-black/10 bg-[var(--surface)] px-4 py-3.5 text-base outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
            />
            <button
              disabled={loading}
              className="w-full rounded-xl bg-[var(--accent)] py-3.5 font-semibold text-white shadow-[0_8px_20px_-8px_rgba(190,24,93,0.6)] transition active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? "Sending…" : "Send magic link"}
            </button>
            {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
          </form>
        )}
      </motion.div>
    </main>
  );
}
