import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/getUser";
import LandingPage from "@/app/components/LandingPage";
import type { Metadata } from "next";

// Force dynamic rendering since we use cookies() for auth
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "INDEX — Direction for your AI thinking",
  description: "Distill decisions, open loops, and next steps from AI conversations.",
};

export default async function Home() {
  // Try to get user, but if it fails, just show landing page
  let user = null;
  try {
    user = await getCurrentUser();
  } catch (error) {
    // If auth check fails, treat as logged-out and show landing page
    console.error('Error checking user:', error);
  }

  // Redirect authenticated users to /home
  if (user) {
    redirect('/home');
  }

  // Show landing page for logged-out users
  return <LandingPage />;
}
