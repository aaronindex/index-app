# 📘 INDEX v2 — Chrome Extension Specification

## 1. Purpose

The Chrome Extension enables **real-time capture of thinking** without interrupting cognitive flow.

It exists to:

- Meet users where thinking occurs (GPT, Claude, docs, Slack, etc.)
- Remove post-session import friction
- Support chunk-by-chunk capture during active thought
- Preserve INDEX’s reductive stance

The extension is a capture surface only.

It is not:
- A thinking interface
- A summarization tool
- An inference surface
- A structural visualization tool

---

## 2. Core Principles

1. Capture must feel instant.
2. Default flow must require zero decisions.
3. No structural inference occurs at capture.
4. No automatic container guessing.
5. No transcript parsing.
6. No silent truncation.
7. Structural activation happens only after assignment inside INDEX.

---

## 3. Primary Interaction

### Default Command

Highlight text → Keyboard Shortcut  
(e.g., `Cmd + Shift + I`)

Behavior:

- Selection is saved immediately to Unassigned.
- No modal opens.
- No project selection required.
- No inference triggered.

Confirmation:

Toast:
> Saved to Unassigned ✓  
> (Assign) (Undo)

Toast auto-dismisses after short delay.

---

## 4. Secondary Interaction (Deliberate Placement)

### Send & Assign

Triggered via:

- Right-click → Send & Assign…
- Alternate shortcut (e.g., `Cmd + Shift + Option + I`)
- Toolbar menu option

Opens minimal modal.

---

## 5. Assign Modal (Extension Version)

Modal contents:

**Place into:**  
[ Project dropdown (searchable) ]  
(Includes Me)

**Source handling:**  
- • Keep full capture (default)  
- • Keep structural results only  

Button:

> Assign & Save

Behavior:

- Saves capture.
- Immediately places into selected container.
- Triggers structural inference.
- Closes modal.

---

## 6. Capture Content Rules

The extension stores:

- Raw selected text
- Capture timestamp
- Source URL (if available)
- Source type (extension)

It does not:

- Parse roles
- Normalize speakers
- Strip metadata
- Run interpretation
- Chunk content automatically

Selected text defines scope.

If user needs context, they expand their highlight.

---

## 7. Size Limits

### Soft Limit (example: ~150K characters)

If selection exceeds soft limit:

- Allow save.
- Show calm warning:
  > Large capture detected.

No blocking.

---

### Hard Limit (example: ~300K characters)

If selection exceeds hard limit:

- Prevent save.
- Display message:
  > Selection too large. Please reduce selection or use Chat Import.

No silent truncation.
No automatic chunking.

---

## 8. Performance Contract

Quick-save must:

- Feel instantaneous.
- Not show loading spinners.
- Not display “processing…” state.
- Not queue inference jobs.

The extension performs only:

- Auth check
- Text write
- Confirmation

Inference occurs later upon assignment inside INDEX.

---

## 9. Repeated Chunk Pattern (Primary Use Case)

Expected usage pattern:

Think  
Refine  
Highlight exchange (user + AI)  
Shortcut → Save  
Continue  

Repeat 5–20 times per session.

This is the intended dominant ingestion behavior.

---

## 10. Full-Chat Selection

If user selects entire chat and saves:

- Treated as raw text.
- Stored in Unassigned.
- No special handling.
- No transcript detection logic required.

Chat Import remains available for structured transcript ingestion.

---

## 11. Undo Behavior

After save:

Toast includes:
- Undo (removes capture from Unassigned)

Undo window:
Short duration (e.g., 5–8 seconds).

After dismissal, removal must be done inside INDEX.

---

## 12. Authentication

Extension requires:

- Logged-in INDEX account
- Active session

If not authenticated:

- Prompt login in new tab
- Preserve selection if possible

Authentication flow must not corrupt or lose selection silently.

---

## 13. Non-Goals (v2)

The extension will NOT:

- Suggest projects
- Auto-detect identity container
- Provide inference previews
- Offer summarization
- Detect transcript structure
- Automatically expand surrounding context
- Auto-assign to last-used project

Intentional placement remains inside INDEX.

---

## 14. Relationship to Unassigned

All default quick-saves land in:

> Unassigned

Unassigned is inert.

Only after assignment does:

- Structural inference run
- Direction update
- Shifts update
- State_hash update

This preserves the activation boundary.

---

## Status: Canonical Behavior

This specification defines the required behavior for:

- Desktop capture flow
- Chunk-by-chunk ingestion
- Real-time capture

All Chrome Extension implementations must conform to this contract.