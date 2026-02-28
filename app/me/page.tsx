// app/me/page.tsx
// Minimal Me container view: Direction, Shifts, Timeline (read-only, no inference)

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/getUser';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { loadMeView } from '@/lib/ui-data/me.load';
import { projectDirection, projectShifts } from '@/lib/structure/projection';
import { assertNoForbiddenVocabulary } from '@/lib/ui/guardrails/vocabulary';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Me | INDEX',
  description: 'Your personal direction, shifts, and timeline',
};

export const dynamic = 'force-dynamic';

export default async function MePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/');
  }

  const supabase = await getSupabaseServerClient();
  const structuralData = await loadMeView({
    supabaseClient: supabase,
    user_id: user.id,
  });

  const payload = structuralData.latestSnapshotPayload ?? null;
  const direction = payload ? projectDirection(payload) : null;
  const shifts = payload
    ? projectShifts(structuralData.prevSnapshotPayload, payload)
    : { hasShift: false, shiftTypes: [] };

  assertNoForbiddenVocabulary(
    [
      'Me',
      'Direction',
      'Shifts',
      'Timeline',
      'Decision recorded',
      'Result recorded',
      'Containers',
      'Direction units',
      'Pace',
      'Last structural change',
      'No recent shifts',
    ],
    'MePage'
  );

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
          <h1 className="font-serif text-3xl font-semibold text-[rgb(var(--text))] mt-4">
            Me
          </h1>
        </div>

        {/* Direction */}
        {direction !== null && (
          <div className="mb-6 p-4 rounded-lg bg-[rgb(var(--surface))] border border-[rgb(var(--ring)/0.08)]">
            <div className="text-sm font-medium text-[rgb(var(--text))] mb-2">
              Direction
            </div>
            <div className="text-xs text-[rgb(var(--muted))] space-y-1">
              <p>Containers: {direction.activeContainers}</p>
              <p>Direction units: {direction.activeDirectionUnits}</p>
              <p>Pace: {direction.densityLevel}</p>
              {direction.lastStructuralChangeAt && (
                <p>
                  Last structural change:{' '}
                  {new Date(
                    direction.lastStructuralChangeAt
                  ).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Shifts */}
        <div className="mb-6 p-4 rounded-lg bg-[rgb(var(--surface))] border border-[rgb(var(--ring)/0.08)]">
          <div className="text-sm font-medium text-[rgb(var(--text))] mb-2">
            Shifts
          </div>
          {shifts.hasShift ? (
            <div className="text-xs text-[rgb(var(--muted))]">
              {shifts.shiftTypes.join(', ')}
            </div>
          ) : (
            <div className="text-xs text-[rgb(var(--muted))]">
              No recent shifts
            </div>
          )}
        </div>

        {/* Timeline (Me-scoped, thinking-time ordered) */}
        {structuralData.timelineEvents.length > 0 && (
          <div className="p-4 rounded-lg bg-[rgb(var(--surface))] border border-[rgb(var(--ring)/0.08)]">
            <h3 className="text-sm font-semibold text-[rgb(var(--text))] mb-4">
              Timeline
            </h3>
            <div className="space-y-1">
              {structuralData.timelineEvents.map((event, idx) => (
                <div key={idx} className="text-xs text-[rgb(var(--muted))]">
                  <span className="font-medium">
                    {event.kind === 'decision'
                      ? 'Decision recorded'
                      : 'Result recorded'}
                  </span>
                  <span className="ml-2">
                    {new Date(event.occurred_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
