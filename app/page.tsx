import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/getUser";
import LandingPage from "@/app/components/LandingPage";

export default async function Home() {
  const user = await getCurrentUser();

  // Redirect authenticated users to /home
  if (user) {
    redirect('/home');
  }

  // Show landing page for logged-out users
  return <LandingPage />;
}
