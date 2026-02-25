// lib/structure/hash/stateHash.compute.ts
// Deterministic state hash computation
// Produces stable hash fingerprint of normalized structural state

import crypto from 'crypto';
import type { StructuralStatePayload } from './stateHash.types';
import { normalizeStructuralState } from './stateHash.normalize';

/**
 * Compute deterministic state hash from structural payload
 * 
 * Process:
 * 1. Normalize payload (sort arrays, sort record keys, round numbers)
 * 2. Stringify normalized payload (deterministic JSON)
 * 3. SHA256 hash the string
 * 4. Return hex digest
 * 
 * Must produce identical hash across environments for same structural state.
 * 
 * @param payload - Structural state payload
 * @returns SHA256 hash hex string
 * @throws Error if payload is invalid or normalization fails
 */
export function computeStateHash(payload: StructuralStatePayload): string {
  // Normalize first (validates and sorts)
  const normalized = normalizeStructuralState(payload);
  
  // Stringify with deterministic JSON
  // Since normalization already sorts arrays and record keys,
  // we can use JSON.stringify directly. However, to ensure top-level
  // key ordering is deterministic, we reconstruct the object with sorted keys.
  const sortedKeys = Object.keys(normalized).sort();
  const sortedPayload: Record<string, unknown> = {};
  for (const key of sortedKeys) {
    sortedPayload[key] = normalized[key as keyof StructuralStatePayload];
  }
  
  const jsonString = JSON.stringify(sortedPayload);
  
  // Compute SHA256 hash
  const hash = crypto.createHash('sha256').update(jsonString).digest('hex');
  
  return hash;
}
