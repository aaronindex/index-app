# Reduce → Distill signals + auto-open flow — Implementation summary

## Files changed

### Copy: Reduce → Distill signals
- **app/conversations/[id]/components/ExtractInsightsButton.tsx** — Button label "REDUCE" → "Distill signals", "Reducing..." → "Distilling..."; tooltips and error messages; success modal title "Reduced" → "Signals distilled"; comments.
- **app/conversations/[id]/components/ReduceOnboardingModal.tsx** — Title and body copy updated to "Distill signals" / "Distill signals from this conversation" / "Click Distill signals to carry forward...".
- **app/components/PostImportModal.tsx** — "Reduce to structural signals" → "Distill signals"; "reduce it" → "distill signals from it"; CTA "Reduce your first conversation" → "Distill signals from a conversation".
- **app/import/page.tsx** — Subtext "Reduce it to what still matters." → "Then distill signals from it."
- **app/projects/[id]/page.tsx** — Accumulation line "since last reduce" → "since last distillation"; link text "Reduce" → "Distill signals".
- **app/components/LandingPage.tsx** — Section label "Reduce" → "Distill signals"; subtext "Distill decisions..." → "Extract decisions...".
- **app/conversations/[id]/components/DefineRolesModal.tsx** — "improve Reduce accuracy" → "improve distillation accuracy".
- **app/components/OnboardingFlow.tsx** — "reduce your AI conversations" → "distill your AI conversations"; "reduces the rest" → "distills the rest".
- **emails/welcome.ts** — "Then reduce it." → "Then distill signals from it."
- **app/notes/the-ledger-for-thinking/page.tsx** — "reduce them" → "distill them"; "reduce → continue" → "distill signals → continue"; "You reduce them" → "You distill them".
- **app/notes/building-index-with-index/page.tsx** — "once things were reduced" → "once things were distilled".
- **app/conversations/[id]/page.tsx** — Comment "One-time Reduce onboarding modal" → "One-time distill onboarding modal".

### Import flow: auto-open source detail
- **app/import/page.tsx** — On quick-import success: call `router.replace(`/conversations/${conversationId}`)` immediately after `setQuickSuccess`; success card simplified to a short "Conversation imported. Taking you to the source to distill signals…" (no "Open Source" / "Import Another" buttons).
- **app/import/components/QuickImportModal.tsx** — On import job complete: after `setSuccess`, call `router.replace(`/conversations/${convData.id}`)` and `onClose()` so user lands on source detail and modal closes; success state copy "Taking you to the source to distill signals…"; removed "Open Source" / "Close" buttons from success state.

### Source detail page: helper copy + CTA
- **app/conversations/[id]/page.tsx** — Under conversation title: added "Distill signals from this source." and "Extract decisions, tasks, loops, and highlights." Primary CTA remains the updated ExtractInsightsButton ("Distill signals").

---

## Assumptions

- **Full-page import (/import):** Only the quick-paste flow was updated; other import entry points (e.g. Magic Home, other modals) were not audited. QuickImportModal (used from elsewhere) now auto-redirects and closes.
- **PostImportModal** still links to `/unassigned` with "Distill signals from a conversation"; it does not redirect. Users with conversations but no content see the modal and can go to unassigned to pick a source; after import they are taken to source detail by the updated import flows.
- **first_reduce_acknowledged** and **firstReduce** in API/response were left as-is (internal identifiers). UI and copy say "first distillation" / "Signals extracted" where relevant.
- **ReduceOnboardingModal** component and file name were not renamed to avoid churn; only user-visible copy inside the modal was updated.
- **Storage key** `index_reduce_onboarding_dismissed` unchanged (internal).

---

## Remaining "Reduce" references (intentionally internal)

- **LandingPage.tsx** — `reduceMotion` (accessibility preference), not the product action.
- **ExtractInsightsButton.tsx** — `firstReduce` in result type and API response handling; `first-reduce-acknowledged` fetch URL.
- **ReduceOnboardingModal.tsx** — Component name, `STORAGE_KEY = 'index_reduce_onboarding_dismissed'`, `ReduceOnboardingModalProps`.
- **app/api/insights/extract/route.ts** — `ReduceDebug` type, `last_reduce_at`, `first_reduce_acknowledged`, `responsePayload.firstReduce`, and log/comments ("reduce produced 0", "successful Reduce").
- **app/api/profile/first-reduce-acknowledged/route.ts** — Route path and profile field `first_reduce_acknowledged`.
- **app/projects/[id]/page.tsx** — `last_reduce_at`, `capturesSinceLastReduce`, `lastReduceAt` (DB/backend naming).
- **app/api/capture/route.ts** — Comment "Reduce & Discard Source".
- **lib/ai/insights.ts**, **lib/capture/createCapture.ts**, **lib/reduce/** — Types, function names, and file paths left as-is.

---

## Quick QA checklist

1. **Import a source** — Use /import quick paste or Quick Import modal; complete import.
2. **App takes user to source detail** — User should land on `/conversations/[id]` (source detail) without an intermediate "Open Source" / "Import Another" step.
3. **Primary action** — Source detail page shows "Distill signals" as the main button (and helper copy "Distill signals from this source." / "Extract decisions, tasks, loops, and highlights.").
4. **Distillation still works** — Click "Distill signals"; extraction runs; success modal shows "Signals distilled" and item counts.
5. **Onboarding** — No user-facing copy still says "Reduce" in the old sense; first-time conversation view modal says "Distill signals"; PostImportModal and OnboardingFlow use the new wording.
