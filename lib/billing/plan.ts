// lib/billing/plan.ts
// Plan checking utilities

import { getSupabaseServerClient } from '@/lib/supabaseServer';

export type Plan = 'free' | 'pro';

export interface PlanInfo {
  plan: Plan;
  planStatus: string | null;
}

/**
 * Get user's plan information
 */
export async function getUserPlan(userId: string): Promise<PlanInfo> {
  const supabase = await getSupabaseServerClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, plan_status')
    .eq('id', userId)
    .single();

  return {
    plan: (profile?.plan as Plan) || 'free',
    planStatus: profile?.plan_status || null,
  };
}

/**
 * Check if user has pro plan
 */
export async function isProUser(userId: string): Promise<boolean> {
  const planInfo = await getUserPlan(userId);
  return planInfo.plan === 'pro' && (planInfo.planStatus === 'active' || planInfo.planStatus === 'trialing');
}

