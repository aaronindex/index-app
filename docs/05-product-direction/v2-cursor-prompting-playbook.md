# v2 Cursor Prompting Playbook

## Purpose
Defines how implementation prompts are written so Cursor can move fast without drifting from INDEX’s structural philosophy.

INDEX v2 is NOT exploratory build work. It is staged execution against a defined ontology and architecture.

This playbook ensures prompts:
- remain narrow in scope
- preserve editorial stance
- avoid introducing thinking surfaces or coaching UX

---

## Core Rules

### 1. Structural First, UI Later
Implementation order:
1. Schema + data model
2. Inference engine scaffolding
3. Job pipeline integration
4. Snapshot/pulse persistence
5. Minimal surface wiring

UI complexity must NOT be introduced before structural persistence exists.

---

### 2. One Responsibility per Prompt
Each Cursor prompt should implement ONE of:
- schema change
- job integration
- processor logic
- editorial rendering
- surface wiring

Never mix multiple layers.

---

### 3. No Product Decisions Inside Code Prompts
Prompts must NOT:
- introduce new UX flows
- rename ontology primitives
- change editorial tone
- add “AI suggestions” or coaching behaviors

If a decision is required, stop and return to GPT for clarification.

---

### 4. Acceptance Criteria Required
Every prompt includes:
- files touched
- expected new files
- schema diffs
- success conditions
- manual test steps

Cursor should never guess completion state.

---

### 5. Maintain Determinism
Inference jobs must:
- be idempotent
- write only when state_hash changes
- avoid unnecessary updates

This preserves temporal stability and editorial trust.

---

## Prompt Structure

Each prompt should include:

- Context
- Goal
- Files to modify/create
- Constraints
- Acceptance Criteria
- Quick Test Plan

---

## Anti-Patterns (Do Not Allow)
- Adding chat interfaces
- Introducing graphs or visual maps
- Suggesting actions to users
- Generating narrative summaries beyond snapshot/pulse
- Creating manual arc editing interfaces

INDEX is a structural ledger, not a thinking surface.