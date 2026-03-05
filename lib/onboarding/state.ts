/**
 * Onboarding state: persisted on profile when available, localStorage fallback.
 * Client-only (use from useEffect or event handlers) to avoid SSR/hydration issues.
 */

import { getSupabaseBrowserClient } from '@/lib/supabaseClient';

const LS_KEY_COMPLETED = 'index_onboarding_completed';
const LS_KEY_VERSION = 'index_onboarding_version';
const DEFAULT_VERSION = 'v2';

export type OnboardingState = {
  completed: boolean;
  version: string;
};

/** Read from profile; if no user or fetch fails, fall back to localStorage. */
export async function getOnboardingState(): Promise<OnboardingState> {
  if (typeof window === 'undefined') {
    return { completed: false, version: DEFAULT_VERSION };
  }
  try {
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed, onboarding_version')
        .eq('id', user.id)
        .single();
      return {
        completed: profile?.onboarding_completed ?? false,
        version: profile?.onboarding_version ?? DEFAULT_VERSION,
      };
    }
  } catch {
    // fall through to localStorage
  }
  try {
    const completed = localStorage.getItem(LS_KEY_COMPLETED) === 'true';
    const version = localStorage.getItem(LS_KEY_VERSION) ?? DEFAULT_VERSION;
    return { completed, version };
  } catch {
    return { completed: false, version: DEFAULT_VERSION };
  }
}

/** Persist completed: update profile and localStorage so fallback stays in sync. */
export async function markOnboardingCompleted(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          onboarding_version: DEFAULT_VERSION,
        })
        .eq('id', user.id);
    }
  } catch {
    // continue to sync localStorage
  }
  try {
    localStorage.setItem(LS_KEY_COMPLETED, 'true');
    localStorage.setItem(LS_KEY_VERSION, DEFAULT_VERSION);
  } catch {
    // ignore
  }
}

/** Reset so tour shows again: clear profile flags and localStorage. */
export async function resetOnboarding(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const supabase = getSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('profiles')
        .update({
          onboarding_completed: false,
          onboarding_version: DEFAULT_VERSION,
        })
        .eq('id', user.id);
    }
  } catch {
    // continue to clear localStorage
  }
  try {
    localStorage.removeItem(LS_KEY_COMPLETED);
    localStorage.removeItem(LS_KEY_VERSION);
  } catch {
    // ignore
  }
}
