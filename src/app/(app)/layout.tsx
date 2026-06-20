import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { AppProviders } from "@/components/AppProviders";
import { BottomTabBar } from "@/components/nav/BottomTabBar";
import { SideNav } from "@/components/nav/SideNav";

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
      <div className="md:flex">
        <SideNav />
        <div className="min-h-dvh flex-1">
          <main className="mx-auto w-full max-w-md px-4 pb-28 pt-6 md:max-w-5xl md:px-8 md:pb-10 md:pt-10">
            {children}
          </main>
        </div>
        <BottomTabBar />
      </div>
    </AppProviders>
  );
}
