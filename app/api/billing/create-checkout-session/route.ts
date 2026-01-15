// app/api/billing/create-checkout-session/route.ts
// Create Stripe Checkout Session for subscription

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/getUser';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { stripeConfig, requireStripeEnabled } from '@/lib/stripe/config';
import { getStripeClient } from '@/lib/stripe/service';

export async function POST(request: NextRequest) {
  try {
    // Enforce Stripe enabled
    requireStripeEnabled();

    // Require authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const source = body.source as string;

    // Validate source
    const validSources = [
      'paywall_project_limit',
      'paywall_ask_limit',
      'paywall_asset_upload',
      'settings',
      'header',
    ];
    if (!source || !validSources.includes(source)) {
      return NextResponse.json({ error: 'Invalid source' }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();

    // Check if user already has pro plan
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profile?.plan === 'pro') {
      return NextResponse.json({ alreadyPro: true });
    }

    const stripe = getStripeClient();
    const config = stripeConfig;

    // Ensure Stripe customer exists
    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      // Create Stripe customer
      const customer = await stripe.customers.create({
        metadata: {
          user_id: user.id,
        },
      });

      customerId = customer.id;

      // Store customer ID on profile
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [
        {
          price: config.stripePriceId!,
          quantity: 1,
        },
      ],
      success_url: `${config.appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.appUrl}/billing/cancel`,
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        source,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Create checkout session error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

