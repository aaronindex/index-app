// lib/structure/inference/phases/index.ts
// Phase inference module exports

export type { PhaseSegment } from './phase.segment';
export { segmentArcIntoPhases, PHASE_GAP_DAYS, PHASE_ACTIVE_WINDOW_DAYS } from './phase.segment';
export { computePhaseStatus } from './phase.status';
export { upsertPhase } from './phase.upsert';
export { inferPhasesForArcs } from './phase.infer';
