// lib/limits.ts
/**
 * Free-user limits enforcement
 * Limits are tracked per 24-hour period
 */

import { getSupabaseServerClient } from './supabaseServer';

export const FREE_USER_LIMITS = {
  importsPer24h: 3,
  askQueriesPer24h: 15,
  meaningObjectsPer24h: 20, // highlights + tasks + decisions
  assetsPerProject: 50,
} as const;

export interface LimitCheckResult {
  allowed: boolean;
  remaining?: number;
  limit?: number;
  message?: string;
}

/**
 * Check if user can perform an import
 */
export async function checkImportLimit(userId: string): Promise<LimitCheckResult> {
  const supabase = await getSupabaseServerClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('import_count_24h, limits_reset_at')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    return { allowed: false, message: 'Unable to check limits' };
  }

  // Reset if 24 hours passed
  const resetAt = new Date(profile.limits_reset_at);
  const now = new Date();
  const hoursSinceReset = (now.getTime() - resetAt.getTime()) / (1000 * 60 * 60);

  let currentCount = profile.import_count_24h;
  if (hoursSinceReset >= 24) {
    currentCount = 0;
    // Reset will happen on next update
  }

  const remaining = FREE_USER_LIMITS.importsPer24h - currentCount;
  const allowed = remaining > 0;

  return {
    allowed,
    remaining: Math.max(0, remaining),
    limit: FREE_USER_LIMITS.importsPer24h,
    message: allowed
      ? undefined
      : `Import limit reached. You can import ${FREE_USER_LIMITS.importsPer24h} files per 24 hours.`,
  };
}

/**
 * Check if user can perform an Ask Index query
 */
export async function checkAskLimit(userId: string): Promise<LimitCheckResult> {
  const supabase = await getSupabaseServerClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('ask_count_24h, limits_reset_at')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    return { allowed: false, message: 'Unable to check limits' };
  }

  const resetAt = new Date(profile.limits_reset_at);
  const now = new Date();
  const hoursSinceReset = (now.getTime() - resetAt.getTime()) / (1000 * 60 * 60);

  let currentCount = profile.ask_count_24h;
  if (hoursSinceReset >= 24) {
    currentCount = 0;
  }

  const remaining = FREE_USER_LIMITS.askQueriesPer24h - currentCount;
  const allowed = remaining > 0;

  return {
    allowed,
    remaining: Math.max(0, remaining),
    limit: FREE_USER_LIMITS.askQueriesPer24h,
    message: allowed
      ? undefined
      : `Ask Index limit reached. You can make ${FREE_USER_LIMITS.askQueriesPer24h} queries per 24 hours.`,
  };
}

/**
 * Check if user can create a meaning object (highlight/task/decision)
 */
export async function checkMeaningObjectLimit(userId: string): Promise<LimitCheckResult> {
  const supabase = await getSupabaseServerClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('meaning_objects_24h, limits_reset_at')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    return { allowed: false, message: 'Unable to check limits' };
  }

  const resetAt = new Date(profile.limits_reset_at);
  const now = new Date();
  const hoursSinceReset = (now.getTime() - resetAt.getTime()) / (1000 * 60 * 60);

  let currentCount = profile.meaning_objects_24h;
  if (hoursSinceReset >= 24) {
    currentCount = 0;
  }

  const remaining = FREE_USER_LIMITS.meaningObjectsPer24h - currentCount;
  const allowed = remaining > 0;

  return {
    allowed,
    remaining: Math.max(0, remaining),
    limit: FREE_USER_LIMITS.meaningObjectsPer24h,
    message: allowed
      ? undefined
      : `Limit reached. You can create ${FREE_USER_LIMITS.meaningObjectsPer24h} highlights, tasks, or decisions per 24 hours.`,
  };
}

/**
 * Check if project has reached asset limit
 */
export async function checkAssetLimit(projectId: string): Promise<LimitCheckResult> {
  const supabase = await getSupabaseServerClient();

  const { count, error } = await supabase
    .from('project_assets')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('is_inactive', false);

  if (error) {
    return { allowed: false, message: 'Unable to check limits' };
  }

  const currentCount = count || 0;
  const remaining = FREE_USER_LIMITS.assetsPerProject - currentCount;
  const allowed = remaining > 0;

  return {
    allowed,
    remaining: Math.max(0, remaining),
    limit: FREE_USER_LIMITS.assetsPerProject,
    message: allowed
      ? undefined
      : `Asset limit reached. Each project can have up to ${FREE_USER_LIMITS.assetsPerProject} assets.`,
  };
}

/**
 * Increment user limit counter
 */
export async function incrementLimit(
  userId: string,
  limitType: 'import' | 'ask' | 'meaning_object'
): Promise<void> {
  const supabase = await getSupabaseServerClient();

  // Get current profile to check reset
  const { data: profile } = await supabase
    .from('profiles')
    .select('limits_reset_at, import_count_24h, ask_count_24h, meaning_objects_24h')
    .eq('id', userId)
    .single();

  if (!profile) return;

  const resetAt = new Date(profile.limits_reset_at);
  const now = new Date();
  const hoursSinceReset = (now.getTime() - resetAt.getTime()) / (1000 * 60 * 60);

  const updates: any = {};

  if (hoursSinceReset >= 24) {
    // Reset all counters
    updates.import_count_24h = limitType === 'import' ? 1 : 0;
    updates.ask_count_24h = limitType === 'ask' ? 1 : 0;
    updates.meaning_objects_24h = limitType === 'meaning_object' ? 1 : 0;
    updates.limits_reset_at = now.toISOString();
  } else {
    // Increment specific counter
    if (limitType === 'import') {
      updates.import_count_24h = (profile.import_count_24h || 0) + 1;
    } else if (limitType === 'ask') {
      updates.ask_count_24h = (profile.ask_count_24h || 0) + 1;
    } else if (limitType === 'meaning_object') {
      updates.meaning_objects_24h = (profile.meaning_objects_24h || 0) + 1;
    }
  }

  await supabase.from('profiles').update(updates).eq('id', userId);
}

