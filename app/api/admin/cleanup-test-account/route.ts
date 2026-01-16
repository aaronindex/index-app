// app/api/admin/cleanup-test-account/route.ts
// Cleanup utility to delete test accounts and their Stripe subscriptions
// WARNING: This is destructive and should only be used for testing

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/getUser';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getStripeClient } from '@/lib/stripe/service';
import { requireStripeEnabled } from '@/lib/stripe/config';

// Get Supabase service role client for admin operations
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

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email, confirm } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (confirm !== 'DELETE') {
      return NextResponse.json(
        { error: 'Must confirm with confirm: "DELETE"' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();
    const stripe = getStripeClient();
    requireStripeEnabled();

    // Find user by email
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserByEmail(email);
    
    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userId = authUser.user.id;

    // Get profile to find Stripe customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, stripe_subscription_id')
      .eq('id', userId)
      .single();

    const cleanupSteps: string[] = [];
    const errors: string[] = [];

    // Step 1: Cancel and delete Stripe subscription if exists
    if (profile?.stripe_subscription_id) {
      try {
        // Cancel the subscription immediately
        await stripe.subscriptions.cancel(profile.stripe_subscription_id);
        cleanupSteps.push(`Cancelled Stripe subscription: ${profile.stripe_subscription_id}`);
      } catch (stripeError: any) {
        if (stripeError.code !== 'resource_missing') {
          errors.push(`Stripe subscription cancel error: ${stripeError.message}`);
        }
      }
    }

    // Step 2: Delete Stripe customer if exists
    if (profile?.stripe_customer_id) {
      try {
        await stripe.customers.del(profile.stripe_customer_id);
        cleanupSteps.push(`Deleted Stripe customer: ${profile.stripe_customer_id}`);
      } catch (stripeError: any) {
        if (stripeError.code !== 'resource_missing') {
          errors.push(`Stripe customer delete error: ${stripeError.message}`);
        }
      }
    }

    // Step 3: Delete billing events (cascade should handle this, but explicit is better)
    const { error: billingEventsError } = await supabase
      .from('billing_events')
      .delete()
      .eq('user_id', userId);

    if (billingEventsError) {
      errors.push(`Billing events delete error: ${billingEventsError.message}`);
    } else {
      cleanupSteps.push('Deleted billing events');
    }

    // Step 4: Delete profile (cascade should handle related data)
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      errors.push(`Profile delete error: ${profileError.message}`);
    } else {
      cleanupSteps.push('Deleted profile');
    }

    // Step 5: Delete auth user (this will cascade to all related data)
    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      errors.push(`Auth user delete error: ${deleteUserError.message}`);
    } else {
      cleanupSteps.push('Deleted auth user');
    }

    return NextResponse.json({
      success: true,
      email,
      userId,
      cleanupSteps,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Cleanup test account error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

