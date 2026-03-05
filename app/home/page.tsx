import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/getUser";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getHomePageData } from "@/lib/ui-data/home-page-data";
import MagicHomeScreen from "@/app/components/MagicHomeScreen";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Home | INDEX",
  description: "Your personal business intelligence dashboard",
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  const cookieStore = await cookies();
  const focusModalDismissed = cookieStore.get("index_focus_modal_dismissed")?.value === "1";

  const supabase = await getSupabaseServerClient();
  const initialData = await getHomePageData(supabase, user.id, focusModalDismissed);

  return (
    <main className="min-h-screen bg-[rgb(var(--bg))]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <MagicHomeScreen
          initialData={initialData}
          initialShowFocusModal={initialData.showFocusModal}
        />
      </div>
    </main>
  );
}
