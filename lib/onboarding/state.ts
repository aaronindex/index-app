/**
 * Onboarding state: tunnel flow (4 steps). Persisted on profile when completed; localStorage for in-progress.
 * Client-only (use from useEffect or event handlers) to avoid SSR/hydration issues.
 */

import { getSupabaseBrowserClient } from '@/lib/supabaseClient';

const LS_KEY_COMPLETED = 'index_onboarding_completed';
const LS_KEY_VERSION = 'index_onboarding_version';
const LS_KEY_TUNNEL_STEP = 'index_tunnel_step';
const LS_KEY_TUNNEL_IMPORT_COUNT = 'index_tunnel_import_count';
const LS_KEY_TUNNEL_DISTILL_COUNT = 'index_tunnel_distill_count';
const LS_KEY_ONBOARDING_PROJECT_ID = 'index_onboarding_project_id';
const DEFAULT_VERSION = 'v2';

/** Tunnel steps: 1 = explain, 2 = import (first then second), 3 = distill, 4 = structure reveal */
export type TunnelStep = 1 | 2 | 3 | 4;

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

/** Current tunnel step (1–4). null means not started (show step 1). Client-only. */
export function getTunnelStep(): TunnelStep | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LS_KEY_TUNNEL_STEP);
    if (raw === null) return null;
    const n = parseInt(raw, 10);
    return (n >= 1 && n <= 4 ? n : null) as TunnelStep | null;
  } catch {
    return null;
  }
}

export function setTunnelStep(step: TunnelStep | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (step === null) localStorage.removeItem(LS_KEY_TUNNEL_STEP);
    else localStorage.setItem(LS_KEY_TUNNEL_STEP, String(step));
  } catch {
    // ignore
  }
}

/** Number of sources imported during this tunnel (0, 1, or 2). */
export function getTunnelImportCount(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(LS_KEY_TUNNEL_IMPORT_COUNT);
    if (raw === null) return 0;
    const n = parseInt(raw, 10);
    return n >= 0 && n <= 2 ? n : 0;
  } catch {
    return 0;
  }
}

export function setTunnelImportCount(n: number): void {
  if (typeof window === 'undefined') return;
  try {
    if (n <= 0) localStorage.removeItem(LS_KEY_TUNNEL_IMPORT_COUNT);
    else localStorage.setItem(LS_KEY_TUNNEL_IMPORT_COUNT, String(Math.min(2, n)));
  } catch {
    // ignore
  }
}

/** Number of sources distilled during tunnel step 3 (0, 1, or 2). */
export function getTunnelDistillCount(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(LS_KEY_TUNNEL_DISTILL_COUNT);
    if (raw === null) return 0;
    const n = parseInt(raw, 10);
    return n >= 0 && n <= 2 ? n : 0;
  } catch {
    return 0;
  }
}

export function setTunnelDistillCount(n: number): void {
  if (typeof window === 'undefined') return;
  try {
    if (n <= 0) localStorage.removeItem(LS_KEY_TUNNEL_DISTILL_COUNT);
    else localStorage.setItem(LS_KEY_TUNNEL_DISTILL_COUNT, String(Math.min(2, n)));
  } catch {
    // ignore
  }
}

/** Project id used for onboarding (navigate to its Read tab on completion). */
export function getOnboardingProjectId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(LS_KEY_ONBOARDING_PROJECT_ID);
  } catch {
    return null;
  }
}

export function setOnboardingProjectId(id: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (id == null) localStorage.removeItem(LS_KEY_ONBOARDING_PROJECT_ID);
    else localStorage.setItem(LS_KEY_ONBOARDING_PROJECT_ID, id);
  } catch {
    // ignore
  }
}

function clearTunnelState(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(LS_KEY_TUNNEL_STEP);
    localStorage.removeItem(LS_KEY_TUNNEL_IMPORT_COUNT);
    localStorage.removeItem(LS_KEY_TUNNEL_DISTILL_COUNT);
    localStorage.removeItem(LS_KEY_ONBOARDING_PROJECT_ID);
  } catch {
    // ignore
  }
}

/** True when onboarding not completed and tunnel is active (step 1–4 or not started). */
export function isOnboardingInProgress(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (localStorage.getItem(LS_KEY_COMPLETED) === 'true') return false;
    const step = getTunnelStep();
    // step null or 1–4 means in progress
    return step === null || step === 1 || step === 2 || step === 3 || step === 4;
  } catch {
    return false;
  }
}

/** Persist completed: update profile and localStorage; clear tunnel state. */
export async function markOnboardingCompleted(): Promise<void> {
  if (typeof window === 'undefined') return;
  clearTunnelState();
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

/** Reset so onboarding shows again: clear profile flags and tunnel localStorage. */
export async function resetOnboarding(): Promise<void> {
  if (typeof window === 'undefined') return;
  clearTunnelState();
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

// Legacy: kept for any remaining references; map to tunnel step for compatibility.
export function getOnboardingStep(): number | null {
  const step = getTunnelStep();
  return step;
}

export function setOnboardingStep(step: number): void {
  if (step >= 1 && step <= 4) setTunnelStep(step as TunnelStep);
}

export function clearOnboardingStep(): void {
  setTunnelStep(null);
  setTunnelImportCount(0);
  setTunnelDistillCount(0);
  setOnboardingProjectId(null);
}
