# Debug: Why aren’t snapshots being written?

After importing chats + reducing, we expect at least a **GLOBAL** `snapshot_state` row when structure jobs run and `state_hash` changes. This doc helps find where the pipeline fails.

Replace `'<user_id>'` in queries with the actual user UUID.

---

## 1) Are structure jobs being enqueued?

**Check:** After a Reduce, a new row should exist in `structure_jobs`.

**Code path:**  
`dispatchStructureRecompute` in `lib/structure/dispatch/dispatch.enqueue.ts` → `enqueueStructureJob` in `lib/structure/jobs/job.enqueue.ts` (inserts into `structure_jobs`).  
Called after Reduce from `app/api/insights/extract/route.ts` when `decisionCreated` is true (lines 120–133).

**DB query – latest 10 jobs for user:**

```sql
SELECT id, user_id, scope, status, debounce_key,
       queued_at, started_at, finished_at, error
FROM structure_jobs
WHERE user_id = '<user_id>'
ORDER BY queued_at DESC
LIMIT 10;
```

**If jobs are failing – see the stored error (e.g. latest 7 failed):**

```sql
SELECT id, user_id, scope, status, queued_at, finished_at, error
FROM structure_jobs
WHERE status = 'failed'
ORDER BY queued_at DESC
LIMIT 7;
```
The `error` column contains the exception message (truncated to 1000 chars). In dev, the same failure is also logged as `[StructureJob][Failed]` with full message and stack snippet.

If this returns no rows after Reduce, enqueue is failing (e.g. dispatch not called, or `shouldEnqueueJob` throwing “Job already queued” and swallowed as debounce).

---

## 2) Are structure jobs being processed?

**Check:** In dev, either **GET /api/cron/structure-jobs** (cron) or **POST /api/structure-jobs/process** (manual) must run. Cron is often not configured locally, so jobs can sit in `queued` forever.

- **Cron:** `app/api/cron/structure-jobs/route.ts` – requires `INDEX_ADMIN_SECRET` (or `Authorization: Bearer <secret>`).
- **Manual:** `app/api/structure-jobs/process/route.ts` – POST with header `x-index-admin-secret: <INDEX_ADMIN_SECRET>` and optional body `{ "limit": 10 }`.  
  Used by `app/components/ProcessStructureJobsButton.tsx` (dev UI).

**Evidence:** Run the query from section 1. If `status` stays `queued` and `started_at`/`finished_at` are null, jobs are not being processed.

**Logs:** When the processor runs, you’ll see `[StructureJobsProcess] Job <id> succeeded` or `failed` in server logs.

---

## 3) Are structural signals present (from Reduce/import)?

Snapshots depend on **collectStructuralSignals**, which reads from:

- **decisions** (active only: `is_inactive = false`), with `conversation_id` required for thinking time.
- **conversations** (for `started_at`, `ended_at` to compute signal `occurred_at`).

Signals are **not** stored in a table; they are computed from `decisions` + `conversations`. So “signals exist” means: there are decisions with valid conversation links.

**DB query – latest 20 “signal source” rows (decisions with conversation):**

```sql
SELECT d.id, d.user_id, d.conversation_id, d.project_id, d.is_inactive,
       c.started_at, c.ended_at, d.created_at
FROM decisions d
LEFT JOIN conversations c ON c.id = d.conversation_id AND c.user_id = d.user_id
WHERE d.user_id = '<user_id>'
  AND d.is_inactive = false
ORDER BY d.id DESC
LIMIT 20;
```

If this returns no rows (or no `conversation_id`), the job will get zero signals and the structural payload may be empty/minimal; hash can still change but content will be minimal.

---

## 4) Is snapshot gating preventing writes?

In **runStructureJob** (`lib/structure/jobs/job.processor.ts`):

- It loads **latestSnapshot** for the user/scope (scope `user` → snapshot scope `global`).
- If `latestSnapshot.state_hash === stateHash`, it **exits early** and does not call **writeSnapshotState**.

**Dev-only logging added:** In development, `[StructureJob][HashGating]` is logged with:

- `computed_state_hash_prefix`
- `latest_snapshot_state_hash_prefix`
- `will_skip_write: true/false`

If you see `will_skip_write: true`, the pipeline is working but the hash did not change (same structural state). If signals or payload didn’t change, the hash will be identical.

---

## 5) Is snapshot_state insert failing?

**Code:** `writeSnapshotState` in `lib/structure/snapshot/snapshot.write.ts`. On insert failure it throws; in **dev** it also logs `[SnapshotWrite][InsertFailed]` with `error_message`, `error_code`, `error_details`.

**DB query – latest 10 snapshot_state rows for user:**

```sql
SELECT id, user_id, scope, project_id, state_hash, generated_at
FROM snapshot_state
WHERE user_id = '<user_id>'
ORDER BY generated_at DESC NULLS LAST
LIMIT 10;
```

If there are no rows (especially no `scope = 'global'`) but jobs are `succeeded`, then either hash gating skipped the write (see section 4) or the insert failed and the error should appear in logs (`[SnapshotWrite][InsertFailed]`).

---

## Summary: which stage is failing?

| Stage        | What to check                                                                 | Most likely in dev                          |
|-------------|---------------------------------------------------------------------------------|---------------------------------------------|
| **Enqueue** | Rows in `structure_jobs` for user after Reduce                                  | OK if dispatch runs; debounce can skip once  |
| **Process** | Jobs move to `succeeded`/`failed`; `started_at`/`finished_at` set               | **Often fails** – cron not run; manual not called |
| **Signals** | Decisions with `conversation_id`, `is_inactive = false`                         | OK if Reduce created decisions               |
| **Hash gate**| Dev log `[StructureJob][HashGating]` and `will_skip_write`                     | Skip if payload unchanged                   |
| **Insert**  | Rows in `snapshot_state`; dev log `[SnapshotWrite][InsertFailed]` on error      | Uncommon if RLS allows user-owned insert    |

**Most likely cause in dev:** Jobs are **enqueued** but **never processed** because:

1. **GET /api/cron/structure-jobs** is not invoked (no local cron).
2. **POST /api/structure-jobs/process** is not called (no dev button click or no `INDEX_ADMIN_SECRET` set).

**Concrete fix for dev:** After Reduce, call the manual processor (e.g. use the Process Structure Jobs button, or):

```bash
curl -X POST http://localhost:3000/api/structure-jobs/process \
  -H "Content-Type: application/json" \
  -H "x-index-admin-secret: YOUR_INDEX_ADMIN_SECRET" \
  -d '{"limit": 10}'
```

---

## Code changes made (dev-only logging)

1. **lib/structure/jobs/job.processor.ts**  
   Before hash gating, in dev: log `[StructureJob][HashGating]` with `computed_state_hash_prefix`, `latest_snapshot_state_hash_prefix`, `will_skip_write`. Makes it obvious when “hash unchanged → exit early” happens.

2. **lib/structure/snapshot/snapshot.write.ts**  
   On insert error, in dev: log `[SnapshotWrite][InsertFailed]` with `user_id`, `scope`, `state_hash_prefix`, `error_message`, `error_code`, `error_details`. Surfaces any insert failure in logs.

No inference or schema changes.
