# INDEX Onboarding Audit

Inspection of the **current onboarding flow** for new users. No code was modified; this is documentation only.

---

## 1. Entry point

| Item | Detail |
|------|--------|
| **Route** | `/` (root) for logged-out users; authenticated users are redirected to `/home`. |
| **Component** | `app/page.tsx` (server): calls `getCurrentUser()`; if user exists → `redirect('/home')`; else renders `<LandingPage />`. |
| **Trigger** | Visiting the site. Logged-out users see the landing page; logged-in users never see it (immediate redirect to `/home`). |

**Sign-up entry**

- **Route:** `/auth/signup`
- **Component:** `app/auth/signup/page.tsx`
- **Trigger:** User clicks sign-up from landing or nav. After successful sign-up:
  - If email confirmation is required: user sees “Check your email” and stays on signup page until they click the link.
  - Link targets `/auth/callback?code=...&type=signup`; callback redirects to `next` (default **`/home`**).
  - If no confirmation: client does `router.push('/home')` after sign-up.

**Post-account redirect**

- **Route:** `app/auth/callback/route.ts` — exchanges code for session, then `NextResponse.redirect(new URL(next, request.url))` with default `next === '/home'`.
- New users therefore land on **`/home`** (MagicHomeScreen).

**Where onboarding begins**

- Onboarding does **not** start on the landing or signup page.
- It starts on **`/home`** when the user is authenticated and `getOnboardingState()` reports `completed === false`. Then `OnboardingController` mounts and shows **Step 1** (concept modal).

---

## 2. Step-by-step onboarding flow (actual implementation)

| Step | Location | Trigger | What happens |
|------|----------|--------|----------------|
| **1** | `/home` | User has not completed onboarding and step is `null` or `1`. | Modal: “Thinking happens everywhere. INDEX keeps what matters.” Copy: “Import conversations or captures. Distill signals. Watch structure emerge.” Single button: **Start**. Click sets step to `2` and `router.push('/import')`. |
| **2** | `/import` | User landed from Step 1 (step === 2). | Page shows onboarding copy: “Bring one piece of thinking into INDEX. A conversation, idea, or working thread.” User pastes transcript, optionally picks/creates project, imports. On success: `setOnboardingStep(3)` and `router.replace(\`/conversations/${conversationId}\`)`. |
| **3** | `/conversations/[id]` | Step === 3. | **OnboardingStep3Spotlight** highlights the “Distill signals” button (`data-onboarding="distill-signals"`). Copy: “Distill signals from this source. Extract decisions, tasks, and insights. The rest fades.” User must click **Distill signals** (ExtractInsightsButton or equivalent). |
| **4** | Same conversation page | After first successful distillation when step === 3; step is set to 4 when reduce returns. | **FirstStructuralMomentModal** appears: “Signals extracted” with counts (decisions, tasks, highlights). Copy: “Signals accumulate into structure.” Buttons: **Import another source** (step → 2, go to `/import`) or **View signals** (step → 5, go to `/projects/${projectId}?tab=signals`). |
| **5** | `/projects/[id]?tab=signals` | Step === 5 and tab is `signals`. | **OnboardingProjectOverlay** modal: “Signals are the ledger of your thinking. Decisions, tasks, insights, and results accumulate here.” Button: **See structure** → sets step 6 and `router.push(\`/projects/${projectId}?tab=read\`)`. |
| **6** | `/projects/[id]?tab=read` | Step === 6 and tab is `read`. | **OnboardingProjectOverlay** modal: “Structure reflects the work. Arcs and direction emerge from signals.” Button: **Continue** → sets step 7 and `router.push('/home')`. |
| **7** | `/home` | Step === 7. | **OnboardingController** modal: “INDEX reflects where your thinking is headed. Direction evolves as signals accumulate.” Button: **You're ready** → `markOnboardingCompleted()`, `clearOnboardingStep()`, modal unmounts. |

**Summary path**

1. User signs up (or signs in).
2. Redirect to `/home`.
3. Step 1 modal → **Start** → `/import`.
4. Import first conversation (with project selection or creation) → redirect to conversation page.
5. Step 3 spotlight on **Distill signals**; user distills.
6. Step 4 “Signals extracted” modal → **View signals** → project Signals tab.
7. Step 5 overlay → **See structure** → project Read tab.
8. Step 6 overlay → **Continue** → `/home`.
9. Step 7 “You're ready” → onboarding completed.

---

## 3. Components involved

| Purpose | File path | Component / note |
|--------|-----------|-------------------|
| Onboarding state (completed, step 1–7) | `lib/onboarding/state.ts` | `getOnboardingState`, `getOnboardingStep`, `setOnboardingStep`, `markOnboardingCompleted`, `clearOnboardingStep`, `isOnboardingInProgress`, `resetOnboarding`. Profile: `onboarding_completed`, `onboarding_version`. Step in localStorage. |
| Step 1 & 7 modals | `app/components/onboarding/OnboardingController.tsx` | Renders Step 1 (concept) and Step 7 (Direction / “You're ready”). Mounted inside MagicHomeScreen. |
| Step 2 copy + import | `app/import/page.tsx` | Onboarding step 2 copy when `onboardingStep === 2`; on import success sets step 3 and navigates to conversation. |
| Step 3 spotlight | `app/conversations/[id]/components/OnboardingStep3Spotlight.tsx` | Spotlight on Distill signals button. Uses `SpotlightTour`. |
| Spotlight UI | `app/components/onboarding/SpotlightTour.tsx` | Reusable spotlight/tour. |
| Distill button (conversation) | `app/conversations/[id]/components/ExtractInsightsButton.tsx` | “Distill signals”; on first reduce with counts sets step 4 and shows FirstStructuralMomentModal. |
| Step 4 modal | `app/conversations/[id]/components/FirstStructuralMomentModal.tsx` | “Signals extracted” + counts; when step 4 shows “View signals” / “Import another source”. |
| Step 5 & 6 overlays | `app/projects/[id]/components/OnboardingProjectOverlay.tsx` | Step 5 on Signals tab (“See structure”); Step 6 on Read tab (“Continue” to home). |
| Reduce-on-conversation one-time | `app/conversations/[id]/components/ReduceOnboardingModal.tsx` | Explains “Distill signals” on conversation view; localStorage `index_reduce_onboarding_dismissed`; not part of 1–7 step count. |
| Home layout + onboarding mount | `app/components/MagicHomeScreen.tsx` | Mounts `OnboardingController`; fires `/api/lifecycle/welcome` POST on mount; uses `isOnboardingInProgress()` to hide ExtensionNudgeBanner and some footer when in progress. |
| Nav / footer | `app/components/Nav.tsx`, `app/components/Footer.tsx` | Use `isOnboardingInProgress()`; AccountDropdown and some links hidden during onboarding. |
| Reset onboarding | `app/components/header/AccountDropdown.tsx` | Can call `resetOnboarding()` (e.g. for testing). |

**Other referenced but not step-driven**

- `app/components/OnboardingFlow.tsx` — alternate/legacy onboarding UI (references “onboarding-step-fade-in”); not used in the current 7-step flow.
- `app/components/OnboardingSteps.tsx` — different step model and `index-onboarding-step` event; not the same as the loop in OnboardingController + overlays.

---

## 4. First meaningful moment (what appears first)

| Order | Moment | Where |
|-------|--------|--------|
| 1 | **Signals (counts)** | FirstStructuralMomentModal after first distillation: “X decisions, Y tasks, Z highlights.” |
| 2 | **Signals (list)** | Project → Signals tab: decisions, tasks, highlights. |
| 3 | **Project snapshot / arcs** | Project → Read tab: Project Snapshot, Active Arcs, Open Decisions, Open Tasks, Timeline. |
| 4 | **Direction** | Home: Direction section (and step 7 modal). User is told “Direction evolves as signals accumulate” and then sees the Direction panel after “You're ready.” |
| 5 | **Ask INDEX** | Home: Ask INDEX module and nav; not part of the guided flow. User can use it anytime after onboarding. |

So the **first structural output** the user sees is the **“Signals extracted” modal** (counts), then the **Signals tab**, then **project Read** (snapshot, arcs), then **Direction** on home.

---

## 5. Empty states

| Context | Location | Copy / behavior |
|--------|----------|------------------|
| **No projects** | `app/projects/page.tsx` | “No projects yet.” or (first time) “Create your first project” + “Projects help you organize your conversations and thinking.” + CreateProjectButton. |
| **No conversations in project (Read tab)** | `app/projects/[id]/components/ReadTab.tsx` | “Distill your first source” / “Once a source is imported, INDEX distills it into structure. Arcs, decisions, and tasks will appear here as the project takes shape.” + **Import source** → `/import?project=…`. |
| **No conversations in project (Overview tab)** | `app/projects/[id]/components/OverviewTab.tsx` | “Import your first chat to get started” / “Once you import a conversation, INDEX will extract insights, tasks, and decisions.” + **Import chat** → `/import?project=…`. |
| **Conversations but nothing surfaced (Read tab)** | Same ReadTab | “Nothing surfaced yet.” / “As you work, INDEX will surface the decisions and open loops that matter most.” / “Start with a conversation or extract insights.” (No primary CTA button.) |
| **Nothing surfaced (Overview tab)** | Same OverviewTab | Same “Nothing surfaced yet.” copy when no still-open items; alternate “Nothing needs attention right now.” when there are conversations but no open decisions/tasks. |
| **No direction (home)** | `app/components/MagicHomeScreen.tsx` | “No direction yet.” / “Direction appears as decisions accumulate.” |
| **No shifts** | MagicHomeScreen | “No shifts yet.” |
| **Timeline empty** | GlobalTimeline (home) | “Structural events will appear here as your thinking evolves.” |
| **Ask (empty)** | Ask page | Suggestions only; no separate “no results” empty state documented in this audit. |

---

## 6. Friction points

- **Step 1 only on /home:** If a new user lands on `/projects` or `/ask` (e.g. bookmark or link), they do not see the Step 1 modal; onboarding state is “not completed” but step may be null. They may see a blank or empty projects list with “No projects yet” and no explicit “start here” path.
- **Project required before distill:** If the conversation is not assigned to a project, “Distill signals” is disabled with tooltip “Assign this conversation to a project to enable Distill signals.” New users in the flow create/select a project at import, but anyone who imports without a project may hit this with no in-flow explanation.
- **No explicit “create project” in the 7 steps:** The flow assumes import with a project (new or existing). A user who goes to Projects first sees “Create your first project” but is not guided from home → projects → create → import.
- **Step 3 relies on user clicking Distill:** Spotlight points at the button but does not auto-advance. If the user dismisses the spotlight or navigates away without distilling, they stay on step 3 and may not know what to do next.
- **Empty state after conversations but no signals:** “Nothing surfaced yet” on Read/Overview has no button; copy says “Start with a conversation or extract insights” but does not link to import or to a specific conversation.
- **Direction empty for a long time:** New users see “No direction yet” and “Direction appears as decisions accumulate.” No timeline or hint for how many imports/distills are needed before direction appears.
- **Welcome email / focus modal:** Home calls `POST /api/lifecycle/welcome`. Focus modal (`showFocusModal`) shows when user has conversations, no weekly digest yet, and has not dismissed it (cookie `index_focus_modal_dismissed`). It can appear after onboarding and is separate from the 7-step flow; not verified in this audit for exact copy or timing.
- **Magic link redirect:** Pre-launch checklist notes “magic link still not redirecting to /home”; if auth callback does not redirect to `/home`, new users might land on a different page and miss Step 1.

---

## 7. Output summary

1. **Entry point:** Onboarding starts on **`/home`** after sign-up/sign-in. Step 1 modal is shown by **OnboardingController** when `completed === false` and step is `null` or `1`. Landing is `/` (logged out) or redirect to `/home` (logged in). Sign-up is `/auth/signup`; post-confirmation redirect is `/auth/callback` → default `/home`.
2. **Flow:** 7-step loop: Home (1) → Import (2) → Conversation + spotlight (3) → First structural modal (4) → Project Signals (5) → Project Read (6) → Home (7) → complete.
3. **Components:** `lib/onboarding/state.ts`, `OnboardingController`, `import` page (step 2), `OnboardingStep3Spotlight`, `ExtractInsightsButton`, `FirstStructuralMomentModal`, `OnboardingProjectOverlay`, `ReduceOnboardingModal`, `MagicHomeScreen`, Nav/Footer/AccountDropdown.
4. **Empty states:** No projects, no conversations (Read/Overview), nothing surfaced, no direction, no shifts, empty timeline; copy and CTAs documented above.
5. **Friction:** Step 1 only on home; project required to distill; no “create project” in steps; step 3 requires manual distill click; “Nothing surfaced” has no CTA; direction feels distant; possible magic-link redirect issue.

This summary can be used to refine onboarding before launch.
