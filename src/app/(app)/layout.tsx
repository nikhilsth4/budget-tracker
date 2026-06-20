import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { AppProviders } from "@/components/AppProviders";
import { BottomTabBar } from "@/components/nav/BottomTabBar";
import { TopBar } from "@/components/nav/TopBar";

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
      <TopBar />
      <main className="mx-auto w-full max-w-md px-4 pb-28 pt-6 md:max-w-6xl md:px-8 md:pb-12 md:pt-8">
        {children}
      </main>
      <BottomTabBar />
    </AppProviders>
  );
}
