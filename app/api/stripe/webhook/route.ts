// app/api/stripe/webhook/route.ts
// Stripe webhook handler for subscription events
// MUST use Node runtime for raw body access

import { NextRequest, NextResponse } from 'next/server';
import { stripeConfig, requireStripeEnabled } from '@/lib/stripe/config';
import { getStripeClient } from '@/lib/stripe/service';
import Stripe from 'stripe';
import { Resend } from 'resend';
import { renderSubscriptionConfirmationEmail } from '@/emails/subscription-confirmation';

// Force Node.js runtime for raw body access
export const runtime = 'nodejs';

// Disable body parsing to get raw body for webhook signature verification
export const dynamic = 'force-dynamic';

// Get Supabase service role client
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
    const config = requireStripeEnabled();
    const stripe = getStripeClient();

    // Read raw body
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        config.stripeWebhookSecret!
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const supabase = getSupabaseServiceClient();

    console.log(`[Webhook] Received event: ${event.type}, event ID: ${event.id}`);

    // Handle event types
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      console.log(`[Webhook] checkout.session.completed - Session ID: ${session.id}`);
      console.log(`[Webhook] Session metadata:`, JSON.stringify(session.metadata));
      console.log(`[Webhook] Session client_reference_id:`, session.client_reference_id);

      const userId = session.metadata?.user_id || session.client_reference_id;
      if (!userId) {
        console.error('[Webhook] No user_id in checkout session - metadata:', session.metadata, 'client_reference_id:', session.client_reference_id);
        return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
      }

      console.log(`[Webhook] Processing checkout for user_id: ${userId}`);

      const subscriptionId = session.subscription as string;
      if (!subscriptionId) {
        console.error('[Webhook] No subscription in checkout session');
        return NextResponse.json({ error: 'Missing subscription' }, { status: 400 });
      }

      console.log(`[Webhook] Subscription ID: ${subscriptionId}`);

      // Fetch subscription details
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      console.log(`[Webhook] Subscription status: ${subscription.status}`);

      // Check if billing event already exists (idempotency)
      const { data: existingEvent } = await supabase
        .from('billing_events')
        .select('id')
        .eq('stripe_event_id', event.id)
        .single();

      if (existingEvent) {
        // Already processed
        return NextResponse.json({ received: true, skipped: true });
      }

      // Get user profile for UTM attribution
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('utm_source, utm_medium, utm_campaign, utm_content, utm_term')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
      }

      // Update profile
      const plan = subscription.status === 'active' || subscription.status === 'trialing' ? 'pro' : 'free';
      console.log(`[Webhook] Updating profile to plan: ${plan}, status: ${subscription.status}`);

      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({
          plan,
          plan_status: subscription.status,
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: subscription.customer as string,
          plan_updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (updateError) {
        console.error('[Webhook] Error updating profile:', updateError);
        console.error('[Webhook] Update error details:', JSON.stringify(updateError));
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
      }

      console.log(`[Webhook] Profile updated successfully:`, updatedProfile?.plan, updatedProfile?.plan_status);

      // Insert billing event
      console.log(`[Webhook] Inserting billing event for user ${userId}`);
      const { data: insertedEvent, error: insertError } = await supabase.from('billing_events').insert({
        user_id: userId,
        event_type: 'subscription_activated',
        plan,
        price_id: subscription.items.data[0]?.price.id || null,
        stripe_event_id: event.id,
        utm_source: profile?.utm_source || null,
        utm_medium: profile?.utm_medium || null,
        utm_campaign: profile?.utm_campaign || null,
      }).select().single();

      if (insertError) {
        console.error('[Webhook] Error inserting billing event:', insertError);
        console.error('[Webhook] Insert error details:', JSON.stringify(insertError));
        // Don't fail the webhook if billing event insert fails, but log it
      } else {
        console.log(`[Webhook] Billing event inserted successfully:`, insertedEvent?.id);
      }

      // Send subscription confirmation email
      try {
        // Get user email from Stripe customer
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        const customerEmail = (customer as Stripe.Customer).email;

        if (customerEmail) {
          const resend = new Resend(process.env.RESEND_API_KEY);
          const fromEmail = process.env.RESEND_FROM_EMAIL || 'INDEX <hello@indexapp.co>';

          const result = await resend.emails.send({
            from: fromEmail,
            to: customerEmail,
            subject: 'Welcome to INDEX Pro',
            html: renderSubscriptionConfirmationEmail(),
          });

          if (result.error) {
            console.error('Resend email error:', result.error);
            // Don't fail the webhook if email fails, but log it
          } else {
            console.log(`[Webhook] Sent subscription confirmation email to ${customerEmail}`);
          }
        } else {
          console.warn(`[Webhook] No email found for customer ${subscription.customer}`);
        }
      } catch (emailError) {
        console.error('Error sending subscription confirmation email:', emailError);
        // Don't fail the webhook if email fails, but log it
      }

      console.log(`[Webhook] Successfully processed checkout.session.completed for user ${userId}, plan: ${plan}`);
      return NextResponse.json({ received: true });
    }

    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription;

      // Get customer metadata to find user_id
      const customer = await stripe.customers.retrieve(subscription.customer as string);
      const userId = (customer as Stripe.Customer).metadata?.user_id;

      if (!userId) {
        console.error('No user_id in customer metadata');
        return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
      }

      // Check idempotency
      const { data: existingEvent } = await supabase
        .from('billing_events')
        .select('id')
        .eq('stripe_event_id', event.id)
        .single();

      if (existingEvent) {
        return NextResponse.json({ received: true, skipped: true });
      }

      // Get profile for UTM
      const { data: profile } = await supabase
        .from('profiles')
        .select('utm_source, utm_medium, utm_campaign, utm_content, utm_term')
        .eq('id', userId)
        .single();

      // Determine plan based on status
      const plan =
        subscription.status === 'active' || subscription.status === 'trialing' ? 'pro' : 'free';

      // Update profile
      await supabase
        .from('profiles')
        .update({
          plan,
          plan_status: subscription.status,
          plan_updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      // Insert billing event
      await supabase.from('billing_events').insert({
        user_id: userId,
        event_type: 'subscription_updated',
        plan,
        price_id: subscription.items.data[0]?.price.id || null,
        stripe_event_id: event.id,
        utm_source: profile?.utm_source || null,
        utm_medium: profile?.utm_medium || null,
        utm_campaign: profile?.utm_campaign || null,
      });

      return NextResponse.json({ received: true });
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;

      // Get customer metadata
      const customer = await stripe.customers.retrieve(subscription.customer as string);
      const userId = (customer as Stripe.Customer).metadata?.user_id;

      if (!userId) {
        console.error('No user_id in customer metadata');
        return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
      }

      // Check idempotency
      const { data: existingEvent } = await supabase
        .from('billing_events')
        .select('id')
        .eq('stripe_event_id', event.id)
        .single();

      if (existingEvent) {
        return NextResponse.json({ received: true, skipped: true });
      }

      // Get profile for UTM
      const { data: profile } = await supabase
        .from('profiles')
        .select('utm_source, utm_medium, utm_campaign, utm_content, utm_term')
        .eq('id', userId)
        .single();

      // Update profile to free
      await supabase
        .from('profiles')
        .update({
          plan: 'free',
          plan_status: 'canceled',
          plan_updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      // Insert billing event
      await supabase.from('billing_events').insert({
        user_id: userId,
        event_type: 'subscription_canceled',
        plan: 'free',
        price_id: subscription.items.data[0]?.price.id || null,
        stripe_event_id: event.id,
        utm_source: profile?.utm_source || null,
        utm_medium: profile?.utm_medium || null,
        utm_campaign: profile?.utm_campaign || null,
      });

      return NextResponse.json({ received: true });
    }

    // Unhandled event type
    return NextResponse.json({ received: true, unhandled: event.type });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

