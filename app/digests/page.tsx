// app/digests/page.tsx
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';
import Link from 'next/link';
import type { Metadata } from 'next';
import DigestList from './components/DigestList';

export const metadata: Metadata = {
  title: "Weekly Digests | INDEX",
  description: "AI-generated summaries of your weekly conversations and insights",
};

export default async function DigestsPage() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const supabase = await getSupabaseServerClient();

  // Get all digests for user
  const { data: digests } = await supabase
    .from('weekly_digests')
    .select('*')
    .eq('user_id', user.id)
    .order('week_start', { ascending: false });

  return (
    <main className="min-h-screen bg-[rgb(var(--bg))]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <Link
            href="/home"
            className="text-sm text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors mb-4 inline-block"
          >
            ← Back to Home
          </Link>
          <h1 className="font-serif text-3xl font-semibold text-[rgb(var(--text))] mb-2">Weekly Digests</h1>
          <p className="text-[rgb(var(--muted))]">
            AI-generated summaries of your weekly conversations and insights
          </p>
        </div>

        <DigestList digests={digests || []} />
      </div>
    </main>
  );
}

