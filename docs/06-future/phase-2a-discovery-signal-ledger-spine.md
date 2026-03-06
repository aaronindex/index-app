# Phase 2a Discovery — Signal Ledger Spine (NO IMPLEMENTATION)

Discovery-only: DB schema, write paths, read paths, resolve behavior. No code changes.

---

## 1. DB schema (tables + key columns)

### decisions
- **Source:** `supabase/migrations/create_decisions_table.sql`, `add_project_id_to_decisions.sql`, `add_pinning_and_sort_order.sql`, `add_reducing_valve_fields.sql`, `add_content_to_decisions.sql`, `add_source_ask_index_run_id.sql`; full in `supabase/manual-migrations/0000-reconstructed-v1-schema.sql`
- **Columns:** id, user_id, project_id, conversation_id, title, content, created_at, source_ask_index_run_id, is_pinned, sort_order, **is_inactive**
- **Status/resolved:** No `status` column; “resolved” = **is_inactive** (reducing valve)

### tasks
- **Source:** `supabase/migrations/create_tasks_table.sql`, `add_pinning_and_sort_order.sql`, `add_horizon_to_tasks.sql`, `add_reducing_valve_fields.sql`, `add_source_ask_index_run_id.sql`; full in `supabase/manual-migrations/0000-reconstructed-v1-schema.sql`
- **Columns:** id, user_id, project_id, conversation_id, title, description, **status** (open, in_progress, complete, cancelled, dormant, priority), source_query, source_answer_id, source_highlight_id, source_ask_index_run_id, created_at, updated_at, is_pinned, sort_order, horizon, **is_inactive**
- **Status/resolved:** **status**; resolved = status in (complete, cancelled)

### highlights
- **Source:** `supabase/manual-migrations/0000-reconstructed-v1-schema.sql`, `supabase/migrations/add_source_ask_index_run_id.sql`
- **Columns:** id, user_id, project_id, conversation_id, message_id, content, start_offset, end_offset, label, created_at, source_ask_index_run_id
- **Status/resolved:** None

### project_outcome (results)
- **Source:** `supabase/migrations/20260226190500_create_project_outcome_table.sql`
- **Columns:** id, user_id, project_id, text, occurred_at, created_at
- **Status/resolved:** None; table is append-only (no update/delete policies)

---

## 2. Write paths (file path + function)

### decisions
- `app/api/insights/extract/route.ts` — POST handler (extract pipeline inserts decisions)
- `lib/capture/createCapture.ts` — runReductionForCapture (capture pipeline inserts decisions)
- `app/api/decisions/create/route.ts` — POST
- `app/api/decisions/[id]/toggle-inactive/route.ts` — PATCH (is_inactive)
- `app/api/decisions/pin/route.ts` — PATCH
- `app/api/decisions/[id]/delete/route.ts` — DELETE
- `app/api/followups/convert/route.ts` — POST (type=decision: insert)

### tasks
- `app/api/insights/extract/route.ts` — POST handler (extract pipeline inserts tasks)
- `lib/capture/createCapture.ts` — runReductionForCapture (capture pipeline inserts tasks)
- `app/api/tasks/create/route.ts` — POST
- `app/api/tasks/[id]/update-status/route.ts` — PATCH (status)
- `app/api/tasks/reorder/route.ts` — PATCH
- `app/api/tasks/[id]/toggle-inactive/route.ts` — PATCH (is_inactive)
- `app/api/tasks/pin/route.ts` — PATCH
- `app/api/tasks/[id]/delete/route.ts` — DELETE
- `app/api/followups/convert/route.ts` — POST (type=task: insert)

### highlights
- `app/api/insights/extract/route.ts` — POST handler (extract pipeline inserts suggested highlights)
- `lib/capture/createCapture.ts` — runReductionForCapture (capture pipeline inserts highlights)
- `app/api/highlights/create/route.ts` — POST
- `app/api/highlights/[id]/delete/route.ts` — DELETE (and conversation delete flow where highlights are removed)

### project_outcome
- `app/api/projects/[id]/outcomes/route.ts` — POST handler (insert; then inserts pulse with pulse_type result_recorded)

---

## 3. Read paths (file path + function + tables queried)

### Project > Read surface
- `lib/ui-data/project-read-tab-data.ts` — getProjectReadTabServerData — **decisions**, **tasks** (is_inactive=false; tasks not in complete,cancelled)
- `app/api/projects/[id]/read-data/route.ts` — GET — **decisions**, **tasks** (by type param), **project_conversations**, **conversations** (type=chats)
- `app/api/projects/[id]/still-open/route.ts` — GET — **decisions**, **tasks** (still-open filters)
- `lib/ui-data/project.load.ts` — loadProjectView — **project_outcome**, snapshot_state, pulse, structural payload (built from signals)

### Sources list
- `app/projects/[id]/page.tsx` — server: loads project + conversations for ChatsTab — **project_conversations**, **conversations**
- Conversation/highlights view: `app/conversations/[id]/page.tsx` and related API — **conversations**, **highlights** (where conversation detail is shown)

### Logged-in Home (Direction / Shifts / Timeline)
- `lib/ui-data/home.load.ts` — loadHomeView — **snapshot_state** (global), **pulse** (global; result_recorded etc.); does not read decisions/tasks/highlights/project_outcome directly
- `lib/ui-data/home-page-data.ts` — getHomePageData (or equivalent) — uses loadHomeView; shapes shifts/timeline from pulses; timeline events can carry isResult (result_recorded)
- `lib/structure/signals/signal.collector.ts` — collectStructuralSignals — **decisions** (is_inactive=false), **conversations** (for thinking time); feeds snapshot/state_hash/direction; does not currently read tasks or project_outcome as signals
- `lib/structure/jobs/job.processor.ts` — structure job — reads **project_outcome** (count only) for semantic trigger stats; does not write project_outcome

---

## 4. Resolve mechanics (file path + function + effect)

### Where task/decision is marked resolved
- **Tasks:** `app/api/tasks/[id]/update-status/route.ts` — PATCH — sets status (complete/cancelled = resolved)
- **Decisions:** `app/api/decisions/[id]/toggle-inactive/route.ts` — PATCH — sets is_inactive (reducing valve = “resolved” for read filters)

### Effect on snapshots / state_hash / direction
- **Signal set:** `lib/structure/signals/signal.collector.ts` — collectStructuralSignals — filters decisions by **is_inactive = false**; only those rows become structural signals. Tasks are not yet collected as signals.
- **Read filters (Project Read / still-open):** `lib/ui-data/project-read-tab-data.ts`, `app/api/projects/[id]/read-data/route.ts`, `app/api/projects/[id]/still-open/route.ts` — filter decisions by is_inactive=false; filter tasks by status not in (complete, cancelled).
- Snapshot/state_hash/direction are built from the structural payload produced by the structure pipeline (arc inference, etc.), which currently uses only decision signals (is_inactive=false). Marking a decision is_inactive or a task complete/cancelled removes it from those read surfaces and (for decisions) from the signal set that drives Direction/snapshots.
