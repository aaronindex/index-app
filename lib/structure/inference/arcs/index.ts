// lib/structure/inference/arcs/index.ts
// Arc inference module exports

export type { ArcSegment } from './arc.segment';
export { segmentSignalsIntoArcs, ARC_GAP_DAYS, ARC_ACTIVE_WINDOW_DAYS } from './arc.segment';
export { computeArcStatus } from './arc.status';
export { upsertArcAndLinks } from './arc.upsert';
export { computeDecisionDensityBucket, computeResultDensityBucket } from './arc.density';
export { inferArcsAndBuildState } from './arc.infer';
