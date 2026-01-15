// lib/stripe/service.ts
// Stripe service client initialization

import Stripe from 'stripe';
import { stripeConfig, requireStripeEnabled } from './config';

let stripeInstance: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (stripeInstance) {
    return stripeInstance;
  }

  const config = requireStripeEnabled();
  stripeInstance = new Stripe(config.stripeSecretKey!, {
    apiVersion: '2025-12-15.clover',
  });

  return stripeInstance;
}

