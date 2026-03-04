// lib/url.ts
// App base URL for server-side fetch (e.g. semantic trigger). Ensures absolute URL with scheme.

/**
 * Resolve app base URL for server-side requests.
 * Priority: NEXT_PUBLIC_APP_URL → VERCEL_URL → http://localhost:3000.
 * Normalizes so the result always has a scheme and no trailing slash.
 */
export function getAppBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL ?? 'http://localhost:3000';
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (!s) return 'http://localhost:3000';

  const lower = s.toLowerCase();
  if (lower.startsWith('http://') || lower.startsWith('https://')) {
    return s.replace(/\/+$/, '');
  }
  if (s.includes('localhost') || s.includes(':')) {
    return `http://${s.replace(/^\/+/, '').replace(/\/+$/, '')}`;
  }
  return `https://${s.replace(/^\/+/, '').replace(/\/+$/, '')}`;
}
