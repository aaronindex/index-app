# External Surface Contract — INDEX v2

## Purpose

Define how structural state may be exposed outside INDEX
without altering system behavior, editorial stance, or inference logic.

INDEX does not export content artifacts.
INDEX exposes structural reference state.

External surfaces exist to allow:

- human execution outside INDEX
- AI continuity across thinking environments
- future agent queries against decision precedent

INDEX remains a structural ledger.
External systems consume structure via pull-based access.

---

## Architectural Principle

Structure is exportable.
Editorial is internal.

Exportable:
- arcs
- phases
- decisions
- results
- temporal signals
- density buckets
- state_hash

Non-exportable:
- snapshot text
- pulse editorial copy
- field notes
- previews
- drafts

External interfaces must never depend on editorial language.

---

## Surface Types

### 1. Structural State Capsule

Purpose:
Portable representation of current structural reality.

Used for:
- Resume / Continuity prompts
- Cursor context injection
- AI working memory

Capsule represents the same structure used to compute state_hash.

Example Payload:

{
  state_hash,
  active_arcs: [...],
  active_phases: [...],
  recent_decisions: [...],
  recent_results: [...],
  tension_edges: [...],
  density_buckets: {...},
  temporal_span: {...}
}

Capsule generation occurs AFTER:

state_hash compute
AND BEFORE snapshot generation.

Capsule is deterministic.
Capsule must not trigger inference.

---

### 2. Structural Handoff Surface

Purpose:
Allow users to move from structure → action
without turning INDEX into an execution system.

Examples:

- Draft calendar entries from decisions
- Generate weekly structural brief
- Draft Slack or email summaries

Handoff outputs are ephemeral projections.

Rules:

- Handoff artifacts are not stored in structural tables.
- Handoff outputs never affect state_hash.
- Handoff logic reads structure but cannot mutate it.

Pipeline Position:

Triggered by user interaction only.
Not part of inference pipeline.

---

### 3. Ledger Query Interface (Agent Surface)

Purpose:
Allow external agents to reference structural precedent.

INDEX does not host agents.
INDEX provides deterministic structural state.

Example Endpoint (conceptual):

GET /ledger/project/{project_id}

Returns:

{
  state_hash,
  arcs: [...],
  phases: [...],
  decisions: [...],
  results: [...],
  temporal_signals: {...},
  density_signals: {...}
}

Rules:

- Query layer is read-only.
- No editorial text returned.
- No inference triggered by query.
- Queries must return normalized structural data.

Agents consume INDEX as a reference ledger,
not as an execution engine.

---

## Pipeline Boundary

External surfaces attach at a single architectural boundary:

ingestion_event
→ arc scoring
→ phase inference
→ tension scoring
→ state_hash compute
→ [external surface exposure allowed here]
→ snapshot generation
→ pulse creation

External exposure must never occur:

- during ingestion parsing
- during editorial generation
- during pulse emission

---

## Ingestion Surfaces

INDEX may receive structural input from multiple capture surfaces:

- In-app Quick Capture
- Browser extension (explicit send)
- Email forwarding
- Slack slash command

All surfaces produce a Capture Event.

Capture Events:

- are deliberate
- are user-triggered
- are one-way
- do not stream ambient content

Capture Events enter the inference pipeline at:

ingestion_event

No external surface may:

- modify structural tables directly
- bypass inference
- trigger editorial generation

All ingestion surfaces converge into the same structural boundary.

---

## Capture Capsule (Internal Contract)

All capture surfaces must produce:

{
  content,
  source,
  captured_at,
  thinking_time?,
  project_id?,
  inference_profile
}

Capture Capsule is internal only.
Raw content is never exportable.

Only structural outcomes cross the external boundary.

---

## Temporal Integrity

All exported data reflects thinking_time,
not ingestion_time.

External systems must not interpret ingestion timestamps
as structural signals.

---

## Stability Requirements

External payload must remain stable across releases.

Changes allowed:

- adding fields
- extending temporal metadata

Breaking changes not allowed:

- renaming core structural keys
- altering state_hash semantics

state_hash remains the authoritative fingerprint of structure.

---

## Why This Exists

INDEX is not a productivity tool.
INDEX is a structural nervous system.

External surfaces allow structure to travel
without turning INDEX into a thinking environment,
task manager, or automation platform.

Structure informs action.
INDEX does not perform action.
