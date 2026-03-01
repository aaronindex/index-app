# INDEX v2 — Structural Checklist (Outreach-Ready)

Purpose:  
Track completion of the deterministic structural engine and the minimum viable product layer required for real alpha testing (beyond friends & family).

This is not a feature roadmap. It is a correctness + coherence checklist before public sharing.

---

## PHASE 0 — ENVIRONMENT RESET (v2)

- [x] New Supabase project created (index-dev)
- [x] Schema migrated to v2 database
- [x] develop branch created
- [x] Vercel project (index-dev) configured
- [x] Environment variables updated for v2
- [x] snapshot_state table exists and active

---

## PHASE 1 — STRUCTURAL ENGINE FOUNDATION

- [x] Thinking-time–based deterministic signal layer
- [x] Arc segmentation (stable_key-based)
- [x] Phase segmentation (stable_key-based)
- [x] Deterministic structural payload normalization
- [x] state_hash computation (sorted keys + bucketed timestamps)
- [x] Snapshot gating (write only when hash changes)
- [x] Minimal pulse creation (no anticipatory signals)
- [x] structure_jobs queue implemented
- [x] Cron processor active
- [x] Auto-dispatch on ingestion + decision changes
- [x] Structural boundary defined  
      (ingestion → inference → state_hash → boundary → snapshot)

Rules:

- No client-side inference
- No structural recompute from UI
- No raw capture content used in structural state

---

## PHASE 2 — CANONICAL CAPTURE LAYER

- [x] POST /api/capture implemented
- [x] Container placement required ("me" | "project")
- [x] Thinking-time default + coarse override
- [x] Durable mode supported
- [x] Reduce & Discard Source mode supported
- [x] dispatchStructureRecompute on capture
- [x] No inference modifications introduced

### Reduction Reliability

- [x] ReductionDiagnostics implemented
- [x] Zero-result outcomes non-silent
- [x] Role normalization deterministic
- [x] Filter/drop reason codes recorded
- [x] Discard-after-reduce confirms source removal
- [x] Dev-only reduction logs (no raw content)

---

## PHASE 3 — STRUCTURAL SURFACES (BOUNDARY ONLY)

### Engine-Level Surfaces

- [x] Direction derivable from snapshot_state payload (global scope)
- [x] Direction derivable from snapshot_state payload (project scope)
- [x] Shifts derivable from snapshot diff
- [x] Timeline derivable from structural events
- [x] Thinking-time ordering enforced

### UI Integrity

- [x] No arc/phase UI
- [x] No state_hash shown
- [x] No density labels exposed
- [x] No structural debug cards rendered
- [x] No structural Timeline debug surface
- [x] No internal vocabulary leaked

Vocabulary Guard (dev-only):

- [x] Forbidden token assertion  
      /(arc|phase|pulse|stable|state_hash|hash|tension|density|inference|job|recompute)/i

---

## PHASE 4 — STRUCTURAL BOUNDARY EXPORT

- [x] GET /api/capsule (global scope)
- [x] GET /api/capsule?scope=project&project_id=<id>
- [x] Ownership validation enforced
- [x] Missing snapshot returns null payload
- [x] Cache-Control: no-store
- [x] No inference triggered
- [x] No structural mutation

Capsule returns ONLY:

{
  state_hash,
  state_payload
}

---

## PHASE 5 — "ME" CONTAINER (ENGINE SUPPORT)

- [x] Capture supports container="me"
- [x] /me route implemented
- [x] Me structural payload derivable
- [x] Me timeline filtered + thinking-time ordered
- [x] No raw capture content rendered
- [x] No structural mechanics exposed

---

## PHASE 6 — HARDENING & GUARDRAILS

- [x] Snapshot monotonicity assertion
- [x] Deterministic ordering assertion in structural payload
- [x] Idempotency verification for recompute dispatch
- [x] structure_jobs stuck job detection + visibility
- [x] Dev-only structural diagnostics endpoint
- [ ] Optional CI-level forbidden vocabulary scan

---

# PROMOTED TO v2 COMPLETE (Before LinkedIn Outreach)

## Capture While In Flow

- [ ] Browser Extension (Quick Capture)
    - Highlight → Save → Assign/Unassigned → Done
    - No reduction in extension
    - Triggers structural recompute
    - Reuses existing auth session

- [ ] Structural recompute confirmed on quick capture
    - No inference added
    - No auto-reduction

---

## Accumulation Visibility

- [x] Track captures_since_last_reduce (per project)
- [x] Display subdued line:
      “X new captures since last reduce”
- [x] Inline [Reduce] link
- [x] Counter resets on successful Reduce
- [x] No badges / no urgency styling

**Implementation note:** Per-project line rendered server-side in `app/projects/[id]/page.tsx`; count from conversations (source=capture, created_at > last_reduce_at). Reset in `app/api/insights/extract/route.ts` and `lib/capture/createCapture.ts` after successful Reduce only; not updated for container=me or on failure. Migration: `supabase/migrations/20260226180000_add_projects_last_reduce_at.sql`.

---

## Reduce Flow Integrity

- [ ] Reduce clearly visible in assigned conversations
- [ ] Disabled state clear for Unassigned
- [ ] Reduce result visibly changes project state
- [ ] No confusion about where outcomes appear

---

## Task Integrity

- [ ] Completed tasks disappear from Read surfaces
- [ ] No stacking of closed tasks
- [ ] Still Unfolding and Next Motion do not duplicate

---

## UI Polish (Minimal, Calm)

- [ ] Soften Open loop visual intensity
- [ ] Confirm Blocker/Open Loop badges are subdued
- [ ] Minimal orientation copy on Home
- [ ] Clean logged-out landing page (clarity > marketing)

---

# PHASE 7 — ALPHA VALIDATION

- [ ] 3–5 external users ingest real thinking
- [ ] Validate reduction reliability under real inputs
- [ ] Validate discard-after-reduce safety
- [ ] Validate snapshot calmness (no oscillation)
- [ ] Validate accumulation indicator clarity
- [ ] No new inference added before alpha validation

---

# DEFINITION OF v2 OUTREACH-READY

Capture →
Quick Capture →
Accumulate →
Reduce →
Durable outcomes →
Structure recompute →
Snapshot commit →
Accumulation visible →
Capsule export

- Deterministic
- Calm
- No inference drift
- No vocabulary leaks
- No visible internal mechanics

---

# OUT OF SCOPE (FOR NOW)

- New inference stages
- Theme maps / visualizations
- Chat surfaces
- Narrative exports
- Optimization passes
- Performance tuning beyond correctness
- PWA capture
- Gamification / notifications
- Distribution funnels