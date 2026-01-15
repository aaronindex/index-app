// lib/stripe/config.ts
// Stripe configuration helper with environment-aware key selection

const isProd = process.env.NODE_ENV === 'production';
const stripeEnabled = process.env.STRIPE_ENABLED === 'true';

// Validate and select keys based on environment
function getStripeConfig() {
  if (!stripeEnabled) {
    return {
      stripeEnabled: false,
      stripeSecretKey: null,
      stripePublishableKey: null,
      stripePriceId: null,
      stripeWebhookSecret: null,
      appUrl: process.env.APP_URL || (isProd ? 'https://indexapp.co' : 'http://localhost:3000'),
    };
  }

  if (isProd) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
    const priceId = process.env.STRIPE_BASE_PRICE_ID;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // Validate production keys
    if (!secretKey || !publishableKey || !priceId || !webhookSecret) {
      throw new Error('Missing required Stripe production environment variables');
    }

    // Ensure we're using live keys in production
    if (secretKey.startsWith('sk_test_')) {
      throw new Error('Production environment must use live Stripe keys (sk_live_*)');
    }

    if (publishableKey.startsWith('pk_test_')) {
      throw new Error('Production environment must use live Stripe keys (pk_live_*)');
    }

    return {
      stripeEnabled: true,
      stripeSecretKey: secretKey,
      stripePublishableKey: publishableKey,
      stripePriceId: priceId,
      stripeWebhookSecret: webhookSecret,
      appUrl: process.env.APP_URL || 'https://indexapp.co',
    };
  } else {
    // Local/test environment
    const secretKey = process.env.STRIPE_TEST_SECRET_KEY;
    const publishableKey = process.env.STRIPE_TEST_PUBLISHABLE_KEY;
    const priceId = process.env.STRIPE_TEST_BASE_PRICE_ID;
    const webhookSecret = process.env.STRIPE_TEST_WEBHOOK_SECRET;

    // Validate test keys
    if (!secretKey || !publishableKey || !priceId || !webhookSecret) {
      throw new Error('Missing required Stripe test environment variables');
    }

    // Ensure we're using test keys in local
    if (secretKey.startsWith('sk_live_')) {
      throw new Error('Local environment must use test Stripe keys (sk_test_*)');
    }

    if (publishableKey.startsWith('pk_live_')) {
      throw new Error('Local environment must use test Stripe keys (pk_test_*)');
    }

    return {
      stripeEnabled: true,
      stripeSecretKey: secretKey,
      stripePublishableKey: publishableKey,
      stripePriceId: priceId,
      stripeWebhookSecret: webhookSecret,
      appUrl: process.env.APP_URL || 'http://localhost:3000',
    };
  }
}

const config = getStripeConfig();

export const stripeConfig = {
  stripeEnabled: config.stripeEnabled,
  stripeSecretKey: config.stripeSecretKey,
  stripePublishableKey: config.stripePublishableKey,
  stripePriceId: config.stripePriceId,
  stripeWebhookSecret: config.stripeWebhookSecret,
  appUrl: config.appUrl,
};

// Helper to throw if Stripe is not enabled
export function requireStripeEnabled() {
  if (!stripeEnabled) {
    throw new Error('Stripe billing is not enabled');
  }
  return config;
}

