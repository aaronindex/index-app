# Cursor Prompt Template — INDEX v2

## Context
INDEX v2 introduces structural inference (arcs/phases/pulses/snapshot_state)
into an existing Next.js + Supabase codebase.

We are implementing incrementally.

Do NOT introduce new UX paradigms or coaching behavior.

---

## Goal
[Single focused implementation goal]

Example:
Create arcs/phases/pulses/snapshot_state tables and migrations.

---

## Files to Modify / Create

Create:
- lib/structure/structureProcessor.ts
- supabase/migrations/xxxx_v2_structure_tables.sql

Modify:
- types/supabase.ts (generated types)
- lib/jobs/importProcessor.ts (dispatch hook)

---

## Constraints

- Must be idempotent
- Must use existing jobs table
- Must not change ingestion pipeline behavior
- No UI changes

---

## Acceptance Criteria

- New tables exist
- Processor compiles
- Job dispatch works
- No snapshot written if state_hash unchanged

---

## Quick Test Plan

1. Insert test decision
2. Trigger structure_infer_project job
3. Verify arc row created
4. Verify snapshot_state inserted
5. Trigger job again → no duplicate snapshot