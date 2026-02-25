# Phase Inference Rules — Builder Logic

## Purpose
Phases segment an arc over time.
Phases are inferred and materialized for stability.

No manual phase creation.
No phase naming required (optional internal labels only).

---

## Phase Boundaries (When a Phase Starts)

A new phase starts when one or more conditions cross threshold:

1) Structural Regime Change
- decision cadence changes materially (increase/decrease)
- result cadence changes materially
- new category of decisions appears (semantic shift)

2) Semantic Shift
- arc centroid shifts beyond threshold S
- new dominant entities/topics emerge

3) Outcome Shift
- results begin reinforcing vs contradicting recent decisions
- confidence trajectory changes (stabilizing vs destabilizing)

---

## Phase Continuation

A phase continues while:
- centroid remains within drift tolerance
- cadence remains within tolerance band
- no boundary condition crosses threshold

---

## Phase Dormancy

A phase becomes DORMANT when:
- no primary events in window W_phase_inactive
- arc may remain active overall (another phase can be active later)

---

## Phase Reactivation

A dormant phase may reactivate if:
- new events match its centroid more than current phase centroid
AND
- recency-weighted coherence exceeds threshold

If ambiguous:
- create a new phase rather than force-reactivating an older one.

---

## Phase Materialization Rules

Each phase stores:
- started_at (first qualifying event timestamp)
- last_signal_at (most recent qualifying event)
- summary (editorial, short)
- confidence_score (internal)

Phase summaries should be regenerated only on state_hash change
to avoid ever-shifting text.

---

## UX Guardrails

Phases should not be overly visible early.
They are primarily structural scaffolding supporting:
- snapshot accuracy
- tension detection
- compression/reactivation behavior