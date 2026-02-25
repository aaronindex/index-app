// lib/structure/hash/stateHash.normalize.ts
// Normalization utilities for structural state payload
// Ensures deterministic hash generation by sorting and validating

import type { StructuralStatePayload } from './stateHash.types';

/**
 * Normalize structural state payload
 * 
 * Rules:
 * - Sort all arrays (active_arc_ids, active_phase_ids, tension_edges, pulse_types)
 * - Sort keys deterministically when building Record-derived structures
 * - Round all bucketed numeric values to 2 decimals
 * - Ensure no undefined / NaN exists (throw if so)
 * 
 * @param payload - Raw structural state payload
 * @returns Normalized payload ready for hashing
 * @throws Error if payload contains invalid values
 */
export function normalizeStructuralState(
  payload: StructuralStatePayload
): StructuralStatePayload {
  // Validate arrays exist and are arrays
  if (!Array.isArray(payload.active_arc_ids)) {
    throw new Error('[stateHash] normalizeStructuralState: active_arc_ids must be an array');
  }
  if (!Array.isArray(payload.active_phase_ids)) {
    throw new Error('[stateHash] normalizeStructuralState: active_phase_ids must be an array');
  }
  if (!Array.isArray(payload.tension_edges)) {
    throw new Error('[stateHash] normalizeStructuralState: tension_edges must be an array');
  }
  if (!Array.isArray(payload.pulse_types)) {
    throw new Error('[stateHash] normalizeStructuralState: pulse_types must be an array');
  }

  // Validate numeric buckets
  if (typeof payload.decision_density_bucket !== 'number' || isNaN(payload.decision_density_bucket)) {
    throw new Error('[stateHash] normalizeStructuralState: decision_density_bucket must be a valid number');
  }
  if (typeof payload.result_density_bucket !== 'number' || isNaN(payload.result_density_bucket)) {
    throw new Error('[stateHash] normalizeStructuralState: result_density_bucket must be a valid number');
  }

  // Validate Records exist and are objects
  if (typeof payload.arc_statuses !== 'object' || payload.arc_statuses === null || Array.isArray(payload.arc_statuses)) {
    throw new Error('[stateHash] normalizeStructuralState: arc_statuses must be an object');
  }
  if (typeof payload.arc_last_signal_buckets !== 'object' || payload.arc_last_signal_buckets === null || Array.isArray(payload.arc_last_signal_buckets)) {
    throw new Error('[stateHash] normalizeStructuralState: arc_last_signal_buckets must be an object');
  }
  if (typeof payload.phase_statuses !== 'object' || payload.phase_statuses === null || Array.isArray(payload.phase_statuses)) {
    throw new Error('[stateHash] normalizeStructuralState: phase_statuses must be an object');
  }
  if (typeof payload.phase_last_signal_buckets !== 'object' || payload.phase_last_signal_buckets === null || Array.isArray(payload.phase_last_signal_buckets)) {
    throw new Error('[stateHash] normalizeStructuralState: phase_last_signal_buckets must be an object');
  }
  if (typeof payload.friction_score_buckets !== 'object' || payload.friction_score_buckets === null || Array.isArray(payload.friction_score_buckets)) {
    throw new Error('[stateHash] normalizeStructuralState: friction_score_buckets must be an object');
  }

  // Sort arrays deterministically
  const sortedActiveArcIds = [...payload.active_arc_ids].sort();
  const sortedActivePhaseIds = [...payload.active_phase_ids].sort();
  const sortedTensionEdges = [...payload.tension_edges].sort();
  const sortedPulseTypes = [...payload.pulse_types].sort();

  // Normalize Records: sort keys and validate values
  const normalizeRecord = <T>(record: Record<string, T>, validator?: (value: T) => boolean): Record<string, T> => {
    const sortedKeys = Object.keys(record).sort();
    const normalized: Record<string, T> = {};
    
    for (const key of sortedKeys) {
      const value = record[key];
      if (value === undefined || value === null) {
        throw new Error(`[stateHash] normalizeStructuralState: undefined/null value in record for key: ${key}`);
      }
      if (validator && !validator(value)) {
        throw new Error(`[stateHash] normalizeStructuralState: invalid value in record for key: ${key}`);
      }
      normalized[key] = value;
    }
    
    return normalized;
  };

  // Normalize numeric record (friction_score_buckets) - round values
  const normalizeNumericRecord = (record: Record<string, number>): Record<string, number> => {
    const sortedKeys = Object.keys(record).sort();
    const normalized: Record<string, number> = {};
    
    for (const key of sortedKeys) {
      const value = record[key];
      if (typeof value !== 'number' || isNaN(value)) {
        throw new Error(`[stateHash] normalizeStructuralState: invalid number in friction_score_buckets for key: ${key}`);
      }
      normalized[key] = Math.round(value * 100) / 100; // Round to 2 decimals
    }
    
    return normalized;
  };

  return {
    active_arc_ids: sortedActiveArcIds,
    arc_statuses: normalizeRecord(payload.arc_statuses, (v) => typeof v === 'string'),
    arc_last_signal_buckets: normalizeRecord(payload.arc_last_signal_buckets, (v) => typeof v === 'string'),
    
    active_phase_ids: sortedActivePhaseIds,
    phase_statuses: normalizeRecord(payload.phase_statuses, (v) => typeof v === 'string'),
    phase_last_signal_buckets: normalizeRecord(payload.phase_last_signal_buckets, (v) => typeof v === 'string'),
    
    tension_edges: sortedTensionEdges,
    friction_score_buckets: normalizeNumericRecord(payload.friction_score_buckets),
    
    decision_density_bucket: Math.round(payload.decision_density_bucket * 100) / 100,
    result_density_bucket: Math.round(payload.result_density_bucket * 100) / 100,
    
    pulse_types: sortedPulseTypes,
  };
}
