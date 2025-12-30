import Link from "next/link";
import { getCurrentUser } from "@/lib/getUser";
import MagicHomeScreen from "@/app/components/MagicHomeScreen";

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <main className="min-h-screen bg-[rgb(var(--bg))]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-8">
          <div>
            <h1 className="font-serif text-4xl font-semibold text-[rgb(var(--text))] mb-4">
              Welcome to INDEX
            </h1>
            <p className="text-lg text-[rgb(var(--muted))] mb-4">
              Personal Business Intelligence for your AI life.
            </p>
            <p className="text-sm text-[rgb(var(--muted))]">
              <strong className="text-[rgb(var(--text))]">Your data, your control.</strong> We do not train AI models on your conversations.
            </p>
          </div>
          {user ? (
            <MagicHomeScreen />
          ) : (
            <div className="pt-8 space-y-4">
              <p className="text-[rgb(var(--muted))]">
                Sign in to get started with your personal AI memory.
              </p>
              <div className="flex gap-4">
                <Link
                  href="/auth/signin"
                  className="inline-block px-6 py-3 bg-[rgb(var(--text))] text-[rgb(var(--bg))] rounded-lg hover:opacity-90 transition-opacity font-medium"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/signup"
                  className="inline-block px-6 py-3 border border-[rgb(var(--ring)/0.12)] rounded-lg hover:bg-[rgb(var(--surface2))] transition-colors font-medium text-[rgb(var(--text))]"
                >
                  Sign up
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
