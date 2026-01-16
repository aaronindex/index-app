// app/api/billing/manual-activate/route.ts
// Manual subscription activation endpoint (for testing/debugging)
// This can be used to manually activate a subscription if webhook didn't fire

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/getUser';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { requireStripeEnabled } from '@/lib/stripe/config';
import { getStripeClient } from '@/lib/stripe/service';

export async function POST(request: NextRequest) {
  try {
    requireStripeEnabled();
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await getSupabaseServerClient();
    const stripe = getStripeClient();

    // Get user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, plan')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (!profile.stripe_customer_id) {
      return NextResponse.json({ error: 'No Stripe customer found' }, { status: 400 });
    }

    // Get customer's subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: 'all',
      limit: 10,
    });

    // Find active or trialing subscription
    const activeSubscription = subscriptions.data.find(
      (sub) => sub.status === 'active' || sub.status === 'trialing'
    );

    if (!activeSubscription) {
      return NextResponse.json({ 
        error: 'No active subscription found',
        subscriptions: subscriptions.data.map(s => ({ id: s.id, status: s.status }))
      }, { status: 400 });
    }

    // Update profile
    const plan = activeSubscription.status === 'active' || activeSubscription.status === 'trialing' ? 'pro' : 'free';

    await supabase
      .from('profiles')
      .update({
        plan,
        plan_status: activeSubscription.status,
        stripe_subscription_id: activeSubscription.id,
        stripe_customer_id: profile.stripe_customer_id,
        plan_updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    // Insert billing event if it doesn't exist
    const { data: existingEvent } = await supabase
      .from('billing_events')
      .select('id')
      .eq('user_id', user.id)
      .eq('event_type', 'subscription_activated')
      .single();

    if (!existingEvent) {
      await supabase.from('billing_events').insert({
        user_id: user.id,
        event_type: 'subscription_activated',
        plan,
        price_id: activeSubscription.items.data[0]?.price.id || null,
        stripe_event_id: `manual_${Date.now()}`,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription activated manually',
      plan,
      subscription_id: activeSubscription.id,
      subscription_status: activeSubscription.status,
    });
  } catch (error) {
    console.error('Manual activate error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to activate subscription' },
      { status: 500 }
    );
  }
}

