# INDEX v2 — Pre-Launch Checklist

This checklist defines the minimum required work before launching INDEX v2.

The goal is to ensure the full INDEX loop works cleanly:

Think anywhere → Capture → Reduce → Structure → Direction → Continue Thinking

---

# 1. Core Product Behavior

## Post-Import Flow

- [x] Update PostImportModal copy
- [ ] Update post-import confirmation screen copy
- [ ] Ensure Reduce flow is clearly surfaced after import
- [ ] Validate multi-source reduction workflow (Sources → Reduce → Return)

---

## Direction System

- [ ] Direction empty state copy
- [ ] Direction first-emergence behavior
- [ ] Direction regeneration when state changes
- [ ] Validate Direction tone (field-note style)

---

## Continue Thinking

- [ ] Rename **Resume → Continue Thinking**
- [ ] Update modal copy
- [ ] Validate prompt generation modes:
  - Next actions
  - Decisions
  - What’s blocking me
  - Full context
- [ ] Confirm prompts remain structural and non-coaching

---

## Weekly Log

- [ ] Weekly digest generation test
- [ ] Confirm naming (Weekly Digest vs Weekly Log)
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

- [ ] Implement onboarding slides
- [ ] Ensure onboarding is skippable
- [ ] Validate restart control

---

## Two-Import Flow

- [ ] Import first conversation
- [ ] Reduce first source
- [ ] Import second conversation
- [ ] Reduce second source
- [ ] Confirm Direction appears

---

## Extension Nudging

- [ ] Extension banner behavior
- [ ] Extension install pill logic
- [ ] Badge state conditions
- [ ] Dismissal behavior

---

# 4. Landing Pages

## Logged-Out LP

- [ ] Update hero copy
- [ ] Align messaging with v2 positioning

---

## Logged-In LP

- [ ] Direction empty state
- [ ] Shifts empty state
- [ ] Timeline empty state

---

# 5. Billing & Access

- [ ] Pricing page copy update
- [ ] Upgrade modal copy
- [ ] Subscription flow validation

---

# 6. Infrastructure

- [ ] Magic link redirect → /home
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

- [ ] Founder Note (v2)
- [ ] Launch post
- [ ] Initial outreach

---

# Launch Condition

INDEX v2 is ready to launch when this loop works cleanly:

Import → Reduce → Direction → Continue Thinking → Capture → Reduce → Direction evolves