import { createServerSupabase } from "@/lib/supabase/server";
import { listCategories } from "@/lib/data/categories";
import { listEmployers } from "@/lib/data/employers";
import { CategoryEditor } from "@/components/settings/CategoryEditor";
import { EmployerEditor } from "@/components/settings/EmployerEditor";
import { SignOutButton } from "@/components/settings/SignOutButton";

export default async function SettingsPage() {
  const supabase = await createServerSupabase();
  const [{ data: userData }, categories, employers] = await Promise.all([
    supabase.auth.getUser(),
    listCategories(supabase),
    listEmployers(supabase),
  ]);

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Settings</h1>

      <section className="space-y-3">
        <h2 className="px-1 text-sm font-semibold text-[var(--muted)]">Categories</h2>
        <CategoryEditor categories={categories} />
      </section>

      <section className="space-y-3">
        <h2 className="px-1 text-sm font-semibold text-[var(--muted)]">Where you work</h2>
        <EmployerEditor employers={employers} />
      </section>

      <section className="space-y-3">
        <h2 className="px-1 text-sm font-semibold text-[var(--muted)]">Account</h2>
        <p className="px-1 text-sm text-[var(--muted)]">{userData.user?.email}</p>
        <SignOutButton />
      </section>
    </div>
  );
}
