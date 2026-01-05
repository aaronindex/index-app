import LandingPage from "@/app/components/LandingPage";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Make it a regular function (not async) to avoid any async issues
export default function Home() {
  return <LandingPage />;
}
