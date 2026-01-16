// app/api/admin/test-service-key/route.ts
// Diagnostic endpoint to test if SUPABASE_SERVICE_ROLE_KEY is valid

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/getUser';

function getSupabaseServiceClient() {
  const { createClient } = require('@supabase/supabase-js');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !serviceRoleKey) {
    throw new Error('Supabase service role credentials not configured');
  }
  
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Check if env vars are set
    const checks = {
      hasUrl: !!url,
      hasServiceKey: !!serviceRoleKey,
      urlLength: url?.length || 0,
      keyLength: serviceRoleKey?.length || 0,
      keyStartsWith: serviceRoleKey?.substring(0, 10) || 'not set',
    };

    // Try to create client and make a simple query
    let clientTest = null;
    let listUsersTest = null;
    let error = null;

    try {
      const supabase = getSupabaseServiceClient();
      clientTest = 'success';

      // Try to list users (this requires service role)
      const { data, error: listError } = await supabase.auth.admin.listUsers({ limit: 1 });
      if (listError) {
        listUsersTest = `error: ${listError.message}`;
        error = listError;
      } else {
        listUsersTest = `success (found ${data?.users?.length || 0} users)`;
      }
    } catch (err: any) {
      clientTest = `error: ${err.message}`;
      error = err;
    }

    // Check if they might be using anon key instead
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const mightBeAnonKey = anonKey && serviceRoleKey === anonKey;

    return NextResponse.json({
      checks,
      clientTest,
      listUsersTest,
      error: error ? {
        message: error.message,
        code: error.code,
        status: error.status,
      } : null,
      warning: mightBeAnonKey ? '⚠️ WARNING: Your SUPABASE_SERVICE_ROLE_KEY appears to be the same as NEXT_PUBLIC_SUPABASE_ANON_KEY. You need the service_role key, not the anon key!' : null,
      instructions: {
        whereToFind: 'Supabase Dashboard → Settings → API → service_role key (NOT anon key)',
        note: 'The service_role key is different from the anon/public key. It bypasses RLS and should be kept secret.',
        envVarName: 'SUPABASE_SERVICE_ROLE_KEY',
        steps: [
          '1. Go to Supabase Dashboard → Your Project → Settings → API',
          '2. Find the "service_role" key (labeled as "secret")',
          '3. Copy the ENTIRE key (starts with eyJ, ~130-150 chars)',
          '4. Update SUPABASE_SERVICE_ROLE_KEY in Vercel environment variables',
          '5. Redeploy or wait for next deployment',
        ],
      },
    });
  } catch (error) {
    console.error('Test service key error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        checks: {
          hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        },
      },
      { status: 500 }
    );
  }
}

