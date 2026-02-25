// lib/structure/inference/arcs/arc.density.ts
// Computes density buckets for decisions and results
// Structural only - no interpretation

import { roundBucket } from '../../hash';

/**
 * Calculate days between two ISO timestamps
 */
function daysBetween(iso1: string, iso2: string): number {
  const date1 = new Date(iso1);
  const date2 = new Date(iso2);
  const diffMs = Math.abs(date2.getTime() - date1.getTime());
  return diffMs / (1000 * 60 * 60 * 24);
}

/**
 * Compute decision density bucket
 * 
 * Rules:
 * - density = count / max(spanDays, 1)
 * - bucket/round using roundBucket() helper (2 decimals)
 * - Goes into state hash payload
 * - Structural only - no interpretation
 * 
 * @param totalDecisions - Total number of decisions
 * @param spanDays - Time span in days
 * @returns Rounded density bucket (2 decimals)
 */
export function computeDecisionDensityBucket(
  totalDecisions: number,
  spanDays: number
): number {
  const density = totalDecisions / Math.max(spanDays, 1);
  return roundBucket(density, 2);
}

/**
 * Compute result density bucket
 * 
 * Rules:
 * - density = count / max(spanDays, 1)
 * - bucket/round using roundBucket() helper (2 decimals)
 * - Goes into state hash payload
 * - Structural only - no interpretation
 * 
 * @param totalResults - Total number of results
 * @param spanDays - Time span in days
 * @returns Rounded density bucket (2 decimals)
 */
export function computeResultDensityBucket(
  totalResults: number,
  spanDays: number
): number {
  const density = totalResults / Math.max(spanDays, 1);
  return roundBucket(density, 2);
}
