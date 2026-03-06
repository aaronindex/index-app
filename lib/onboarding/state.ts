/**
 * Onboarding state: persisted on profile when available, localStorage fallback.
 * Client-only (use from useEffect or event handlers) to avoid SSR/hydration issues.
 */

import { getSupabaseBrowserClient } from '@/lib/supabaseClient';

const LS_KEY_COMPLETED = 'index_onboarding_completed';
const LS_KEY_VERSION = 'index_onboarding_version';
const LS_KEY_STEP = 'index_onboarding_step';
const DEFAULT_VERSION = 'v2';

export const ONBOARDING_LOOP_STEPS = 7;

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

/** Current onboarding loop step (1–7). Client-only; read from localStorage. */
export function getOnboardingStep(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LS_KEY_STEP);
    if (raw === null) return null;
    const n = parseInt(raw, 10);
    return n >= 1 && n <= ONBOARDING_LOOP_STEPS ? n : null;
  } catch {
    return null;
  }
}

/** Set current step (1–7). Call before navigation when advancing. */
export function setOnboardingStep(step: number): void {
  if (typeof window === 'undefined') return;
  try {
    if (step >= 1 && step <= ONBOARDING_LOOP_STEPS) {
      localStorage.setItem(LS_KEY_STEP, String(step));
    }
  } catch {
    // ignore
  }
}

/** Clear step (e.g. when onboarding completed or reset). */
export function clearOnboardingStep(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(LS_KEY_STEP);
  } catch {
    // ignore
  }
}

/** True when onboarding is not completed and step is 1–7 (guided flow active). */
export function isOnboardingInProgress(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (localStorage.getItem(LS_KEY_COMPLETED) === 'true') return false;
    const step = getOnboardingStep();
    return step !== null && step >= 1 && step <= ONBOARDING_LOOP_STEPS;
  } catch {
    return false;
  }
}

/** Persist completed: update profile and localStorage so fallback stays in sync. */
export async function markOnboardingCompleted(): Promise<void> {
  if (typeof window === 'undefined') return;
  clearOnboardingStep();
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
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('index_onboarding_completed'));
    }
  } catch {
    // ignore
  }
}

/** Reset so tour shows again: clear profile flags and localStorage. */
export async function resetOnboarding(): Promise<void> {
  if (typeof window === 'undefined') return;
  clearOnboardingStep();
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
