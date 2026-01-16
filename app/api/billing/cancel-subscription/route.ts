// app/api/billing/cancel-subscription/route.ts
// Cancel a user's Stripe subscription

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/getUser';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { requireStripeEnabled, stripeConfig } from '@/lib/stripe/config';
import { getStripeClient } from '@/lib/stripe/service';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    const config = requireStripeEnabled();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await getSupabaseServerClient();

    // Get user's profile with subscription info
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_subscription_id, plan')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (!profile.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 400 });
    }

    if (profile.plan !== 'pro') {
      return NextResponse.json({ error: 'No active subscription to cancel' }, { status: 400 });
    }

    // Cancel subscription in Stripe
    const stripe = getStripeClient();
    await stripe.subscriptions.update(profile.stripe_subscription_id, {
      cancel_at_period_end: true, // Cancel at end of billing period
    });

    // Retrieve the updated subscription to get all properties
    const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);

    // Update profile to reflect cancellation
    await supabase
      .from('profiles')
      .update({
        plan_status: 'canceled',
        plan_updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    // Get customer for billing event
    const customer = await stripe.customers.retrieve(subscription.customer as string);
    const { data: profileForEvent } = await supabase
      .from('profiles')
      .select('utm_source, utm_medium, utm_campaign')
      .eq('id', user.id)
      .single();

    // Insert billing event
    await supabase.from('billing_events').insert({
      user_id: user.id,
      event_type: 'subscription_canceled',
      plan: 'pro',
      price_id: subscription.items.data[0]?.price.id || null,
      stripe_event_id: `cancel_${Date.now()}`, // Unique identifier
      utm_source: profileForEvent?.utm_source || null,
      utm_medium: profileForEvent?.utm_medium || null,
      utm_campaign: profileForEvent?.utm_campaign || null,
    });

    // Access properties safely with type assertion
    const sub = subscription as any as Stripe.Subscription;
    const currentPeriodEnd = sub.current_period_end 
      ? new Date(sub.current_period_end * 1000).toISOString() 
      : null;
    const cancelAt = sub.cancel_at 
      ? new Date(sub.cancel_at * 1000).toISOString() 
      : null;

    return NextResponse.json({
      success: true,
      message: 'Subscription canceled. You will retain access until the end of your billing period.',
      cancel_at: cancelAt,
      current_period_end: currentPeriodEnd,
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}

