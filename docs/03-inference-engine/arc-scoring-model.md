# Arc Scoring Model — Builder Logic

## Purpose
Compute arc existence + linkage strength from ledger events
(decisions/results/messages) without manual grouping.

Arcs are derived, materialized, and re-derivable.

---

## Inputs (Event Types)

### Primary (High Weight)
- decision
- result (attached to decision)

### Secondary (Medium Weight)
- highlight / extracted atomic item (if you have it)
- message_chunk embeddings similarity (topic coherence)

### Tertiary (Low Weight)
- raw message activity
- project activity without decision/result

---

## Feature Signals

### Temporal Density
- event_count in rolling window (e.g., 7d / 14d / 30d)
- decision cadence (decisions per window)
- result cadence (results per window)

### Topic Coherence
- embedding similarity between events
- repeated key phrases / entities
- stable semantic centroid over time

### Cross-Project Linkage
- events in multiple projects with high topic coherence
- shared decision lineage (decision → follow-on decision)
- recurrence: topic resurfaces after dormancy

### Reinforcement
- results confirm direction of decisions (convergence)
- repeated decisions within same semantic cluster

---

## Link Strength (arc ↔ project)

Compute link_strength(arc, project) from:
- proportion of arc events in project
- recency-weighted event density
- decision/result concentration

Suggested form (conceptual):
link_strength = w1*density + w2*decision_weight + w3*recency + w4*coherence

Store in arc_project_link.link_strength.

---

## Arc Activation Criteria

An arc becomes ACTIVE when:
- topic coherence exceeds threshold C
AND
- structural density exceeds baseline B
AND
- minimum count of primary events met (decisions >= D_min OR decision+result >= DR_min)

Notes:
- baseline can be user-specific (adaptive) or global default initially.
- activation should be silent (no “new arc created” messaging).

---

## Arc Compression Criteria

An arc becomes COMPRESSED when:
- no primary events within window W_inactive
AND
- density falls below compression threshold

Compression affects presence only (visibility).
Arc persists as materialized object.

---

## Arc Reactivation Criteria

An arc returns to ACTIVE when:
- new primary events occur within window W_reactivate
AND
- topic coherence reconnects to prior arc centroid
OR
- linkage strength rises across multiple projects

Reactivation is not explicitly announced.
It simply reappears in snapshots.

---

## Safety / Anti-Noise Rules

- Never form arcs from tertiary-only signals.
- Require decisions to anchor any arc that can surface globally.
- Allow exploratory arcs (no tension) but keep them quiet unless thresholds occur elsewhere.