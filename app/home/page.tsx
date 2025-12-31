import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/getUser";
import MagicHomeScreen from "@/app/components/MagicHomeScreen";

export default async function HomePage() {
  const user = await getCurrentUser();

  // Redirect to landing if not authenticated
  if (!user) {
    redirect('/');
  }

  return (
    <main className="min-h-screen bg-[rgb(var(--bg))]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <MagicHomeScreen />
      </div>
    </main>
  );
}

