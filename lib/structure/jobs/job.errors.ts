// lib/structure/jobs/job.errors.ts
// Explicit error classes for structure jobs

/**
 * Error thrown when thinking time cannot be determined
 * Wraps signal collector errors
 */
export class MissingThinkingTimeError extends Error {
  constructor(message: string, public readonly context?: Record<string, unknown>) {
    super(`[StructureJob] Missing thinking time: ${message}`);
    this.name = 'MissingThinkingTimeError';
  }
}

/**
 * Error thrown when job is not found
 */
export class JobNotFoundError extends Error {
  constructor(jobId: string) {
    super(`[StructureJob] Job not found: ${jobId}`);
    this.name = 'JobNotFoundError';
  }
}

/**
 * Error thrown when job is in invalid state for operation
 */
export class JobStateError extends Error {
  constructor(jobId: string, expectedStatus: string, actualStatus: string) {
    super(`[StructureJob] Job ${jobId} is in state ${actualStatus}, expected ${expectedStatus}`);
    this.name = 'JobStateError';
  }
}
