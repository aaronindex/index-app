# Quick Capture Specification — INDEX v2

## Purpose

Define the primary ingestion mode for INDEX v2.

Quick Capture enables frictionless structural elevation
without turning INDEX into a thinking surface.

---

## Position in System

Quick Capture feeds:

capture_event  
→ ingestion_event  
→ arc scoring  
→ phase inference  
→ tension scoring  
→ state_hash compute  

No alternate inference path exists.

Quick Capture does not bypass structure.

---

## Design Principles

- Deliberate user gesture required.
- No ambient logging.
- No chat interface.
- No back-and-forth loop.
- Reduction precedes organization.
- Raw content never exported.

---

## Capture Flow (In-App)

1. User pastes content.
2. System runs lightweight reduction pass.
3. Structural candidates are surfaced.
4. User assigns project (if not already).
5. Structural changes persist.

Project assignment may occur after candidate detection.

---

## Inference Profile: micro_capture

micro_capture differs from thread_import:

- Lower confidence threshold for candidate detection.
- More tolerant of ambiguous speaker roles.
- Temporal inference may operate at low precision.
- Arc attachment may defer until sufficient signal exists.

Inference profile selection must not alter state_hash semantics.

---

## Capture Capsule Contract

Internal-only shape:

{
  content: string,
  source: 'clipboard' | 'browser' | 'email' | 'slack',
  captured_at: timestamp,
  thinking_time?: timestamp | temporal_range,
  project_id?: uuid,
  inference_profile: 'micro_capture'
}

Raw content is not externally accessible.

Only structural outcomes persist.

---

## Guardrails

Quick Capture must never:

- become a journaling surface
- store draft thinking
- expose editorial language externally
- create conversational state

INDEX remains a structural ledger.