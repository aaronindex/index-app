# Temporal Model

INDEX distinguishes between thinking time and ingestion time.

Thinking time represents when the thinking occurred.
Ingestion time represents when an artifact entered INDEX.

Structural inference operates exclusively on thinking time.

Ingestion time is used for system bookkeeping only.

---

## Temporal Windows

Artifacts may carry precise timestamps or loose temporal ranges.

Loose ranges may include:
- today
- this week
- last week
- this month
- last month

Temporal precision is not required.
Structural inference operates on temporal shape, not exact moments.

---

## Temporal Confidence

Thinking time may be:

- derived from source timestamps
- loosely set by the user
- estimated when unclear

Temporal uncertainty does not prevent inference.
Uncertainty is editorially silent unless structurally relevant.

---

## Micro Capture Temporal Semantics

Micro Capture defaults:

- captured_at is system-generated.
- thinking_time may be unset at capture.

If thinking_time is not explicitly provided:

- It may be treated as:
  - equal to captured_at for ordering purposes only
  - or as low-confidence temporal data

Inference must not assume precise thinking time
when micro-capture context is minimal.

Temporal uncertainty is structurally tolerated.

Temporal shape matters more than timestamp precision.

---

## Temporal Integrity Constraint

Micro Capture must not distort temporal history.

If a captured artifact clearly references past thinking,
the system may:

- request clarification
- allow loose range assignment
- infer approximate window

Temporal inference must preserve structural reality,
not ingestion convenience.

---

## Temporal Principle

INDEX models event time, not observation time.
Structure reflects when thinking occurred, not when it was imported.