"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { validateCredentials } from "@/lib/authValidation";

type Mode = "signin" | "signup";

const fieldClass =
  "w-full rounded-xl border border-black/10 bg-[var(--surface)] px-4 py-3.5 text-base outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]";

export default function SignIn() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const errs = validateCredentials(email, password);
    if (errs.length) {
      setError(errs[0]);
      return;
    }

    setLoading(true);
    const supabase = createBrowserSupabase();

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password });
      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
      // Email confirmation ON → no session until the user confirms by email.
      if (data.session) {
        router.push("/budget");
        router.refresh();
      } else {
        setNotice("Check your email to confirm your account, then sign in.");
        setMode("signin");
        setPassword("");
      }
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/budget");
    router.refresh();
  }

  function toggleMode() {
    setMode(mode === "signin" ? "signup" : "signin");
    setError(null);
    setNotice(null);
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
          <p className="mt-1 text-[var(--muted)]">
            {mode === "signin"
              ? "Sign in to track your money and hours."
              : "Create an account to get started."}
          </p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-3 rounded-2xl bg-[var(--surface)] p-5 shadow-[var(--shadow)]"
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            inputMode="email"
            autoComplete="email"
            className={fieldClass}
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            className={fieldClass}
          />
          <button
            disabled={loading}
            className="w-full rounded-xl bg-[var(--accent)] py-3.5 font-semibold text-white shadow-[0_8px_20px_-8px_rgba(190,24,93,0.6)] transition active:scale-[0.99] disabled:opacity-60"
          >
            {loading
              ? mode === "signin"
                ? "Signing in…"
                : "Creating account…"
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </button>
          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
          {notice && <p className="text-sm text-[var(--ok)]">{notice}</p>}
        </form>

        <p className="mt-5 text-center text-sm text-[var(--muted)]">
          {mode === "signin" ? "New here? " : "Already have an account? "}
          <button onClick={toggleMode} className="font-medium text-[var(--accent)]">
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </motion.div>
    </main>
  );
}
