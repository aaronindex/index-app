// lib/ai/reduction.ts
// Shared types for reduction diagnostics (no raw content).

export type ReductionDiagnostics = {
  capture_id: string;
  mode: 'discard_after_reduce' | 'durable' | 'other';
  input: {
    bytes: number;
    approx_tokens?: number;
    detected_format?: 'chat_roles' | 'email_thread' | 'plain' | 'unknown';
    role_parse: {
      had_explicit_roles: boolean;
      normalized_roles: boolean;
      warnings: string[];
    };
  };
  output: {
    extracted: { decisions: number; tasks: number; highlights: number };
    persisted: { decisions: number; tasks: number; highlights: number };
    dropped: {
      decisions: number;
      tasks: number;
      highlights: number;
      reasons: Record<string, number>;
    };
  };
  warnings: string[];
  errors: string[];
  meta?: {
    source_discarded?: boolean;
  };
};

export function createEmptyDiagnostics(params: {
  capture_id: string;
  mode: ReductionDiagnostics['mode'];
}): ReductionDiagnostics {
  return {
    capture_id: params.capture_id,
    mode: params.mode,
    input: {
      bytes: 0,
      role_parse: {
        had_explicit_roles: false,
        normalized_roles: false,
        warnings: [],
      },
    },
    output: {
      extracted: { decisions: 0, tasks: 0, highlights: 0 },
      persisted: { decisions: 0, tasks: 0, highlights: 0 },
      dropped: {
        decisions: 0,
        tasks: 0,
        highlights: 0,
        reasons: {},
      },
    },
    warnings: [],
    errors: [],
    meta: {},
  };
}

