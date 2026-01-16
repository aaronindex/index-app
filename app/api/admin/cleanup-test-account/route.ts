// app/api/admin/cleanup-test-account/route.ts
// Cleanup utility to delete test accounts and their Stripe subscriptions
// WARNING: This is destructive and should only be used for testing

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/getUser';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getStripeClient } from '@/lib/stripe/service';
import { requireStripeEnabled } from '@/lib/stripe/config';
import Stripe from 'stripe';
import type { User } from '@supabase/supabase-js';

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
    const { email, confirm, mode = 'soft' } = body; // 'soft' or 'hard'

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (confirm !== 'DELETE') {
      return NextResponse.json(
        { error: 'Must confirm with confirm: "DELETE"' },
        { status: 400 }
      );
    }

    if (mode !== 'soft' && mode !== 'hard') {
      return NextResponse.json(
        { error: 'Mode must be "soft" or "hard"' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceClient();
    const stripe = getStripeClient();
    requireStripeEnabled();

    // Find user by email (listUsers and filter, as getUserByEmail may not be available)
    const { data: authUsersData, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    const authUser = authUsersData?.users?.find((u: User) => u.email === email);
    
    if (!authUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userId = authUser.id;

    // Get profile to find Stripe customer ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, stripe_subscription_id')
      .eq('id', userId)
      .single();

    const cleanupSteps: string[] = [];
    const errors: string[] = [];

    // Step 1: Cancel Stripe subscription if exists
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

    // Step 2: Handle Stripe customer based on mode
    if (profile?.stripe_customer_id) {
      if (mode === 'hard') {
        // Hard delete: Delete Stripe customer completely
        try {
          await stripe.customers.del(profile.stripe_customer_id);
          cleanupSteps.push(`Deleted Stripe customer: ${profile.stripe_customer_id}`);
        } catch (stripeError: any) {
          if (stripeError.code !== 'resource_missing') {
            errors.push(`Stripe customer delete error: ${stripeError.message}`);
          }
        }
      } else {
        // Soft delete: Keep customer for audit trail, just add metadata
        try {
          await stripe.customers.update(profile.stripe_customer_id, {
            metadata: {
              ...((await stripe.customers.retrieve(profile.stripe_customer_id)) as Stripe.Customer).metadata,
              test_account_deleted: 'true',
              deleted_at: new Date().toISOString(),
            },
          });
          cleanupSteps.push(`Marked Stripe customer as test/deleted: ${profile.stripe_customer_id} (preserved for audit)`);
        } catch (stripeError: any) {
          errors.push(`Stripe customer update error: ${stripeError.message}`);
        }
      }
    }

    // Step 3: Handle billing events based on mode
    if (mode === 'hard') {
      const { error: billingEventsError } = await supabase
        .from('billing_events')
        .delete()
        .eq('user_id', userId);

      if (billingEventsError) {
        errors.push(`Billing events delete error: ${billingEventsError.message}`);
      } else {
        cleanupSteps.push('Deleted billing events');
      }
    } else {
      cleanupSteps.push('Preserved billing events (soft delete mode)');
    }

    // Step 4: Handle profile based on mode
    if (mode === 'hard') {
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (profileError) {
        errors.push(`Profile delete error: ${profileError.message}`);
      } else {
        cleanupSteps.push('Deleted profile');
      }
    } else {
      // Soft delete: Update email to free it up, mark as deleted
      const deletedEmail = `deleted_${Date.now()}_${email}`;
      try {
        await supabase.auth.admin.updateUserById(userId, {
          email: deletedEmail,
        });
        cleanupSteps.push(`Updated auth email to: ${deletedEmail} (frees up original email)`);
      } catch (updateError: any) {
        errors.push(`Auth email update error: ${updateError.message}`);
      }
    }

    // Step 5: Delete auth user (only in hard mode, or after email update in soft mode)
    if (mode === 'hard') {
      const { error: deleteUserError } = await supabase.auth.admin.deleteUser(userId);

      if (deleteUserError) {
        errors.push(`Auth user delete error: ${deleteUserError.message}`);
      } else {
        cleanupSteps.push('Deleted auth user');
      }
    } else {
      // In soft mode, we've already updated the email, so the original email is free
      cleanupSteps.push('Preserved auth user (email updated to free up original)');
    }

    return NextResponse.json({
      success: true,
      email,
      userId,
      mode,
      cleanupSteps,
      errors: errors.length > 0 ? errors : undefined,
      note: mode === 'soft' 
        ? 'Account preserved for audit trail. Original email is now available for reuse.'
        : 'Account fully deleted. All data removed.',
    });
  } catch (error) {
    console.error('Cleanup test account error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

