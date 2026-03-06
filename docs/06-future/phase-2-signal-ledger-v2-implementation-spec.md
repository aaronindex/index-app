# docs/phase-2-signal-ledger-v2-implementation-spec.md

## Purpose

Ship the minimal “ledger spine” for INDEX v2 by introducing:
- `signal.status`
- `signal.superseded_by`

This enables clean state transitions (close / invalidate / supersede) without turning INDEX into an editing surface.

This spec explicitly avoids expansion (no automation, no tension logic, no deep history UX).

---

## Goals (Phase 2)

### Must ship
1) Add `signals.status` with minimal statuses
2) Add `signals.superseded_by_signal_id` to support supersession lineage
3) Map existing “resolved” behavior onto `status = closed`
4) Add “Invalidate” action
5) Add “Supersede” action (minimal UX)
6) Ensure all core read surfaces ignore non-active signals by default

### Must NOT ship (explicitly out of scope)
- Merge/reclassify UI
- Bulk operations
- Auto-supersession
- Auto-closing signals when results are recorded
- Tension detection
- Complex timeline/history UI (beyond a basic “Show history” toggle, optional)

---

## Core Concepts

### Signal immutability rule
Signals are never edited in place.
If a signal is wrong or outdated, we:
- invalidate it, or
- supersede it with a new signal.

This preserves ledger integrity and supports later INDEXorg needs.

### “Active structure” rule
All “current structure” surfaces (Direction, Snapshot, counts, queries) should only consider:
- `status = 'active'`

---

## Data Model Changes

### Table: `signals`

Add columns:

- `status TEXT NOT NULL DEFAULT 'active'`
- `superseded_by_signal_id UUID NULL` (FK to `signals.id`)
- `closed_at TIMESTAMPTZ NULL`

(If you already have `resolved_at` or similar, either reuse or migrate to `closed_at`.)

#### Status values (Phase 2)
- `active`
- `closed`
- `superseded`
- `invalidated`

Notes:
- `superseded` should always have `superseded_by_signal_id` set (best-effort invariant).
- `closed` and `invalidated` may set `closed_at`.
- `superseded` may also set `closed_at` (optional; consistent to set it).

### Migration SQL (example)

```sql
ALTER TABLE signals
  ADD COLUMN status TEXT NOT NULL DEFAULT 'active';

ALTER TABLE signals
  ADD COLUMN superseded_by_signal_id UUID NULL;

ALTER TABLE signals
  ADD COLUMN closed_at TIMESTAMPTZ NULL;

-- Optional FK if desired (can be deferred if it complicates backfills)
-- ALTER TABLE signals
--   ADD CONSTRAINT signals_superseded_by_fk
--   FOREIGN KEY (superseded_by_signal_id) REFERENCES signals(id);
Backfill / Compatibility
If legacy resolved boolean exists

Map resolved = true → status = 'closed'

Set closed_at if you have a timestamp; otherwise leave null or set to updated_at if available.

Backfill SQL (example):

UPDATE signals
SET status = 'closed'
WHERE resolved = true
  AND status = 'active';
If you already have “result” signals

No change required. They remain normal signals with type = 'result' and status = 'active'.

API / Query Contract Updates
Default filtering rule

Any API that returns “current” signals must filter:

status = 'active'

This includes:

Project > Read lists (decisions, tasks, loops, highlights)

Snapshot computation inputs

Direction computation inputs

Ask Index query scope (unless explicitly “include history”, out of scope)

Optional: History toggle support (nice-to-have, can defer)

If implemented, allow returning all statuses with a UI toggle.

User Actions and State Transitions
Action: Resolve

User intent: “This is done / no longer open.”

Transition:

status = 'closed'

closed_at = now()

This replaces or mirrors any existing resolved behavior.

Action: Invalidate

User intent: “This was wrong / irrelevant / shouldn’t count.”

Transition:

status = 'invalidated'

closed_at = now()

Invalidate removes a signal from active structure without replacing it.

Action: Supersede

User intent: “This has been replaced by a newer, correct signal.”

Phase 2 UX requires that supersession always points from old → new.

Transition (two-step):

New signal is created normally (status defaults to active)

Old signal is updated:

status = 'superseded'

superseded_by_signal_id = <new_signal_id>

closed_at = now() (recommended)

Invariants:

Superseded signals should not appear in active lists.

Superseded signals should remain discoverable in history views later.

Minimal UX Spec
Where actions live

On each signal row/card (Project > Read):

Resolve (existing)

Invalidate (new)

Supersede (new)

Supersede UX (minimal)

Keep it simple and non-invasive:

Option A (recommended):

User clicks “Supersede”

Modal: “Create the replacement signal”

choose type (default to current type)

textarea content

confirm

On confirm:

create new signal

update old signal to superseded + link

Option B (even simpler):

User clicks “Supersede”

App routes to existing “Add signal” flow with a supersedes=<oldId> param

When new signal is created, apply supersession update in the same transaction.

Copy (suggested)

Resolve: “Mark as resolved”

Invalidate: “Invalidate”

Supersede: “Supersede”

Modal for invalidate:

Title: “Invalidate this signal?”

Body: “This removes it from active structure. It will remain in history.”

Buttons: Cancel / Invalidate

Modal for supersede:

Title: “Create the replacement”

Body: “This will supersede the current signal and keep a record of what changed.”

Inputs: type (optional), content

Buttons: Cancel / Create

Surface Mapping Rules (How ledger affects the product)
Project > Read

Default shows:

Active signals only (status='active')

Resolved/superseded/invalidated are hidden by default.

Direction + Snapshot

Must compute from:

Active signals only

Record Result

Creates:

type='result', status='active'

No auto-close behavior in Phase 2.

Testing Checklist
Data

Create signal → status defaults to active

Resolve signal → status closed

Invalidate signal → status invalidated

Supersede signal:

new signal created (active)

old signal becomes superseded and points to new id

UI

Active lists exclude closed/superseded/invalidated

Supersede flow results in visible new signal and removed old signal from active list

No crashes when superseded_by_signal_id is null

Direction/Snapshot integrity

Direction does not change due to non-active signals

Resolving/invalidating/superseding triggers structural change as expected (if signals affect state hash)

Notes / Future Hooks (do not build now)

Support reverse lookup: “supersedes” backlinks

Add invalidated_reason (optional)

Auto-supersede on re-reduce

Tension detection uses status transitions + time gaps

Indexorg: multi-user confirmation workflows, audit trails, proposal/review states