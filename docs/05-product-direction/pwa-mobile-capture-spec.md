# 📘 INDEX v2 — PWA / Mobile Capture Specification

## 1. Purpose

The PWA enables **mobile-first, low-friction capture** of thinking.

It exists to:

- Support capture while users are in GPT mobile, Claude, Notes, Safari, etc.
- Preserve flow without requiring native app development.
- Maintain parity with Chrome Extension capture behavior.
- Keep quick-save as the dominant ingestion method.

The PWA is a capture surface only.

It is not:
- A thinking interface
- A summarization tool
- A structural preview surface
- A project suggestion engine

---

## 2. Core Principles

1. Capture must be near-instant.
2. Default capture requires zero decisions.
3. No inference at capture.
4. No automatic container guessing.
5. No background interpretation.
6. Structural activation happens only after assignment inside INDEX.

---

## 3. Primary Mobile Capture Flow

### Pattern A — Share Sheet (Preferred)

User highlights text in:

- GPT mobile app
- Safari
- Notes
- Any text-based app

Tap:
Share → INDEX

Behavior:

- Text is sent directly to Unassigned.
- No project selection required.
- No modal required.
- No inference triggered.

Confirmation:

Small in-app confirmation screen:
> Saved to Unassigned ✓  
> (Assign Now) (Done)

Then auto-dismiss or return.

---

### Pattern B — Clipboard Detection (Fallback)

If user:

Copies text  
Opens INDEX PWA  

System detects recent clipboard content.

Prompt:

> Paste copied text into Unassigned?

Button:
Save

This avoids forcing paste manually while still remaining deliberate.

No auto-paste without user action.

---

## 4. Default Landing

All mobile captures land in:

> Unassigned

Unassigned remains:

- Structurally inert
- Non-participatory
- Calm

No inference runs until assignment.

---

## 5. Optional Immediate Assignment (Mobile Variant)

After capture confirmation, provide:

> Assign Now

If selected:

Opens same minimal modal as desktop:

**Place into:**  
[ Project dropdown ]  
(Includes Me)

**Source handling:**  
- • Keep full capture (default)  
- • Keep structural results only  

Button:
Assign

Structural activation occurs only here.

---

## 6. Capture Content Rules

Mobile capture stores:

- Raw text
- Capture timestamp
- Source type (mobile-share / clipboard)
- Optional source app (if available)

It does NOT:

- Parse roles
- Detect transcript structure
- Summarize
- Normalize speakers
- Expand context automatically

Selection defines scope.

---

## 7. Size Limits

Same contract as Chrome extension:

### Soft Limit (~150K characters)
- Allow save.
- Optional gentle warning.

### Hard Limit (~300K characters)
- Prevent save.
- Message:
  > Selection too large. Please reduce selection or use Chat Import.

No silent truncation.
No auto-chunking.

---

## 8. Performance Contract

Mobile capture must:

- Feel instant.
- Avoid visible “processing” state.
- Avoid queue indicators.
- Avoid background inference.

Capture = append-only write to Unassigned.

Inference runs only upon placement.

---

## 9. Real-Time Visibility

After mobile save:

Opening INDEX → Unassigned shows item immediately.

Consistency between:

- Chrome extension
- PWA
- Web app

is required.

---

## 10. Non-Goals (v2)

The PWA will NOT:

- Auto-assign to last-used project
- Suggest projects
- Infer identity container
- Show structural preview
- Detect transcript boundaries
- Expand surrounding context automatically

All placement decisions remain inside INDEX.

---

## 11. Relationship to Product Direction

Mobile capture reinforces:

- Quick-save as dominant ingestion method.
- Chunk-by-chunk structural capture.
- Reduced reliance on full chat import.
- INDEX as connective glue across all AI surfaces.

This surface must feel:

- Lightweight
- Predictable
- Calm
- Immediate

---

## Status: Canonical Behavior

This specification defines the required behavior for:

- Mobile PWA capture
- Share-sheet ingestion
- Clipboard-assisted capture

All mobile capture implementations must conform to this contract.