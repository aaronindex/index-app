# State Hash Model — Builder Logic

## Purpose
Ensure snapshots and pulses update ONLY when structural reality changes.

Prevents:
- ever-shifting editorial text
- noisy updates
- unstable UI

State hash is the single source of truth for:
- snapshot regeneration
- pulse emission
- digest updates

---

## Concept

state_hash = deterministic fingerprint of current structural state

If hash unchanged:
- do nothing

If hash changes:
- generate new snapshot_state
- emit pulses (if threshold crossed)

---

## Inputs to Hash

### Arc Layer
- active_arc_ids
- arc.last_signal_at
- arc.status (active/compressed)

### Phase Layer
- active_phase_ids
- phase.last_signal_at
- phase.status

### Tension Layer
- active_tension_edges (internal representation)
- friction_score buckets (rounded)

### Pulse Layer
- pulse types generated during current inference cycle

### Structural Density Signals
- decision_density_bucket
- result_density_bucket

---

## Normalization Rules

To avoid hash churn:

- round timestamps to window bucket (e.g. hour)
- round scores to 2 decimals
- sort all arrays before hashing
- exclude editorial text from hash inputs

Hash must represent STRUCTURE ONLY.

---

## Hash Generation (Pseudo)

state_payload = {
  active_arcs: [...],
  arc_statuses: {...},
  phase_statuses: {...},
  tension_edges: [...],
  density_buckets: {...}
}

state_hash = sha256(JSON.stringify(state_payload))

---

## Snapshot Update Logic

IF state_hash == latest_snapshot.state_hash:
  - skip generation
  - skip pulses
ELSE:
  - run snapshot_generation_prompt
  - store new snapshot_state
  - attach pulses

---

## Bundling Window

Multiple structural changes within same run:
- produce ONE snapshot_state
- multiple pulse headlines allowed
- ONE shared field note

---

## Why This Matters

State hash enforces:

calmness
editorial credibility
temporal stability

Snapshots evolve only when reality evolves.