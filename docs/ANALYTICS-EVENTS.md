# Analytics Events Map

This document maps all GA4 events fired via GTM dataLayer to their implementation locations and parameters.

## Event Helper

All events use the `trackEvent()` helper from `lib/analytics.ts`, which:
- Only executes in browser (safe for SSR)
- Validates dataLayer exists before pushing
- Sanitizes params to primitives only
- Supports debug logging via `NEXT_PUBLIC_DEBUG_ANALYTICS=true`

## Events Table

| Event Name | Location | Function/Component | Parameters |
|------------|----------|-------------------|------------|
| `landing_page_view` | `app/components/LandingPage.tsx` | `useEffect` on mount | `page_type: 'landing'`, `path: string`, `referrer_host?: string`, `utm_source?: string`, `utm_medium?: string`, `utm_campaign?: string` |
| `invite_code_submitted` | `app/components/landing/InviteCodeInput.tsx` | `handleSubmit` | `code_length: number` |
| `invite_code_accepted` | `app/components/landing/InviteCodeInput.tsx` | `handleSubmit` (after verification) | None |
| `sign_up_completed` | `app/auth/signup/page.tsx` | `handleSignUp` (after signup) | `invite_present: boolean`, `invite_length?: number`, `invite_source?: 'url' \| 'form'` |
| `invite_code_rejected` | `app/components/landing/InviteCodeInput.tsx` | `handleSubmit` (on error) | `error: string` |
| `import_started` | `app/import/page.tsx` | `handleImport` (on submit) | `import_type: 'file_upload'`, `conversation_count: number`, `has_project: boolean`, `size_bytes: number`, `file_type: 'zip' \| 'json' \| 'unknown'` |
| `import_started` | `app/import/components/QuickImportModal.tsx` | `handleImport` (on submit) | `import_type: 'quick_paste'`, `chars: number`, `has_project: boolean` |
| `import_completed` | `app/import/page.tsx` | `handleImport` (polling success) | `import_type: 'file_upload'`, `import_id: string`, `job_id: string`, `latency_ms: number`, `conversation_count: number`, `message_count: number`, `size_bytes: number`, `file_type: 'zip' \| 'json' \| 'unknown'` |
| `import_completed` | `app/import/components/QuickImportModal.tsx` | `handleImport` (polling success) | `import_type: 'quick_paste'`, `import_id: string`, `job_id?: string`, `latency_ms: number`, `conversation_count: number`, `message_count: number` |
| `import_failed` | `app/import/page.tsx` | `handleImport` (on error/timeout) | `import_type: 'file_upload'`, `import_id: string`, `job_id?: string`, `latency_ms?: number`, `error: string`, `size_bytes: number`, `file_type: 'zip' \| 'json' \| 'unknown'` |
| `import_failed` | `app/import/components/QuickImportModal.tsx` | `handleImport` (on error/timeout) | `import_type: 'quick_paste'`, `import_id?: string`, `job_id?: string`, `latency_ms?: number`, `error: string` |
| `ask_index_query` | `app/ask/page.tsx` | `performSearch` (on success) | `query_length: number`, `result_count: number`, `latency_ms: number`, `has_answer: boolean`, `scope: 'global' \| 'project'`, `project_id_present: boolean` |
| `ask_index_answered` | `app/ask/page.tsx` | `performSearch` (on success with answer) | `query_length: number`, `result_count: number`, `latency_ms: number`, `scope: 'global' \| 'project'`, `project_id_present: boolean` |
| `limit_hit` | `app/ask/page.tsx` | `performSearch` (on 429) | `limit_type: 'ask'` |
| `limit_hit` | `app/conversations/[id]/components/ConversationViewClient.tsx` | `handleHighlight` (on 429) | `limit_type: 'meaning_object'` |
| `limit_hit` | `app/conversations/[id]/components/CreateTaskFromHighlightButton.tsx` | `handleCreate` (on 429) | `limit_type: 'meaning_object'` |
| `limit_hit` | `app/projects/[id]/components/CreateDecisionButton.tsx` | `handleSubmit` (on 429) | `limit_type: 'meaning_object'` |
| `limit_hit` | `app/import/page.tsx` | `handleImport` (on 429) | `limit_type: 'import'` |
| `limit_hit` | `app/import/components/QuickImportModal.tsx` | `handleImport` (on 429) | `limit_type: 'import'` |
| `highlight_created` | `app/conversations/[id]/components/ConversationViewClient.tsx` | `handleHighlight` (on success) | `highlight_id: string`, `has_label: boolean` |
| `task_created` | `app/conversations/[id]/components/CreateTaskFromHighlightButton.tsx` | `handleCreate` (on success) | `task_id: string`, `has_project: boolean`, `from_highlight: boolean` |
| `decision_created` | `app/projects/[id]/components/CreateDecisionButton.tsx` | `handleSubmit` (on success) | `decision_id: string`, `has_project: boolean` |
| `start_chat_invoked` | `app/components/StartChatModal.tsx` | `handleGenerate` (on invoke) | `target_tool: string`, `intent_type: string`, `object_type: 'project' \| 'task' \| 'decision'`, `has_project: boolean`, `prompt_length: number` |
| `prompt_copied` | `app/components/StartChatModal.tsx` | `handleCopy` (on copy) | `target_tool: string`, `has_run_id: boolean` |

## Notes

1. **Latency Tracking**: Import and Ask events include `latency_ms` calculated from client-side start time to completion/error.

2. **Limit Hits**: Tracked client-side when API returns 429 status. The `limit_type` parameter uses enum: `'ask'`, `'import'`, `'meaning_object'`, `'asset'`.

3. **Server-Side Events**: API routes do NOT fire events directly. All events are fired client-side after successful API responses or on errors, ensuring:
   - Events only fire on actual user interactions
   - Latency can be accurately measured
   - Limit hits can be tracked with context
   - No events fire during SSR

4. **Import Event Semantics**: `import_started` fires on form submit (before API call), not after job is queued. This ensures consistent funnel tracking.

5. **File Upload Params**: For `import_type: 'file_upload'` events, `size_bytes` and `file_type` are included. `file_type` is derived from filename extension (`'zip'`, `'json'`, or `'unknown'`). These params are NOT included for `quick_paste` imports.

6. **Ask Index Events**: `ask_index_query` fires on every successful search. `ask_index_answered` fires only when `has_answer === true`, making it ideal for GA4 key event/funnel setup to track when users receive synthesized answers.

7. **Privacy**: No PII or sensitive data in events:
   - No invite code strings (only length/presence)
   - No query text (only length)
   - No user content in params
   - No filenames (only file type and size)

8. **Debug Mode**: Set `NEXT_PUBLIC_DEBUG_ANALYTICS=true` in `.env.local` to log all events to console. Debug logs include file upload params and `ask_index_answered` firing.

## Parameter Types

All parameters are primitives (string, number, boolean) or small objects (max 10 keys) to ensure compatibility with GTM dataLayer.

## Standard Enums

- `limit_type`: `'ask'`, `'import'`, `'meaning_object'`, `'asset'`
- `import_type`: `'file_upload'`, `'quick_paste'`
- `scope`: `'global'`, `'project'`
- `object_type`: `'project'`, `'task'`, `'decision'`
- `invite_source`: `'url'`, `'form'`
- `file_type`: `'zip'`, `'json'`, `'unknown'`
