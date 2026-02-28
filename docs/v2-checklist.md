# INDEX v2 — Structural Checklist

Purpose:
Track completion of the deterministic structural engine and its boundary surfaces.
This is not a feature roadmap. It is a falsifiable integrity checklist.

==================================================
PHASE 0 — ENVIRONMENT RESET (v2)
==================================================

[x] New Supabase project created (index-dev)
[x] Schema migrated to v2 database
[x] develop branch created
[x] Vercel project (index-dev) configured
[x] Environment variables updated for v2
[x] Snapshot_state table exists and active

==================================================
PHASE 1 — STRUCTURAL ENGINE FOUNDATION
==================================================

[x] Thinking-time–based deterministic signal layer
[x] Arc segmentation (stable_key-based)
[x] Phase segmentation (stable_key-based)
[x] Deterministic structural payload normalization
[x] state_hash computation (sorted keys + bucketed timestamps)
[x] Snapshot gating (write only when hash changes)
[x] Minimal pulse creation (no anticipatory signals)
[x] structure_jobs queue implemented
[x] Cron processor active
[x] Auto-dispatch on ingestion + decision changes
[x] Structural boundary defined (ingestion → inference → state_hash → boundary → snapshot)

Rules:
- No client-side inference
- No structural recompute from UI
- No raw capture content used in structural state

==================================================
PHASE 2 — CANONICAL CAPTURE LAYER
==================================================

[x] POST /api/capture implemented
[x] Container placement required ("me" | "project")
[x] Thinking-time default + coarse override
[x] Durable mode supported
[x] Reduce & Discard Source mode supported
[x] dispatchStructureRecompute on capture
[x] No inference modifications introduced

Reduction Reliability:

[x] ReductionDiagnostics implemented
[x] Zero-result outcomes non-silent
[x] Role normalization deterministic
[x] Filter/drop reason codes recorded
[x] Discard-after-reduce confirms source removal
[x] Dev-only reduction logs (no raw content)

==================================================
PHASE 3 — STRUCTURAL SURFACES
==================================================

Home:

[x] Direction rendered from snapshot_state payload
[x] Shifts rendered from snapshot diff
[x] Timeline uses external-safe labels
[x] Thinking-time ordering enforced
[x] No hash shown
[x] No density label (replaced by Pace)
[x] No job/recompute controls visible

Project:

[x] Arc/phase UI removed
[x] Direction derived from snapshot_state (project scope)
[x] Shifts derived from snapshot diff (project scope)
[x] Timeline external-safe + thinking-time ordered
[x] No internal mechanics leaked

Vocabulary Guard:

[x] Forbidden token assertion in dev mode
    /(arc|phase|pulse|stable|state_hash|hash|tension|density|inference|job|recompute)/i

==================================================
PHASE 4 — STRUCTURAL BOUNDARY EXPORT
==================================================

[x] GET /api/capsule (global scope)
[x] GET /api/capsule?scope=project&project_id=<id>
[x] Ownership validation enforced
[x] Missing snapshot returns null payload
[x] Cache-Control: no-store
[x] No inference triggered
[x] No structural mutation

Capsule returns ONLY:
{
  state_hash,
  state_payload
}

==================================================
PHASE 5 — "ME" CONTAINER
==================================================

[x] Capture supports container="me"
[x] /me route implemented
[x] Me Direction derived from structural payload
[x] Me Shifts derived from structural payload
[x] Me timeline filtered + thinking-time ordered
[x] No raw capture content rendered
[x] No structural mechanics exposed

==================================================
PHASE 6 — HARDENING & GUARDRAILS
==================================================

[x] Snapshot monotonicity assertion (latest always by generated_at)
[x] Deterministic ordering assertion in structural payload
[x] Idempotency verification for recompute dispatch
[x] structure_jobs stuck job detection + visibility
[x] Dev-only structural diagnostics endpoint (internal)
[ ] Optional CI-level forbidden vocabulary scan

==================================================
PHASE 7 — ALPHA VALIDATION
==================================================

[ ] 3–5 real users ingest real thinking
[ ] Validate reduction reliability under real inputs
[ ] Validate discard-after-reduce safety
[ ] Validate snapshot calmness (no oscillation)
[ ] Validate Direction readability
[ ] Validate Shifts only occur on true structural change
[ ] No new inference added before alpha validation

==================================================
DEFINITION OF "v2 FIRST-PASS COMPLETE"
==================================================

Capture →
Reduce →
Durable outcomes →
Structure recompute →
Snapshot commit →
Direction/Shifts surfaces →
Capsule export →

All deterministic.
All read-only outside boundary.
No structural mutation from UI.
No vocabulary leaks.

==================================================
OUT OF SCOPE (FOR NOW)
==================================================

- New inference stages
- Theme maps / visualizations
- Chat surfaces
- Narrative exports
- Optimization passes
- Performance tuning beyond correctness