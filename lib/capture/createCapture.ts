// lib/capture/createCapture.ts
// Canonical Capture implementation + reduction diagnostics for discard_after_reduce.

import type { SupabaseClient } from '@supabase/supabase-js';
import { coarseWindowToThinkingRange, type CoarseWindow } from '@/lib/time/coarseWindow';
import { extractInsights, type InsightExtractionResult } from '@/lib/ai/insights';
import { dispatchStructureRecompute } from '@/lib/structure/dispatch';
import { normalizeTranscriptForReduction } from '@/lib/reduce/normalizeTranscript';
import { createEmptyDiagnostics, type ReductionDiagnostics } from '@/lib/ai/reduction';
import type {
  CaptureContainer,
  CaptureSourceMode,
  CaptureSourceType,
  CreateCaptureRequest,
} from './capture.types';

export type CaptureOutcomesCounts = {
  decisions: number;
  tasks: number;
  highlights: number;
};

export type CreateCaptureResult = {
  capture_id: string;
  container: CaptureContainer;
  source_mode: CaptureSourceMode;
  outcomes: CaptureOutcomesCounts;
  diagnostics?: ReductionDiagnostics;
  structure_job_enqueued: boolean;
};

const VALID_THINKING_CHOICES: CoarseWindow[] = [
  'today',
  'yesterday',
  'last_week',
  'last_month',
];

export async function createCapture(opts: {
  supabase: SupabaseClient;
  userId: string;
  request: CreateCaptureRequest;
}): Promise<CreateCaptureResult> {
  const { supabase, userId, request } = opts;

  const {
    container,
    content,
    source_mode = 'durable',
    source_type = 'text',
    thinking_choice,
    metadata,
  } = request;

  if (!content || typeof content !== 'string' || !content.trim()) {
    throw new Error('content is required');
  }

  if (!container || (container.kind !== 'me' && container.kind !== 'project')) {
    throw new Error('Invalid container');
  }

  if (container.kind === 'project' && !container.project_id) {
    throw new Error('project_id is required for project container');
  }

  const choice: CoarseWindow =
    thinking_choice && VALID_THINKING_CHOICES.includes(thinking_choice as CoarseWindow)
      ? (thinking_choice as CoarseWindow)
      : 'today';

  const nowIso = new Date().toISOString();
  const { start_at, end_at } = coarseWindowToThinkingRange({
    choice,
    nowIso,
  });

  // Optional: verify project belongs to user when container.kind === 'project'
  if (container.kind === 'project') {
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', container.project_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (projectError || !project) {
      throw new Error('Project not found');
    }
  }

  // Create conversation as canonical capture source
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .insert({
      user_id: userId,
      import_id: null,
      title: null,
      source: 'capture',
      started_at: start_at,
      ended_at: end_at,
      parent_conversation_id: null,
      origin_highlight_id: null,
      is_inactive: false,
    })
    .select()
    .single();

  if (convError || !conversation) {
    throw new Error(convError?.message || 'Failed to create capture conversation');
  }

  const conversationId = conversation.id as string;

  // Link to project container if applicable
  if (container.kind === 'project') {
    const { error: linkError } = await supabase
      .from('project_conversations')
      .insert({
        project_id: container.project_id,
        conversation_id: conversationId,
      });

    if (linkError) {
      throw new Error(linkError.message || 'Failed to link capture to project');
    }
  }

  // Store raw source as a single user message
  const basePayload: Record<string, any> = {
    source_type,
    source_mode,
  };
  if (metadata && typeof metadata === 'object') {
    basePayload.metadata = metadata;
  }

  const { data: message, error: msgError } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      role: 'user',
      content,
      index_in_conversation: 0,
      source_message_id: null,
      raw_payload: basePayload,
    })
    .select('id, content, raw_payload')
    .single();

  if (msgError || !message) {
    throw new Error(msgError?.message || 'Failed to create capture message');
  }

  const outcomes: CaptureOutcomesCounts = {
    decisions: 0,
    tasks: 0,
    highlights: 0,
  };

  let diagnostics: ReductionDiagnostics | undefined;

  const projectIdForOutcomes =
    container.kind === 'project' ? container.project_id : null;

  if (source_mode === 'discard_after_reduce') {
    diagnostics = await runReductionForCapture({
      supabase,
      userId,
      conversationId,
      projectId: projectIdForOutcomes,
      source_mode,
      rawContent: content,
      outcomes,
    });
  }

  // Dispatch structure recompute (reason: ingestion)
  let structureJobEnqueued = false;
  try {
    await dispatchStructureRecompute({
      supabaseClient: supabase,
      user_id: userId,
      scope: 'user',
      reason: 'ingestion',
    });
    structureJobEnqueued = true;
  } catch (dispatchError) {
    console.error('[Capture] Failed to dispatch structure recompute:', dispatchError);
  }

  return {
    capture_id: conversationId,
    container,
    source_mode,
    outcomes,
    diagnostics,
    structure_job_enqueued: structureJobEnqueued,
  };
}

async function runReductionForCapture(params: {
  supabase: SupabaseClient;
  userId: string;
  conversationId: string;
  projectId: string | null;
  source_mode: CaptureSourceMode;
  rawContent: string;
  outcomes: CaptureOutcomesCounts;
}): Promise<ReductionDiagnostics> {
  const { supabase, userId, conversationId, projectId, source_mode, rawContent, outcomes } =
    params;

  const diagnostics = createEmptyDiagnostics({
    capture_id: conversationId,
    mode: source_mode === 'discard_after_reduce' ? 'discard_after_reduce' : 'durable',
  });

  const normalized = normalizeTranscriptForReduction(rawContent);
  diagnostics.input.detected_format = normalized.detected_format;
  diagnostics.input.role_parse.had_explicit_roles = normalized.had_explicit_roles;
  diagnostics.input.role_parse.normalized_roles = normalized.normalized_roles;
  diagnostics.input.role_parse.warnings.push(...normalized.warnings);

  const joinedText = normalized.messages.map((m) => m.content).join('\n\n');
  diagnostics.input.bytes = Buffer.byteLength(joinedText, 'utf8');
  diagnostics.input.approx_tokens = Math.round(joinedText.length / 4);

  if (normalized.messages.length === 0) {
    diagnostics.warnings.push('no_messages_after_normalization');
    return finalizeDiagnosticsZero(diagnostics, 'no_actionable_items');
  }

  // 1) Extract insights from normalized messages
  const conversationContent = {
    id: conversationId,
    title: null as string | null,
    messages: normalized.messages.map((m, idx) => ({
      role: m.role,
      content: m.content,
      index_in_conversation: idx,
    })),
  };

  const outcome = await extractInsights(conversationContent);
  const insights: InsightExtractionResult =
    outcome && typeof outcome === 'object' && 'result' in outcome
      ? (outcome as { result: InsightExtractionResult }).result
      : (outcome as InsightExtractionResult);

  const extractedDecisions = insights.decisions.length;
  const extractedTasks =
    insights.commitments.length + insights.blockers.length + insights.openLoops.length;
  const extractedHighlights = insights.suggestedHighlights.length;

  diagnostics.output.extracted.decisions = extractedDecisions;
  diagnostics.output.extracted.tasks = extractedTasks;
  diagnostics.output.extracted.highlights = extractedHighlights;

  // 2) Persist decisions
  let decisionsPersisted = 0;
  for (const decision of insights.decisions) {
    const { data: decisionRecord, error: decisionError } = await supabase
      .from('decisions')
      .insert({
        user_id: userId,
        conversation_id: conversationId,
        title: decision.title,
        content:
          decision.content +
          (decision.context ? `\n\nContext: ${decision.context}` : ''),
      })
      .select()
      .single();

    if (decisionError) {
      diagnostics.errors.push('decision_insert_failed');
      incrementReason(diagnostics, 'decision_insert_failed');
    } else if (decisionRecord) {
      decisionsPersisted += 1;
    }
  }

  diagnostics.output.persisted.decisions = decisionsPersisted;

  // 3) Persist tasks from commitments, blockers, open loops
  let tasksPersisted = 0;

  for (const commitment of insights.commitments) {
    const { data: taskRecord, error: taskError } = await supabase
      .from('tasks')
      .insert({
        user_id: userId,
        project_id: projectId,
        conversation_id: conversationId,
        title: commitment.title,
        description: `[Commitment] ${commitment.content}${
          commitment.context ? `\n\nContext: ${commitment.context}` : ''
        }`,
        status: 'open',
        source_query: 'AI Insight Extraction',
      })
      .select()
      .single();

    if (taskError) {
      diagnostics.errors.push('commitment_insert_failed');
      incrementReason(diagnostics, 'commitment_insert_failed');
    } else if (taskRecord) {
      tasksPersisted += 1;
    }
  }

  for (const blocker of insights.blockers) {
    const { data: taskRecord, error: taskError } = await supabase
      .from('tasks')
      .insert({
        user_id: userId,
        project_id: projectId,
        conversation_id: conversationId,
        title: blocker.title,
        description: `[Blocker] ${blocker.content}${
          blocker.context ? `\n\nContext: ${blocker.context}` : ''
        }`,
        status: 'open',
        source_query: 'AI Insight Extraction',
      })
      .select()
      .single();

    if (taskError) {
      diagnostics.errors.push('blocker_insert_failed');
      incrementReason(diagnostics, 'blocker_insert_failed');
    } else if (taskRecord) {
      tasksPersisted += 1;
    }
  }

  for (const openLoop of insights.openLoops) {
    const { data: taskRecord, error: taskError } = await supabase
      .from('tasks')
      .insert({
        user_id: userId,
        project_id: projectId,
        conversation_id: conversationId,
        title: openLoop.title,
        description: `[Open Loop] ${openLoop.content}${
          openLoop.context ? `\n\nContext: ${openLoop.context}` : ''
        }`,
        status: 'open',
        source_query: 'AI Insight Extraction',
      })
      .select()
      .single();

    if (taskError) {
      diagnostics.errors.push('open_loop_insert_failed');
      incrementReason(diagnostics, 'open_loop_insert_failed');
    } else if (taskRecord) {
      tasksPersisted += 1;
    }
  }

  diagnostics.output.persisted.tasks = tasksPersisted;

  // 4) Persist suggested highlights
  let highlightsPersisted = 0;

  const { data: singleMessage } = await supabase
    .from('messages')
    .select('id')
    .eq('conversation_id', conversationId)
    .eq('index_in_conversation', 0)
    .maybeSingle();

  for (const highlight of insights.suggestedHighlights) {
    const targetMessageId = singleMessage?.id;
    if (!targetMessageId) {
      diagnostics.warnings.push('highlight_missing_message');
      incrementReason(diagnostics, 'highlight_missing_message');
      continue;
    }

    const { data: highlightRecord, error: highlightError } = await supabase
      .from('highlights')
      .insert({
        user_id: userId,
        conversation_id: conversationId,
        message_id: targetMessageId,
        content: highlight.content,
        label: highlight.title,
      })
      .select()
      .single();

    if (highlightError) {
      diagnostics.errors.push('highlight_insert_failed');
      incrementReason(diagnostics, 'highlight_insert_failed');
    } else if (highlightRecord) {
      highlightsPersisted += 1;
    }
  }

  diagnostics.output.persisted.highlights = highlightsPersisted;

  // Compute dropped counts
  diagnostics.output.dropped.decisions =
    diagnostics.output.extracted.decisions - diagnostics.output.persisted.decisions;
  diagnostics.output.dropped.tasks =
    diagnostics.output.extracted.tasks - diagnostics.output.persisted.tasks;
  diagnostics.output.dropped.highlights =
    diagnostics.output.extracted.highlights - diagnostics.output.persisted.highlights;

  // 5) Discard raw source: clear content and store minimal provenance
  await supabase
    .from('messages')
    .update({
      content: '',
      raw_payload: {
        source_mode,
        source_discarded: true,
        discarded_at: new Date().toISOString(),
      },
    })
    .eq('conversation_id', conversationId)
    .eq('index_in_conversation', 0);

  // Confirm discard
  const { data: confirmMessage } = await supabase
    .from('messages')
    .select('content, raw_payload')
    .eq('conversation_id', conversationId)
    .eq('index_in_conversation', 0)
    .maybeSingle();

  if (confirmMessage && confirmMessage.content && confirmMessage.content.trim().length > 0) {
    diagnostics.warnings.push('discard_confirm_failed');
    incrementReason(diagnostics, 'discard_confirm_failed');
  } else {
    diagnostics.meta = diagnostics.meta || {};
    diagnostics.meta.source_discarded = true;
  }

  // If no items persisted, annotate reasons
  if (
    diagnostics.output.persisted.decisions === 0 &&
    diagnostics.output.persisted.tasks === 0 &&
    diagnostics.output.persisted.highlights === 0
  ) {
    if (
      diagnostics.output.extracted.decisions === 0 &&
      diagnostics.output.extracted.tasks === 0 &&
      diagnostics.output.extracted.highlights === 0
    ) {
      diagnostics.warnings.push('no_actionable_items');
      incrementReason(diagnostics, 'no_actionable_items');
    } else {
      diagnostics.warnings.push('all_items_filtered_or_failed');
      incrementReason(diagnostics, 'all_items_filtered_or_failed');
    }
  }

  // Optional logging (dev or REDUCTION_DEBUG)
  if (
    typeof process !== 'undefined' &&
    (process.env.NODE_ENV === 'development' || process.env.REDUCTION_DEBUG === '1')
  ) {
    console.log('[ReductionDiagnostics]', JSON.stringify(diagnostics));
  }

  // Update outcomes summary for caller
  outcomes.decisions = diagnostics.output.persisted.decisions;
  outcomes.tasks = diagnostics.output.persisted.tasks;
  outcomes.highlights = diagnostics.output.persisted.highlights;

  return diagnostics;
}

function incrementReason(diag: ReductionDiagnostics, reason: string) {
  const reasons = diag.output.dropped.reasons;
  reasons[reason] = (reasons[reason] || 0) + 1;
}

function finalizeDiagnosticsZero(
  diag: ReductionDiagnostics,
  code: string
): ReductionDiagnostics {
  diag.warnings.push(code);
  incrementReason(diag, code);

  if (
    typeof process !== 'undefined' &&
    (process.env.NODE_ENV === 'development' || process.env.REDUCTION_DEBUG === '1')
  ) {
    console.log('[ReductionDiagnostics]', JSON.stringify(diag));
  }

  return diag;
}

