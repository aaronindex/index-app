// app/digests/[id]/page.tsx
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/getUser';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import DigestDetailClient from './components/DigestDetailClient';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return {
      title: 'Weekly Digest | INDEX',
    };
  }

  const supabase = await getSupabaseServerClient();
  const { data: digest } = await supabase
    .from('weekly_digests')
    .select('week_start, week_end')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!digest) {
    return {
      title: 'Weekly Digest | INDEX',
    };
  }

  const startDate = new Date(digest.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endDate = new Date(digest.week_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return {
    title: `Weekly Digest (${startDate} - ${endDate}) | INDEX`,
    description: `Weekly intelligence summary for ${startDate} - ${endDate}`,
  };
}

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
    <main className="min-h-screen bg-[rgb(var(--bg))]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <Link
            href="/digests"
            className="text-sm text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors mb-4 inline-block"
          >
            ← Back to Digests
          </Link>
          <h1 className="font-serif text-3xl font-semibold text-[rgb(var(--text))] mb-2">
            Weekly Digest: {new Date(digest.week_start).toLocaleDateString()} - {new Date(digest.week_end).toLocaleDateString()}
          </h1>
          <p className="text-[rgb(var(--muted))]">
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

