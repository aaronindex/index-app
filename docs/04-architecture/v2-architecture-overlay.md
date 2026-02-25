# INDEX v2 — Architecture Overlay (Derived → Materialized)

## Goal
Introduce arcs/phases/tension as a structural layer on top of the existing INDEX system
without changing user mental model (projects, Ask, digest).

Arcs/phases should feel first-class in presentation
but remain inference-driven and fluid.

---

## Core Principle: Derived, Materialized, Re-derivable

### Derived
Arcs/phases originate from:
- decisions
- results
- message chunks / highlights
- temporal density
- cross-project linkage

### Materialized
We store the current inferred state so:
- UI is fast
- snapshots are stable
- pulses can be emitted deterministically
- weekly digest can reference a known state

### Re-derivable
At any time:
- re-run inference from the ledger
- update inferred state
- preserve historical state transitions

No manual arc creation.

---

## Existing Spine (Assumed)
- Supabase auth (magic link)
- Profiles table + user metadata
- Projects as ingestion containers
- Messages / message_chunks / embeddings
- Ask Index as retrieval lens
- Weekly digest generation
- Pro tier via Stripe

This overlay adds structure without breaking these.

---

## New Entities (Minimal Set)

### 1) arc
Represents a currently inferred temporal structure.

Fields (conceptual):
- id
- user_id (INDEX) or org_id (org platform later)
- status: active | compressed
- created_at
- updated_at
- last_signal_at (recency anchor)
- title (optional, system-generated; may be hidden)
- summary (short; editorial)
- confidence_score (internal)
- scope: personal | project_spanning

Notes:
- arc is NOT user-authored.
- title can be internal-only to avoid cringe risk.

---

### 2) arc_project_link
Maps arcs to projects without hierarchy.

Fields:
- arc_id
- project_id
- link_strength (internal)
- first_linked_at
- last_linked_at

---

### 3) phase
Represents inferred segments inside an arc.

Fields:
- id
- arc_id
- phase_index (0..n)
- started_at
- last_signal_at
- status: active | dormant
- summary (short, editorial)
- confidence_score (internal)

Notes:
- phases are inferred; no user-visible lifecycle control.

---

### 4) pulse
Represents a threshold crossing event.

Fields:
- id
- user_id / org_id
- occurred_at
- pulse_type: tension | arc_shift | threshold_crossing
- scope: project | global
- arc_ids (array or join table)
- project_id (nullable)
- headline (editorial)
- state_hash (see below)

Rules:
- equal “weight” in tone
- ordered by recency / density

---

### 5) snapshot_state
Represents the current briefing lens.

Fields:
- id
- user_id / org_id
- scope: global | project
- project_id (nullable)
- generated_at
- state_hash (deterministic)
- snapshot_text (editorial)
- field_note_text (editorial)
- active_arc_ids
- active_pulse_ids

Rules:
- snapshot only updates on state change (hash change)
- quietly evolves to match reality
- may reorganize language when state changes

---

## State Hashing (Stability Without Ever-Shifting)
To enforce: "snapshot changes only when underlying state changes"

Compute:
state_hash = hash(
  active_arc_ids + their last_signal_at + phase statuses +
  active_tension_edges (if any) +
  pulses since last snapshot window cutoff
)

If state_hash unchanged:
- do not regenerate snapshot text
- do not replace snapshot_state

If changed:
- generate new snapshot_state
- optionally emit low-key "snapshot updated" only when required (rare)

---

## Where It Attaches to Existing Data

### Source signals (inputs)
- decisions (first-class signal)
- results (feedback signal)
- message_chunks / highlights (context)
- timestamps (temporal density)
- project_id (container)

### Outputs (new layer)
- arcs link across projects
- phases exist within arcs
- pulses emitted when thresholds crossed
- snapshots generated per scope

---

## UI Placement Mapping (per your rule)

### Project Read (Project-Level)
Reads:
- snapshot_state where scope=project, project_id = current
- pulses where scope=project, project_id = current
- arcs linked via arc_project_link

Shows:
- local pulses (if any)
- local field note (single)
- arc indicators (editorial, no graphs)

### Logged-in Homepage (Global-Level)
Reads:
- snapshot_state where scope=global
- pulses where scope=global
- active arcs where scope=project_spanning

Shows:
- meta arcs
- tensions (via pulses)
- single shared field note
- evolving snapshot

### Weekly Digest (Temporal)
Reads:
- latest snapshot_state global
- pulses since last digest
- arc movement since last digest

Shows:
- condensed structural checkpoint
- not a recap of everything

---

## Ask Index Relationship (No Change in Role)
Ask Index remains a retrieval lens.

It may optionally:
- include arc context as retrieval filters
- cite relevant decisions/results linked to active arcs

But Ask Index is NOT where arcs are managed or explored.
No "resume thinking" inside INDEX.

---

## Tension Model (Edge Representation)
Tension is not a permanent object until threshold.

Internally:
- compute candidate tension edges between arcs/phases
- store only when threshold crosses as a pulse (pulse_type=tension)
Optionally store:
- tension_edge table for internal scoring (not required for v1)

---

## Why This Hybrid Works

- Arcs/phases remain fluid because they are always re-derivable.
- They feel first-class because they are materialized for stability + UI.
- Snapshots don’t churn because state_hash gates regeneration.
- Reactivation occurs naturally when new signals change linkage and state_hash.
- No manual grouping required; arcs create relationship above projects.