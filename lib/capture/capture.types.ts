// lib/capture/capture.types.ts
// Canonical Capture input types (server-side gesture only).

export type CaptureContainer =
  | { kind: 'me' }
  | { kind: 'project'; project_id: string };

export type CaptureSourceMode = 'durable' | 'discard_after_reduce';

export type CaptureSourceType = 'text' | 'chat' | 'email' | 'slack' | 'extension';

export type CreateCaptureRequest = {
  container: CaptureContainer;                 // REQUIRED
  source_mode?: CaptureSourceMode;             // default 'durable'
  source_type?: CaptureSourceType;             // default 'text'
  content: string;                             // REQUIRED, raw input
  thinking_choice?: 'today' | 'yesterday' | 'last_week' | 'last_month'; // optional override; default 'today'
  metadata?: Record<string, any>;              // optional, internal-only (never exported)
};

