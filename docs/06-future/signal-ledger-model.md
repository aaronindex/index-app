# INDEX Signal Ledger Model

## Overview

INDEX stores reduced insights as **signals**.

Signals represent structural consequences of thinking:
- decisions
- tasks
- highlights
- open questions
- outcomes

Signals form a **ledger**, not a note system.

Signals are never edited retroactively.  
Instead they evolve through **lifecycle events** (resolve, supersede, invalidate).

This preserves structural truth over time.

---

# Signal Types

Signals extracted during reduction currently include:

- Decision
- Task
- Highlight
- Loop
- Result

These represent the structural consequences of thinking.

---

# Task Subtypes

During reduction, tasks may be tagged as:

- Open Loop
- Commitment
- Blocker

These represent different structural states of work.

### Open Loop
An unresolved question or unfinished thread of thinking.

Example:
"Should weekly logs remain part of the system?"

Open loops create **structural tension** until resolved.

---

### Commitment
An explicit promise to complete work.

Example:
"Rewrite onboarding flow."

Commitments represent **intentional forward motion**.

---

### Blocker
Something preventing forward progress.

Example:
"Pricing copy needs revision before launch."

Blockers create **structural tension** and often stall commitments.

---

# Signal Lifecycle

Signals evolve through a small number of states.

## Status


active
closed
superseded
invalidated


---

### Active
Signal is structurally relevant.

Example:
Decision: Launch INDEX Pro at $30/month

---

### Closed
Signal naturally completed.

Examples:
- task resolved
- loop answered
- commitment fulfilled

Closed signals remain in history but no longer influence structure.

---

### Superseded
Signal replaced by another signal.

Example:

Decision:
Offer JSON imports

Superseded by:

Decision:
Quick paste imports only

Superseded signals remain visible for lineage.

---

### Invalidated

Signal turned out to be incorrect or irrelevant.

Example:

Decision:
Charge $15/month

Invalidated after pricing review.

Invalidated signals remain historically visible.

---

# Signal Strength

Signals may optionally have strength.


tentative
confirmed


Default: tentative.

Confirmed signals represent stronger structural commitment.

Example:

Decision: Launch INDEX Pro

Tentative → Confirmed after implementation planning.

Signal strength influences:

- Direction
- Arc formation
- Timeline weighting

---

# Result Signals

A **Result** records a meaningful outcome.

Example:

Result:
INDEX Pro launched
Feb 10

Results often:

- confirm decisions
- close loops
- resolve commitments
- mark milestones

Results represent **structural completion events**.

---

# Timeline Events

Structural timeline marks meaningful changes.

Events include:

- signal created
- signal closed
- signal superseded
- result recorded

Timeline measures **spacing of structural change**.

This reveals:

- acceleration
- drift
- stagnation
- inflection points

---

# Ledger Integrity

Signals behave like an append-only ledger.

History is never rewritten.

Corrections create new state transitions:

- resolve
- supersede
- invalidate

This preserves the true sequence of thinking.

---

# Relationship to Direction

Direction emerges from active signals.

Direction considers:

- active decisions
- confirmed signals
- unresolved loops
- structural shifts over time

Direction is not authored.

It emerges from structure.

---

# Relationship to Tension

Structural tension emerges when signals conflict or remain unresolved.

Examples:

- loops remain open for long periods
- commitments blocked by blockers
- conflicting decisions exist simultaneously

Tension is not an alert system.

It is a **structural observation**.

Future versions of INDEX may surface tension signals when thresholds are crossed.

---

# Design Principle

INDEX does not attempt to capture everything.

It captures **signals that create downstream consequences**.

Reduction transforms thinking into structure.

Structure accumulates into trajectory.