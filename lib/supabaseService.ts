// lib/supabaseService.ts
// Service-role client (bypasses RLS). Use only server-side for operations that need to read/write
// regardless of session (e.g. semantic_labels overlay read when user is already authenticated via getCurrentUser).

import { createClient } from '@supabase/supabase-js';

let _serviceClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseServiceClient() {
  if (_serviceClient) return _serviceClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service role not configured');
  _serviceClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _serviceClient;
}
