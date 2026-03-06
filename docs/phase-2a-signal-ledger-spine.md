# Phase 2a Signal Ledger Spine

## Purpose

Normalize INDEX's signal lifecycle across the existing separate tables:

- decisions
- tasks
- highlights
- project_outcome

without unifying them into a single signals table.

Phase 2a introduces the minimum ledger spine required for v2:

- lifecycle normalization
- supersession support
- consistent active/default filtering

This phase does NOT introduce:
- signal unification
- signal strength
- tension detection
- Direction logic expansion
- history-heavy UI

---

## Current state

### decisions
Current lifecycle mechanism:
- `is_inactive = true` is effectively "resolved"

### tasks
Current lifecycle mechanism:
- `status` already exists
- resolved states are `complete` and `cancelled`

### highlights
- no lifecycle fields
- currently lightweight and source-bound

### project_outcome
- append-only
- already acts like a `result` signal

---

## Phase 2a goals

### Must ship
1. Normalize decision lifecycle to explicit `status`
2. Preserve task lifecycle but align it conceptually to ledger states
3. Add supersession support for decisions and tasks
4. Keep highlights as lightweight for now
5. Keep results append-only
6. Ensure all "current" read surfaces filter to active structure

---

## Table-by-table changes

### decisions

Add:
- `status TEXT NOT NULL DEFAULT 'active'`
- `superseded_by_decision_id UUID NULL`
- `closed_at TIMESTAMPTZ NULL`
- `origin TEXT NOT NULL DEFAULT 'system'`

Backfill:
- `is_inactive = true` → `status = 'closed'`
- `is_inactive = false` → `status = 'active'`

Keep `is_inactive` temporarily for compatibility if needed, but treat `status` as canonical.

Allowed statuses:
- `active`
- `closed`
- `superseded`
- `invalidated`

---

### tasks

Keep existing `status`, but map it to ledger semantics.

Ledger interpretation:
- `open`, `in_progress`, `priority`, `dormant` → active
- `complete`, `cancelled` → closed

Add:
- `superseded_by_task_id UUID NULL`
- `origin TEXT NOT NULL DEFAULT 'system'`
- `attributes JSONB NULL` (or equivalent lightweight field)

Task attributes may include:
- `loop`
- `blocker`
- `commitment`

These are NOT types.
They are task attributes.

No additional task status expansion required in Phase 2a.

---

### highlights

Do not add lifecycle in Phase 2a unless trivial.

Add only if low-cost:
- `origin TEXT NOT NULL DEFAULT 'system'`

Keep highlights source-bound for now.
Do not rename to "insight" yet.

---

### project_outcome

Treat as append-only results.

Optional:
- add `origin TEXT NOT NULL DEFAULT 'user'`

Do not add lifecycle yet.
Do not add supersession.

---

## Lifecycle actions

### Resolve
- decisions: `status = 'closed'`
- tasks: existing `status = complete/cancelled`

### Invalidate
- decisions: `status = 'invalidated'`
- tasks: optional later, out of scope unless trivial

### Supersede
- decisions:
  - old.status = `superseded`
  - old.superseded_by_decision_id = new.id
- tasks:
  - old.superseded_by_task_id = new.id
  - old.status remains mapped appropriately or new dedicated value if trivial

Supersession should preserve lineage but stay minimal in UI.

---

## Read surface rules

Default current-state surfaces must only show active structure.

### Project > Read
- decisions: `status = 'active'`
- tasks: exclude `complete` and `cancelled`

### Home / Direction inputs
Do NOT expand signal collection yet.
Keep current logic stable.
Only ensure decisions use `status = 'active'` instead of `is_inactive = false` once migration is complete.

### Sources
No change.

---

## UI scope (Phase 2a)

Minimal actions only.

### decisions
Add:
- Resolve
- Invalidate
- Supersede

### tasks
Keep:
- existing status updates
Optional later:
- supersede

Do not build a full history UI now.

---

## Important non-goals

Do NOT:
- unify tables
- add a global Signals feed query yet
- change Direction weighting
- move highlights out of source view
- automate result closure behavior
- build tension UI

---

## Why this phase comes before onboarding/nav polish

Phase 2a stabilizes the ontology enough that later UX changes become durable:

- Rename "Reduce" → "Distill signals"
- Consolidate nav to Read / Signals / Sources
- Update onboarding to reflect signal model

Without this phase, those changes would be built on top of inconsistent lifecycle semantics.
