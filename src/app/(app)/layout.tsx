import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { AppProviders } from "@/components/AppProviders";
import { BottomTabBar } from "@/components/nav/BottomTabBar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  return (
    <AppProviders>
      <div className="mx-auto min-h-dvh max-w-md">
        <main className="px-4 pb-28 pt-6">{children}</main>
        <BottomTabBar />
      </div>
    </AppProviders>
  );
}
