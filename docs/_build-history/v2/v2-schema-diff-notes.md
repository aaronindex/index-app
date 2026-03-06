# v2 Schema Diff Notes

## Purpose
Tracks how new structural tables integrate with existing INDEX v1 schema.

INDEX v1 already includes:
- projects
- conversations
- decisions
- highlights
- tasks
- themes (legacy)

v2 introduces structural interpretation layers.

---

## New Tables

### arcs
Materialized cross-project structures inferred from decisions/highlights.

Key Fields:
- id
- owner_id
- title
- scope (project/global)
- state_hash
- created_at

---

### phases
Temporal segments within arcs.

Key Fields:
- id
- arc_id
- label
- started_at
- ended_at
- state_hash

---

### pulses
Structural events surfaced editorially.

Key Fields:
- id
- arc_id
- type
- headline
- occurred_at
- state_hash

---

### snapshot_state
Single authoritative structural snapshot.

Key Fields:
- id
- scope (project/global)
- state_hash
- snapshot_text
- field_note_text
- generated_at

---

## Relationship to Existing Tables

decisions/highlights/messages
    ↓
structureProcessor
    ↓
arcs/phases/pulses/snapshot_state

Themes table remains legacy; may be used as clustering seed during early inference.