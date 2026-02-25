# Pulse Generation Rules — Builder Logic

## Purpose
Pulses are the only “event” objects surfaced to users.
They fire only on threshold crossings (no anticipation).

Pulse headlines are editorial.
Pulses are equal weight in tone.
Ordering is by recency / density.

---

## Pulse Types

1) TENSION_CROSSED
Structural friction exceeded threshold between arcs/phases.

2) ARC_SHIFT
Arc configuration changed materially (activation/compression/reactivation).

3) STRUCTURAL_THRESHOLD
Non-tension threshold crossing (e.g., decision density spike)
that changes snapshot state.

---

## Pulse Preconditions (General)
A pulse may be emitted only if:
- state_hash changes
AND
- the change is attributable to a threshold rule (not “better wording”)

If state_hash unchanged:
- no pulse
- no snapshot update

---

## TENSION_CROSSED Rule

Create TENSION_CROSSED when:
- friction_score(arc_a, arc_b) >= T_threshold
AND
- arcs are concurrently active OR overlapping in a defined window

friction_score inputs may include:
- opposing momentum (cadence divergence)
- contradictory result signals
- shared resource signals (if available)
- semantic proximity + divergent trajectories

Store:
- arc_ids involved
- occurred_at
- scope: global if cross-project; project if confined

---

## ARC_SHIFT Rule

Create ARC_SHIFT when any of these occur:
- arc activates (compressed → active OR new derived arc becomes active)
- arc compresses (active → compressed) AND it changes visible structure
- arc reactivates (compressed → active)

ARC_SHIFT should be conservative:
- avoid spamming pulses for minor changes
- prefer bundling multiple arc shifts into a single structural moment
  (single shared field note)

---

## STRUCTURAL_THRESHOLD Rule

Create STRUCTURAL_THRESHOLD when:
- decision density crosses threshold within an arc
- result feedback materially diverges/converges
- phase boundary occurs AND affects snapshot interpretation

This pulse is used sparingly.
If it doesn’t materially change the briefing, do not emit.

---

## Bundling Rules (Structural Moment)

If multiple pulses occur within a short bundling window (e.g., same run / same hour):
- emit multiple pulse headlines (equal weight, ordered)
- generate ONE shared field note
- generate ONE snapshot_state update

---

## Tone Rules (Hard)
Pulse headline must be:
- descriptive
- neutral
- non-prescriptive

Never:
- suggest action
- describe psychology
- assign blame
- imply urgency

---

## Visibility Rules
Project pulses surface only on project read.
Global pulses surface on logged-in LP and weekly digest (condensed).