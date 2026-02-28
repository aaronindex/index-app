import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/getUser";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import MagicHomeScreen from "@/app/components/MagicHomeScreen";
import { loadHomeView } from "@/lib/ui-data/home.load";
import { projectDirection, projectShifts } from "@/lib/structure/projection";
import { assertNoForbiddenVocabulary } from "@/lib/ui/guardrails/vocabulary";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Home | INDEX",
  description: "Your personal business intelligence dashboard",
};

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  const supabase = await getSupabaseServerClient();
  const structuralData = await loadHomeView({
    supabaseClient: supabase,
    user_id: user.id,
  });

  const payload = structuralData.latestSnapshot?.state_payload ?? null;
  const direction = payload ? projectDirection(payload) : null;
  const shifts = payload
    ? projectShifts(structuralData.prevSnapshotPayload, payload)
    : { hasShift: false, shiftTypes: [] };

  // Dev-only vocabulary guardrail on labels we control
  assertNoForbiddenVocabulary(
    [
      "Structural State",
      "Direction",
      "Shifts",
      "Containers",
      "Direction units",
      "Pace",
      "Last structural change",
    ],
    "HomePage"
  );

  return (
    <main className="min-h-screen bg-[rgb(var(--bg))]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[rgb(var(--text))]">
              Structural State
            </h2>
            <Link
              href="/me"
              className="text-sm text-[rgb(var(--muted))] hover:text-[rgb(var(--text))] transition-colors"
            >
              Me
            </Link>
          </div>

          {direction !== null && (
            <div className="p-4 rounded-lg bg-[rgb(var(--surface))] border border-[rgb(var(--ring)/0.08)]">
              <div className="text-sm font-medium text-[rgb(var(--text))] mb-2">
                Direction
              </div>
              <div className="text-xs text-[rgb(var(--muted))] space-y-1">
                <p>Containers: {direction.activeContainers}</p>
                <p>Direction units: {direction.activeDirectionUnits}</p>
                <p>Pace: {direction.densityLevel}</p>
                {direction.lastStructuralChangeAt && (
                  <p>
                    Last structural change:{" "}
                    {new Date(
                      direction.lastStructuralChangeAt
                    ).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="p-4 rounded-lg bg-[rgb(var(--surface))] border border-[rgb(var(--ring)/0.08)]">
            <div className="text-sm font-medium text-[rgb(var(--text))] mb-2">
              Shifts
            </div>
            {shifts.hasShift ? (
              <div className="text-xs text-[rgb(var(--muted))]">
                {shifts.shiftTypes.join(", ")}
              </div>
            ) : (
              <div className="text-xs text-[rgb(var(--muted))]">
                No recent shifts
              </div>
            )}
          </div>
        </div>

        <MagicHomeScreen />
      </div>
    </main>
  );
}

