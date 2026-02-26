import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/getUser";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import MagicHomeScreen from "@/app/components/MagicHomeScreen";
import { loadHomeView } from "@/lib/ui-data/home.load";
import { loadStructureJobHealth } from "@/lib/ui-data/jobHealth.load";
import ThinkingTimeResolve from "@/app/components/ThinkingTimeResolve";
import ProcessStructureJobsButton from "@/app/components/ProcessStructureJobsButton";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Home | INDEX",
  description: "Your personal business intelligence dashboard",
};

export default async function HomePage() {
  const user = await getCurrentUser();

  // Redirect to landing if not authenticated
  if (!user) {
    redirect('/');
  }

  const supabase = await getSupabaseServerClient();
  
  // Load structural state data
  const structuralData = await loadHomeView({
    supabaseClient: supabase,
    user_id: user.id,
  });

  // Load job health
  const jobHealth = await loadStructureJobHealth({
    supabaseClient: supabase,
    user_id: user.id,
  });

  return (
    <main className="min-h-screen bg-[rgb(var(--bg))]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Structural State Section */}
        <div className="mb-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[rgb(var(--text))]">Structural State</h2>
            <ProcessStructureJobsButton />
          </div>
          
          {/* Thinking Time Badge */}
          {jobHealth.thinkingTimeUnclear && (
            <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
              <div className="space-y-2">
                <div className="text-sm font-medium text-yellow-800 dark:text-yellow-400">
                  Thinking time unclear
                </div>
                <ThinkingTimeResolve conversationId={jobHealth.missing_conversation_id} />
              </div>
            </div>
          )}

          {/* Latest Snapshot */}
          {structuralData.latestSnapshot && (
            <div className="p-4 rounded-lg bg-[rgb(var(--surface))] border border-[rgb(var(--ring)/0.08)]">
              <div className="text-sm text-[rgb(var(--muted))] mb-2">
                Last snapshot: {new Date(structuralData.latestSnapshot.generated_at).toLocaleDateString()}
              </div>
              <div className="text-xs text-[rgb(var(--muted))] font-mono">
                Hash: {structuralData.latestSnapshot.state_hash.substring(0, 16)}...
              </div>
            </div>
          )}

          {/* Active Arcs */}
          <div className="p-4 rounded-lg bg-[rgb(var(--surface))] border border-[rgb(var(--ring)/0.08)]">
            <div className="text-sm font-medium text-[rgb(var(--text))] mb-2">
              Active Arcs ({structuralData.activeArcs.length})
            </div>
            {structuralData.activeArcs.length > 0 ? (
              <div className="space-y-2">
                {structuralData.activeArcs.slice(0, 5).map((arc) => (
                  <div key={arc.id} className="text-xs text-[rgb(var(--muted))]">
                    <span className="font-mono">{arc.id.substring(0, 8)}...</span>
                    <span className="ml-2">
                      {new Date(arc.last_signal_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-[rgb(var(--muted))]">No active arcs</div>
            )}
          </div>

          {/* Active Phases */}
          <div className="p-4 rounded-lg bg-[rgb(var(--surface))] border border-[rgb(var(--ring)/0.08)]">
            <div className="text-sm font-medium text-[rgb(var(--text))] mb-2">
              Active Phases ({structuralData.activePhases.length})
            </div>
            {structuralData.activePhases.length > 0 ? (
              <div className="space-y-2">
                {structuralData.activePhases.slice(0, 5).map((phase) => (
                  <div key={phase.id} className="text-xs text-[rgb(var(--muted))]">
                    <span className="font-mono">{phase.id.substring(0, 8)}...</span>
                    <span className="ml-2">
                      {new Date(phase.last_signal_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-[rgb(var(--muted))]">No active phases</div>
            )}
          </div>

          {/* Recent Pulses */}
          {structuralData.recentPulses.length > 0 && (
            <div className="p-4 rounded-lg bg-[rgb(var(--surface))] border border-[rgb(var(--ring)/0.08)]">
              <div className="text-sm font-medium text-[rgb(var(--text))] mb-2">
                Recent Pulses ({structuralData.recentPulses.length})
              </div>
              <div className="space-y-2">
                {structuralData.recentPulses.slice(0, 5).map((pulse) => (
                  <div key={pulse.id} className="text-xs text-[rgb(var(--muted))]">
                    <span className="font-medium">{pulse.type}</span>
                    <span className="ml-2">
                      {new Date(pulse.occurred_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <MagicHomeScreen />
      </div>
    </main>
  );
}

