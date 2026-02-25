# Data Pipeline Jobs — Builder Logic

## Overview

Inference runs are event-driven + scheduled.

---

## Temporal Reference

Temporal behavior follows the ontology model defined in:

01-ontology/temporal-model.md

Inference stages operate on thinking time.
Ingestion timestamps are excluded from structural scoring.

Pipeline must feel:
- quiet
- deterministic
- non-chatty

---

## State Hash Invariant

Only persistent artifacts may influence state_hash.

Ephemeral inputs (e.g. Field Notes, previews, drafts)
must not alter structural scoring, snapshot_state, or pulses
until a user saves resulting structural objects.

---

## Job Types

### 1) On Ingestion Job
Trigger:
- new chat imported
- decision created
- result added
- timeframe edited on imported artifact

Steps:
1. update semantic signals
2. update arc scoring
3. evaluate phase boundaries
4. compute friction candidates
5. compute new state_hash
6. emit pulses if threshold crossed
7. update snapshot_state if hash changed

Debounce:
- queue inference with short delay (e.g. 30–60s)
to allow batching.


### Field Note Interpretation (Ephemeral)

Trigger:
- user submits Field Note within project context

Behavior:
- run structural interpretation against project signals
- propose up to two Decisions or Results

Important:
- Field Notes do NOT trigger ingestion_event
- Field Notes do NOT enter inference pipeline
- state_hash is unchanged until user saves outputs

Field Notes are pre-ingestion interpretation only.

---

### 2) Scheduled Stabilization Job

Frequency:
- nightly

Purpose:
- re-evaluate arc compression/reactivation
- recalc density windows
- catch slow structural drift

Steps:
same as On Ingestion Job but with broader window.

---

### 3) Weekly Digest Job

Trigger:
- weekly schedule
- OR manual regeneration

Steps:
1. fetch latest snapshot_state
2. fetch pulses since last digest
3. generate condensed editorial digest
4. store digest artifact

Digest must NOT recompute structure.

---

## Job Ordering

Inference Pipeline:

ingestion_event
→ arc scoring
→ phase inference
→ tension scoring
→ state_hash compute
→ snapshot generation (if changed)
→ pulse creation

Temporal Rule:

Inference stages operate on thinking_start_at / thinking_end_at.

ingested_at is used for system bookkeeping only.

---

## Performance Guardrails

- Arc scoring runs incrementally (only affected projects)
- Avoid full recompute unless nightly job
- Hash generation must be lightweight
- Snapshot generation async (background worker)

---

## Future Org Platform Note

Org platform adds:

- Slack ingestion job
- Email ingestion job
- Meeting transcript ingestion job

Pipeline architecture should allow new ingestion sources
without changing inference stages.