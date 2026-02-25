// lib/structure/signals/index.ts
// Structural signal module exports

export type { StructuralSignal, StructuralSignalKind } from './signal.types';
export { generateSignalId, midpoint, assertThinkingTime } from './signal.types';
export { sortSignals } from './signal.sort';
export { collectStructuralSignals } from './signal.collector';
