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

## Temporal Principle

INDEX models event time, not observation time.
Structure reflects when thinking occurred, not when it was imported.