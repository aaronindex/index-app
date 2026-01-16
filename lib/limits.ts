// lib/limits.ts
/**
 * Free-user limits enforcement
 * Limits are tracked per 24-hour period
 * Pro users bypass all limits
 */

import { getSupabaseServerClient } from './supabaseServer';
import { isProUser } from './billing/plan';

// Environment-driven limits (with defaults)
const FREE_MAX_ACTIVE_PROJECTS = parseInt(process.env.FREE_MAX_ACTIVE_PROJECTS || '1', 10);
const FREE_MAX_ASK_PER_24H = parseInt(process.env.FREE_MAX_ASK_PER_24H || '15', 10);
const FREE_MAX_DIGEST_PER_30D = parseInt(process.env.FREE_MAX_DIGEST_PER_30D || '4', 10);
const FREE_ASSET_UPLOADS_ENABLED = process.env.FREE_ASSET_UPLOADS_ENABLED === 'true';
const FREE_IMPORT_MODE = process.env.FREE_IMPORT_MODE || 'quick_only'; // 'quick_only' | 'full'

export const FREE_USER_LIMITS = {
  maxActiveProjects: FREE_MAX_ACTIVE_PROJECTS,
  importsPer24h: 3,
  askQueriesPer24h: FREE_MAX_ASK_PER_24H,
  meaningObjectsPer24h: 20, // highlights + tasks + decisions
  assetsPerProject: 50,
  digestPer30d: FREE_MAX_DIGEST_PER_30D,
  assetUploadsEnabled: FREE_ASSET_UPLOADS_ENABLED,
  importMode: FREE_IMPORT_MODE,
} as const;

export interface LimitCheckResult {
  allowed: boolean;
  remaining?: number;
  limit?: number;
  message?: string;
}

/**
 * Check if user can perform an import
 * 
 * TEMPORARY FOR ALPHA: Limits disabled for testing
 * TODO: Re-enable limits when adding payment tiers
 */
export async function checkImportLimit(userId: string): Promise<LimitCheckResult> {
  // ALPHA MODE: Always allow imports
  return {
    allowed: true,
    remaining: 999,
    limit: 999,
  };

  // Original limit check (disabled for alpha)
  /*
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
  */
}

/**
 * Check if user can perform an Ask Index query
 */
export async function checkAskLimit(userId: string): Promise<LimitCheckResult> {
  // Pro users bypass limits
  if (await isProUser(userId)) {
    return {
      allowed: true,
      remaining: 999,
      limit: 999,
    };
  }

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
  // Pro users bypass limits
  if (await isProUser(userId)) {
    return {
      allowed: true,
      remaining: 999,
      limit: 999,
    };
  }

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
 * Check if user can create a new project (free tier limit)
 */
export async function checkProjectLimit(userId: string): Promise<LimitCheckResult> {
  // Pro users bypass limits
  if (await isProUser(userId)) {
    return {
      allowed: true,
      remaining: 999,
      limit: 999,
    };
  }

  const supabase = await getSupabaseServerClient();

  // Projects don't have an is_inactive field - count all projects for the user
  const { count, error } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) {
    return { allowed: false, message: 'Unable to check limits' };
  }

  const currentCount = count || 0;
  const remaining = FREE_USER_LIMITS.maxActiveProjects - currentCount;
  const allowed = remaining > 0;

  return {
    allowed,
    remaining: Math.max(0, remaining),
    limit: FREE_USER_LIMITS.maxActiveProjects,
    message: allowed
      ? undefined
      : `Project limit reached. Free users can have ${FREE_USER_LIMITS.maxActiveProjects} active project. Upgrade to Pro for unlimited projects.`,
  };
}

/**
 * Check if project has reached asset limit
 */
export async function checkAssetLimit(projectId: string, userId?: string): Promise<LimitCheckResult> {
  // Pro users bypass limits
  if (userId && (await isProUser(userId))) {
    return {
      allowed: true,
      remaining: 999,
      limit: 999,
    };
  }

  // Free users: check if asset uploads are enabled
  if (!FREE_USER_LIMITS.assetUploadsEnabled) {
    return {
      allowed: false,
      remaining: 0,
      limit: 0,
      message: 'Asset uploads are not available on the free plan. Upgrade to Pro to upload files.',
    };
  }

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

