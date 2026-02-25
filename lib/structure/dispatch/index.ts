// lib/structure/dispatch/index.ts
// Structure dispatch module exports

export type {
  StructureRecomputeReason,
  DispatchStructureRecomputeParams,
} from './dispatch.types';

export { generateDebounceKey } from './dispatch.debounce';
export { dispatchStructureRecompute } from './dispatch.enqueue';
