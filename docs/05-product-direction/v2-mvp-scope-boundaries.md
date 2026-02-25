# v2 MVP Scope Boundaries

## Philosophy
v2 is an internal structural evolution, not a feature expansion.

The goal is to introduce:
- arcs
- phases
- pulses
- snapshot_state
- state_hash gating

without changing how users fundamentally interact with INDEX.

---

## IN SCOPE

### Structural Model
- arc detection
- phase inference
- tension threshold logic
- snapshot generation
- pulse generation

### Architecture
- new Supabase tables
- structureProcessor jobs
- integration with existing jobs pipeline

### Surfaces
- homepage structural snapshot
- project read structural context
- weekly digest rendering from snapshot_state

---

## OUT OF SCOPE

### Thinking Features
- chat interfaces
- prompts to users
- coaching or guidance
- decision recommendations

### Visualization
- graphs
- timelines
- node maps
- arc editing tools

### Workflow Changes
- new ingestion flows
- new project hierarchy
- manual grouping systems

---

## Guardrail Principle
If a feature changes HOW users think inside INDEX,
it does not belong in v2.