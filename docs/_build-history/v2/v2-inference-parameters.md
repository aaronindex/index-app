# v2 Inference Parameters

## Purpose
Centralized configuration for structural inference thresholds.

Values are intentionally flexible during early rollout.

---

## Temporal Windows

ARC_ACTIVE_WINDOW_DAYS = 30
PHASE_MIN_DURATION_DAYS = 3
PULSE_DEBOUNCE_HOURS = 24

---

## Threshold Logic

TENSION_SCORE_THRESHOLD = 0.7
STATE_CHANGE_MINIMUM = 0.15

Snapshot regeneration occurs ONLY when:
new_state_hash != previous_state_hash

---

## Editorial Constraints

- No anticipatory signals
- Only threshold-crossing pulses
- Snapshot tone must remain descriptive