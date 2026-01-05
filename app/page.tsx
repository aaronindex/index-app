import LandingPage from "@/app/components/LandingPage";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default async function Home() {
  // Temporarily simplified - just show landing page
  // We'll add auth back once routing is confirmed working
  return <LandingPage />;
}
