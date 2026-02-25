// lib/structure/signals/signal.collector.ts
// Collects structural signals from existing tables
// Signals are deterministic projections with no editorial content
// ALL signals use THINKING TIME, never ingestion time

import type { SupabaseClient } from '@supabase/supabase-js';
import type { StructuralSignal } from './signal.types';
import { generateSignalId, midpoint, assertThinkingTime } from './signal.types';

/**
 * Collect structural signals for a user
 * 
 * Fetches minimal fields from existing tables and maps to signals.
 * Returns plain array - no joins that introduce nondeterministic ordering.
 * 
 * Field Notes do NOT generate signals (they are ingestion events only).
 */
export async function collectStructuralSignals(
  supabaseClient: SupabaseClient,
  userId: string
): Promise<StructuralSignal[]> {
  const signals: StructuralSignal[] = [];
  
  // ============================================================================
  // DECISION signals
  // ============================================================================
  // Decisions carry structural weight
  // MUST use thinking time (from conversation thinking window), never created_at (ingestion time)
  // No silent drops: throw if thinking time cannot be determined
  
  const { data: decisions, error: decisionsError } = await supabaseClient
    .from('decisions')
    .select('id, conversation_id, project_id, is_inactive')
    .eq('user_id', userId)
    .eq('is_inactive', false) // Only active decisions generate signals
    .order('id', { ascending: true }); // Deterministic ordering by ID
  
  if (decisionsError) {
    console.error('[SignalCollector] Error fetching decisions:', decisionsError);
  } else if (decisions) {
    // Build conversation lookup map (fetch separately to avoid nondeterministic joins)
    const conversationIds = decisions
      .map(d => d.conversation_id)
      .filter((id): id is string => id !== null);
    
    const conversationMap = new Map<string, { started_at: string; ended_at: string | null }>();
    
    if (conversationIds.length > 0) {
      const { data: conversations, error: convError } = await supabaseClient
        .from('conversations')
        .select('id, started_at, ended_at')
        .eq('user_id', userId)
        .in('id', conversationIds);
      
      if (convError) {
        console.error('[SignalCollector] Error fetching conversations:', convError);
      } else if (conversations) {
        for (const conv of conversations) {
          conversationMap.set(conv.id, {
            started_at: conv.started_at,
            ended_at: conv.ended_at,
          });
        }
      }
    }
    
    // Generate signals with thinking time
    // No silent drops: throw if thinking time cannot be determined
    for (const decision of decisions) {
      let thinkingTime: string;
      
      if (decision.conversation_id) {
        const conv = conversationMap.get(decision.conversation_id);
        if (conv) {
          // Use midpoint of conversation thinking window
          thinkingTime = midpoint(conv.started_at, conv.ended_at || undefined);
        } else {
          // Conversation not found - throw in all environments
          throw new Error(
            `[signals] Missing thinking time for decision_id=${decision.id} conversation_id=${decision.conversation_id}`
          );
        }
      } else {
        // Decision has no conversation - throw in all environments
        throw new Error(
          `[signals] Missing thinking time for decision_id=${decision.id} (no conversation_id)`
        );
      }
      
      assertThinkingTime(thinkingTime, `decision ${decision.id}`);
      
      signals.push({
        id: generateSignalId('decision', decision.id, thinkingTime, decision.project_id || undefined),
        user_id: userId,
        kind: 'decision',
        occurred_at: thinkingTime,
        project_id: decision.project_id || undefined,
        source_id: decision.id,
      });
    }
  }
  
  // ============================================================================
  // RESULT signals
  // ============================================================================
  // Results are conceptual feedback loops attached to decisions
  // No results table exists yet - skip for now
  // TODO: Implement when results table is added
  // Results will use thinking time from their associated decision/conversation
  
  // ============================================================================
  // PROJECT_REACTIVATED signals
  // ============================================================================
  // Detect when project moves from inactive to active
  // Requires thinking_started_at field on projects (not yet in schema)
  // TODO: Implement when project thinking time fields are added
  // For now, skip (project_reactivated is inference-only, not timeline-visible)
  
  return signals;
}
