# Phase 2a Signal Ledger Spine — Implementation Summary

## Files changed

### Migration
- `supabase/migrations/20260227000000_phase_2a_signal_ledger_spine.sql` — NEW: decisions (status, superseded_by_decision_id, closed_at, origin + backfill), tasks (superseded_by_task_id, origin, attributes), highlights (origin), project_outcome (origin).

### Decision read paths (now filter by `status = 'active'`)
- `lib/ui-data/project-read-tab-data.ts` — getProjectReadTabServerData
- `app/api/projects/[id]/read-data/route.ts` — GET
- `app/api/projects/[id]/still-open/route.ts` — GET
- `app/api/projects/[id]/export-checklist/route.ts` — GET
- `app/api/home/still-open/route.ts` — GET
- `lib/stateQuery.ts` — queryState
- `lib/structure/signals/signal.collector.ts` — collectStructuralSignals
- `lib/startChat/compiler.ts` — decision queries (3 places)
- `app/api/feedback/check-eligibility/route.ts` — decisions count

### Decision write paths (status/origin)
- `app/api/decisions/create/route.ts` — POST: status 'active', origin 'user'
- `app/api/insights/extract/route.ts` — decisions insert: status 'active', origin 'system'
- `lib/capture/createCapture.ts` — decisions insert: status 'active', origin 'system'
- `app/api/followups/convert/route.ts` — decision insert: status 'active', origin 'user'

### Decision lifecycle (toggle + new actions)
- `app/api/decisions/[id]/toggle-inactive/route.ts` — POST: sets status (closed/active), closed_at, keeps is_inactive in sync
- `app/api/decisions/[id]/resolve/route.ts` — NEW: POST → status 'closed', closed_at, is_inactive true
- `app/api/decisions/[id]/invalidate/route.ts` — NEW: POST → status 'invalidated', is_inactive true
- `app/api/decisions/[id]/supersede/route.ts` — NEW: POST body `{ superseded_by_decision_id }` → status 'superseded', superseded_by_decision_id, is_inactive true

### Task write paths (origin, attributes)
- `app/api/tasks/create/route.ts` — origin 'user'
- `app/api/insights/extract/route.ts` — commitments/blockers/openLoops: origin 'system', attributes { commitment }, { blocker }, { loop }
- `lib/capture/createCapture.ts` — same for commitments/blockers/openLoops

### Highlight write paths (origin)
- `app/api/highlights/create/route.ts` — origin 'user'
- `app/api/insights/extract/route.ts` — suggested highlights: origin 'system'
- `lib/capture/createCapture.ts` — suggested highlights: origin 'system'
- `app/api/followups/convert/route.ts` — highlight insert: origin 'user'

### Project outcome write path (origin)
- `app/api/projects/[id]/outcomes/route.ts` — origin 'user'

---

## Short test plan

1. **Migration**
   - Run migration on a dev DB; confirm columns exist on decisions, tasks, highlights, project_outcome.
   - Confirm decisions backfill: rows with `is_inactive = true` have `status = 'closed'`, others `status = 'active'`.

2. **Decision current-state reads**
   - Project Read tab: only decisions with `status = 'active'` appear; closing one (toggle or resolve) removes it.
   - Home still-open and project still-open APIs: same.
   - Export checklist and stateQuery: only active decisions.

3. **Direction / signals**
   - Trigger structure job; confirm signal collector only pulls decisions with `status = 'active'` (no change in behavior from pre–Phase 2a aside from filter field).

4. **Decision actions**
   - Toggle inactive: decision goes to status 'closed' (and is_inactive true); toggle again → status 'active'.
   - POST `/api/decisions/[id]/resolve`: decision becomes status 'closed'.
   - POST `/api/decisions/[id]/invalidate`: decision becomes status 'invalidated'.
   - POST `/api/decisions/[id]/supersede` with body `{ superseded_by_decision_id: <other-decision-id> }`: decision becomes status 'superseded' and linked; other decision must belong to same user.

5. **Writes (smoke)**
   - Create decision (manual): has status 'active', origin 'user'.
   - Extract insights (decisions/tasks/highlights): new rows have origin 'system'; tasks from commitments/blockers/openLoops have attributes set.
   - Record project outcome: row has origin 'user'.
   - Create task/highlight manually: origin 'user'.

6. **Tasks**
   - No change to task status model or read filters (still is_inactive false, status not in complete/cancelled). New columns (origin, attributes, superseded_by_task_id) present and populated on new inserts.
