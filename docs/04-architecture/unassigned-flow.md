# 📘 INDEX v2 — Unassigned Flow Specification

## 1. Purpose

Unassigned is a **temporary staging shelf** for captured thinking.

It exists to:

- Preserve flow during capture.
- Prevent premature container decisions.
- Protect structural purity.
- Allow intentional placement.

Unassigned is not an inbox.  
Unassigned is not a backlog.  
Unassigned is not part of structural inference.

---

## 2. Structural Status

Unassigned captures are **structurally inert**.

They:

- ❌ Do not participate in Direction inference  
- ❌ Do not contribute to Shifts  
- ❌ Do not affect state_hash  
- ❌ Do not influence tension scoring  
- ❌ Do not appear in Ask context  
- ❌ Do not appear in digest summaries  

They are dormant until placed.

Structural activation occurs only after:

- Assignment to Project
- Assignment to Me (Self)

---

## 3. Navigation & Labeling

Navigation label:

> **Unassigned**

Subheading:

> Not yet placed into a project.

No urgency language.  
No warning tone.

Optional:

- A subtle neutral dot indicator if items > 0.
- No numeric badge.
- No red counts.

Unassigned must feel calm.

---

## 4. Default Landing Behavior

All instant quick-saves land in Unassigned.

Sources include:

- Chrome extension quick-save
- PWA clipboard capture
- Share target (future)
- Chat import fallback

Landing is:

- Immediate
- No inference triggered
- No background processing required

---

## 5. Card Design (Single Item)

Each Unassigned item displays:

- Title (derived from first line / truncated text)
- Metadata (e.g., message count or capture size)
- Created date

Primary action:

> **Assign ▾**

Secondary action:

> Delete (demoted text link)

No additional primary buttons.

---

## 6. Assignment Flow

Clicking **Assign ▾** opens a minimal modal.

### Modal Contents

**Place into:**  
[ Project dropdown (searchable) ]  
(Include Me as an option)

**Source handling:**  
- • Keep full capture (default)  
- • Keep structural results only  

Button:

> Assign

---

### Behavior: Keep Full Capture (Default)

- Capture moves to selected container.
- Structural inference runs.
- Source remains durable.
- Capture becomes active.

---

### Behavior: Keep Structural Results Only  
*(Previously: Reduce & Discard Source)*

- System performs ephemeral interpretation.
- Generates structural outputs (Decisions / Tasks).
- Removes original capture text.
- Structural outputs are placed into selected container.
- Capture record is removed.

No second confirmation modal required unless destructive UX standards require it.

---

## 7. Bulk Assignment

Users may multi-select Unassigned items.

Bulk Assign:

- Opens same modal.
- Placement applies to all selected.
- Source handling choice applies to all selected.

Default:

Keep full capture.

This ensures consistency across single and bulk flows.

---

## 8. Delete Behavior

Delete removes the capture permanently.

Delete:

- Does not trigger inference.
- Does not generate structural outputs.
- Is irreversible (unless undo toast provided).

Delete is visually demoted to avoid competing with Assign.

---

## 9. Activation Moment

Structural inference is triggered only when:

- An item leaves Unassigned via Assign.

This is the activation boundary.

This boundary ensures:

- Quick-save remains instant.
- Inference cost is deferred.
- Structure only emerges from intentional placement.

---

## 10. Edge Cases

### Large Capture

If capture is large but within allowed limit:

- It lands in Unassigned normally.
- No processing occurs until assignment.

If capture exceeds hard limit:

- Prevent save.
- Provide calm message:
  > Selection too large. Please reduce selection or use Chat Import.

No silent truncation.

---

### Abandoned Items

If user never assigns:

- Item remains inert.
- No structural effect.
- No reminders or alerts required.

Unassigned is self-clearing by behavior, not enforcement.

---

### Reduce & Discard on Ambiguous Content

If ephemeral interpretation yields no structural outputs:

- Remove capture.
- No structural event created.

This preserves:

> If no structural output is saved, no structural event occurred.

---

## 11. Visual Tone

Unassigned must feel:

- Calm
- Finite
- Lightweight
- Non-urgent

It should feel like:

Sorting a small stack of cards.

Not clearing a backlog.

---

## 12. Relationship to Containers

Container Model:

- Projects → active structural domains
- Me (Self) → identity domain
- Unassigned → inert staging

Unassigned is not a peer to Projects structurally.
It is pre-structure.

---

## 13. Product Philosophy Reinforcement

Unassigned reinforces a core INDEX idea:

> INDEX is not a place to store things.  
> It is a place to place things.

Capture precedes context.  
Context precedes structure.  
Structure precedes reflection.

---

## Status: Canonical Behavior

This spec defines the authoritative behavior for:

- Chrome extension quick-save
- PWA clipboard capture
- Share target capture (future)
- Chat import fallback

All ingestion surfaces must conform to this Unassigned contract.