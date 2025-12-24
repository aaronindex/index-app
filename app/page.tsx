import Link from "next/link";
import { getCurrentUser } from "@/lib/getUser";
import MagicHomeScreen from "@/app/components/MagicHomeScreen";

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <main className="min-h-screen bg-white dark:bg-black">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-semibold text-foreground mb-4">
              Welcome to INDEX
            </h1>
            <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-4">
              Personal Business Intelligence for your AI life.
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-500">
              <strong className="text-foreground">Your data, your control.</strong> We do not train AI models on your conversations.
            </p>
          </div>
          {user ? (
            <MagicHomeScreen />
          ) : (
            <div className="pt-8 space-y-4">
              <p className="text-zinc-600 dark:text-zinc-400">
                Sign in to get started with your personal AI memory.
              </p>
              <div className="flex gap-4">
                <Link
                  href="/auth/signin"
                  className="inline-block px-6 py-3 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity font-medium"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/signup"
                  className="inline-block px-6 py-3 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors font-medium"
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
