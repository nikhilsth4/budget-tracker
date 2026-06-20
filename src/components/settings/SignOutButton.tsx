"use client";

import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  async function signOut() {
    await createBrowserSupabase().auth.signOut();
    router.push("/sign-in");
  }
  return (
    <button
      onClick={signOut}
      className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] py-3 font-medium text-[var(--danger)] transition active:scale-[0.99]"
    >
      Sign out
    </button>
  );
}
