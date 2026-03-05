/**
 * Extension nudges: show until user dismisses or completes first quick capture from extension.
 * Single flag: extension_nudges_dismissed (user clicked Dismiss). First quick capture is
 * detected when the quick capture page sets extension_capture_used after a successful save
 * (source_type: extension). Uses localStorage only (client-side); no server-side signal yet.
 */

const DISMISSED_KEY = 'index_extension_nudges_dismissed';
const CAPTURE_USED_KEY = 'index_extension_capture_used';

export function shouldShowExtensionNudges(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (localStorage.getItem(DISMISSED_KEY) === '1') return false;
    if (localStorage.getItem(CAPTURE_USED_KEY) === '1') return false;
    return true;
  } catch {
    return false;
  }
}

export function setExtensionNudgesDismissed(): void {
  try {
    localStorage.setItem(DISMISSED_KEY, '1');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('index_extension_nudges_dismissed'));
    }
  } catch {
    // ignore
  }
}

/** Call after successful quick capture (extension flow) so nudges auto-hide. */
export function setExtensionCaptureUsed(): void {
  try {
    localStorage.setItem(CAPTURE_USED_KEY, '1');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('index_extension_nudges_dismissed'));
    }
  } catch {
    // ignore
  }
}
