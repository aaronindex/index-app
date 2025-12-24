// app/digests/[id]/page.tsx
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import DigestDetailClient from './components/DigestDetailClient';

export default async function DigestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const supabase = await getSupabaseServerClient();

  // Get digest
  const { data: digest, error } = await supabase
    .from('weekly_digests')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !digest) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-white dark:bg-black">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <Link
            href="/digests"
            className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-foreground transition-colors mb-4 inline-block"
          >
            ← Back to Digests
          </Link>
          <h1 className="text-3xl font-semibold text-foreground mb-2">
            Weekly Digest: {new Date(digest.week_start).toLocaleDateString()} - {new Date(digest.week_end).toLocaleDateString()}
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Created: {new Date(digest.created_at).toLocaleDateString()}
            {digest.email_sent_at && (
              <span className="ml-2">• Email sent: {new Date(digest.email_sent_at).toLocaleDateString()}</span>
            )}
          </p>
        </div>

        <DigestDetailClient digest={digest} />
      </div>
    </main>
  );
}

