"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { validateCredentials } from "@/lib/authValidation";

type Mode = "signin" | "signup" | "reset";

const fieldClass =
  "w-full rounded-xl border border-black/10 bg-[var(--surface)] px-4 py-3.5 text-base outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]";

const subtitles: Record<Mode, string> = {
  signin: "Sign in to track your money and hours.",
  signup: "Create an account to get started.",
  reset: "We'll email you a link to reset your password.",
};

export default function SignIn() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function go(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
    setPassword("");
    setConfirm("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const supabase = createBrowserSupabase();

    // Reset: only an email is needed.
    if (mode === "reset") {
      if (email.trim() === "") {
        setError("Enter your email.");
        return;
      }
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/auth/callback?next=/reset-password`,
      });
      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
      setNotice("Check your email for a link to reset your password.");
      return;
    }

    const errs = validateCredentials(
      email,
      password,
      mode === "signup" ? confirm : undefined,
    );
    if (errs.length) {
      setError(errs[0]);
      return;
    }

    setLoading(true);

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
        go("signin");
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

  const primaryLabel = loading
    ? { signin: "Signing in…", signup: "Creating account…", reset: "Sending…" }[mode]
    : { signin: "Sign in", signup: "Create account", reset: "Send reset link" }[mode];

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
          <p className="mt-1 text-[var(--muted)]">{subtitles[mode]}</p>
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

          {mode !== "reset" && (
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              className={fieldClass}
            />
          )}

          {mode === "signup" && (
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm password"
              autoComplete="new-password"
              className={fieldClass}
            />
          )}

          {mode === "signin" && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => go("reset")}
                className="text-sm font-medium text-[var(--accent)]"
              >
                Forgot password?
              </button>
            </div>
          )}

          <button
            disabled={loading}
            className="w-full rounded-xl bg-[var(--accent)] py-3.5 font-semibold text-white shadow-[0_8px_20px_-8px_rgba(190,24,93,0.6)] transition active:scale-[0.99] disabled:opacity-60"
          >
            {primaryLabel}
          </button>

          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
          {notice && <p className="text-sm text-[var(--ok)]">{notice}</p>}
        </form>

        <p className="mt-5 text-center text-sm text-[var(--muted)]">
          {mode === "reset" ? (
            <>
              Remembered it?{" "}
              <button onClick={() => go("signin")} className="font-medium text-[var(--accent)]">
                Back to sign in
              </button>
            </>
          ) : mode === "signin" ? (
            <>
              New here?{" "}
              <button onClick={() => go("signup")} className="font-medium text-[var(--accent)]">
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button onClick={() => go("signin")} className="font-medium text-[var(--accent)]">
                Sign in
              </button>
            </>
          )}
        </p>
      </motion.div>
    </main>
  );
}
