// app/digests/page.tsx
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';
import Link from 'next/link';
import DigestList from './components/DigestList';

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
    <main className="min-h-screen bg-white dark:bg-black">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <Link
            href="/tools"
            className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-foreground transition-colors mb-4 inline-block"
          >
            ← Back to Tools
          </Link>
          <h1 className="text-3xl font-semibold text-foreground mb-2">Weekly Digests</h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            AI-generated summaries of your weekly conversations and insights
          </p>
        </div>

        <DigestList digests={digests || []} />
      </div>
    </main>
  );
}

