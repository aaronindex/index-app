# Snapshot Generation Prompt — Builder Template

## Purpose
Generate:
- a single shared field note (short, dense)
- a snapshot lens (current reality)
from current structural state.

Generation is gated by state_hash change.

Snapshots are not summaries.
They are editorial lenses on present structure.

---

## Inputs Provided to Generator
- active arcs (with brief internal summaries)
- active phases (with brief internal summaries)
- pulses emitted in this structural moment (headlines only)
- recent decisions/results (condensed references)
- recency/compression context

---

## Output Requirements

### Field Note
- 1 block
- short, dense
- “thoughtful field note” tone
- strictly descriptive

### Snapshot
- editorial lens on current reality
- may reorganize framing to match state
- must not feel ever-shifting (only updates on state change)

---

## Tone Guardrails (Hard)
- no “you”
- no suggestions
- no coaching verbs
- no psychological framing
- no manifesto voice

Target: dry but not sterile.

---

## Example Instruction (Pseudo-Prompt)
"You are generating a calm structural briefing.
Write one shared field note describing the current structural moment.
Then write the current snapshot as a quiet structural report.
Do not suggest actions. Do not interpret meaning."

---

## Stability Rules
- If state_hash unchanged: do not regenerate.
- If changed: regenerate both and store in snapshot_state.

Store the exact generated text as the authoritative snapshot until the next state change.