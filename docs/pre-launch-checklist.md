# INDEX v2 — Pre-Launch Checklist

This checklist defines the minimum required work before launching INDEX v2.

The goal is to ensure the full INDEX loop works cleanly:

Think anywhere → Capture → Reduce → Structure → Direction → Continue Thinking

---

# 1. Core Product Behavior

## Post-Import Flow

- [x] Update PostImportModal copy
- [x] Update post-import confirmation screen copy
- [ ] Ensure Reduce flow is clearly surfaced after import
- [ ] Validate multi-source reduction workflow (Sources → Reduce → Return)

---

## Direction System

- [x] Direction empty state copy
- [ ] Direction first-emergence behavior
- [ ] Direction regeneration when state changes
- [ ] Validate Direction tone (field-note style)

---

## Continue Thinking

- [x] Rename **Resume → Continue Thinking**
- [x] Update modal copy
- [x] Validate prompt generation modes:
  - Next actions
  - Decisions
  - What’s blocking me
  - Full context
- [x] Confirm prompts remain structural and non-coaching

---

## Weekly Log

- [ ] Weekly digest generation test
- [x] Confirm naming (Weekly Digest vs Weekly Log)
- [ ] Validate tone (logbook / structural reflection)
- [ ] Confirm data sources:
  - Decisions
  - Results
  - Shifts
  - Active arcs

---

# 2. Capture Layer

## Chrome Extension

- [ ] Test quick capture shortcut
- [ ] Confirm save → Unassigned behavior
- [ ] Confirm Undo behavior
- [ ] Validate assignment triggers inference
- [ ] Test large capture limits
- [ ] Confirm authentication handling

---

## Unassigned Container

- [ ] Confirm Unassigned remains inert
- [ ] Confirm structure activates only after assignment
- [ ] Validate assignment UX from Unassigned

---

# 3. Onboarding

## Spotlight Tour

- [x] Implement onboarding slides
- [x] Ensure onboarding is skippable
- [x] Validate restart control

---

## Two-Import Flow

- [ ] Import first conversation
- [ ] Reduce first source
- [ ] Import second conversation
- [ ] Reduce second source
- [ ] Confirm Direction appears

---

## Extension Nudging

- [x] Extension banner behavior
- [x] Extension install pill logic
- [ ] Badge state conditions
- [x] Dismissal behavior

---

# 4. Landing Pages

## Logged-Out LP

- [x] Update hero copy
- [x] Align messaging with v2 positioning

---

## Logged-In LP

- [x] Direction empty state
- [x] Shifts empty state
- [x] Timeline empty state

---

# 5. Billing & Access

- [x] Pricing page copy update
- [x] Upgrade modal copy
- [ ] Subscription flow validation

---

# 6. Infrastructure

- [x] Magic link redirect → /home
- [ ] Authentication edge cases
- [ ] State hash regeneration validation
- [ ] Snapshot regeneration validation

---

# 7. End-to-End Testing

Perform full user loop:

1. Sign up  
2. Import two conversations  
3. Reduce signals  
4. Direction appears  
5. Continue Thinking prompt generated  
6. Capture via extension  
7. Assign capture  
8. Reduce again  
9. Confirm Direction evolution

---

# 8. Launch Content

- [x] Founder Note (v2)
- [ ] Launch post
- [ ] Initial outreach


---

NOTES:
- magic link still not redirecting to /home
- customize magic link email?
- don't like this line in welcome email "That's all INDEX does."
- create extension instructions /extension
- onboarding is superclose but still a little glitchy at points... need to smooth it out... like when modals are triggered, etc.

- import from quick-import > doesn't create title
  - quick import confirm page feels too sparse
- looks like no tasks are being extracted... investigate
- some copy mentions "open loops" but really "tasks" are the correct signal level... open loops, commitments, blockers are attributes
  - need to update copy in those areas to remove "open loops" &/or replace with "tasks" (if tasks not already in those copy blocks)
  - we need to start properly extracting tasks so can see how those attributes are handled
- need to run some tests with changing signal lifecycle to "track" impact


---

# Launch Condition

INDEX v2 is ready to launch when this loop works cleanly:

Import → Reduce → Direction → Continue Thinking → Capture → Reduce → Direction evolves