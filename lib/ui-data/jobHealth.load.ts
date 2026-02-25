// lib/ui-data/jobHealth.load.ts
// Load structure job health for thinking time badge
// Read-only

import type { SupabaseClient } from '@supabase/supabase-js';

export type JobHealthData = {
  latestJob: {
    id: string;
    status: string;
    error: string | null;
    finished_at: string | null;
  } | null;
  thinkingTimeUnclear: boolean;
  missing_conversation_id: string | null;
};

/**
 * Load structure job health
 * 
 * Rule:
 * thinkingTimeUnclear is true if:
 * - latest job status = failed
 * - error contains "[signals] Missing thinking time" OR MissingThinkingTimeError marker
 * 
 * @param params - Load parameters
 * @returns Job health data
 */
export async function loadStructureJobHealth(params: {
  supabaseClient: SupabaseClient;
  user_id: string;
}): Promise<JobHealthData> {
  const { supabaseClient, user_id } = params;

  // Load latest structure job
  const { data: latestJob } = await supabaseClient
    .from('structure_jobs')
    .select('id, status, error, finished_at')
    .eq('user_id', user_id)
    .order('queued_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Check if thinking time is unclear
  const thinkingTimeUnclear = 
    latestJob?.status === 'failed' &&
    latestJob?.error !== null &&
    (
      latestJob.error.includes('[signals] Missing thinking time') ||
      latestJob.error.includes('MissingThinkingTimeError') ||
      latestJob.error.includes('Missing thinking time')
    );

  // Extract conversation_id from error message
  // Error format: "[signals] Missing thinking time for decision_id=... conversation_id=..."
  let missing_conversation_id: string | null = null;
  if (latestJob?.error) {
    const conversationIdMatch = latestJob.error.match(/conversation_id=([a-f0-9-]+)/i);
    if (conversationIdMatch) {
      missing_conversation_id = conversationIdMatch[1];
    }
  }

  return {
    latestJob: latestJob ? {
      id: latestJob.id,
      status: latestJob.status,
      error: latestJob.error,
      finished_at: latestJob.finished_at,
    } : null,
    thinkingTimeUnclear: thinkingTimeUnclear || false,
    missing_conversation_id,
  };
}
