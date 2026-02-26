// app/components/billing/UpgradeModal.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { track } from '@/lib/analytics/track';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  source: 'paywall_project_limit' | 'paywall_ask_limit' | 'paywall_asset_upload' | 'paywall_import_limit' | 'settings' | 'header' | 'pricing_page';
}

export default function UpgradeModal({ isOpen, onClose, source }: UpgradeModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleUpgrade = async () => {
    setLoading(true);

    // Fire click event
    track('billing_upgrade_clicked', {
      source,
      plan: 'pro',
      price_usd: 30,
    });

    try {
      const response = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source }),
      });

      const data = await response.json();

      if (data.alreadyPro) {
        // User already has pro
        router.refresh();
        onClose();
        return;
      }

      if (data.url) {
        // Fire session created event
        track('billing_checkout_session_created', {
          source,
          plan: 'pro',
          price_usd: 30,
        });

        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      alert('Failed to start checkout. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-[rgb(var(--bg))] rounded-lg p-6 max-w-md w-full border border-zinc-200 dark:border-zinc-800"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold text-foreground mb-4">Upgrade to Pro</h2>

        <ul className="space-y-2 mb-6 text-sm text-[rgb(var(--muted))]">
          <li>• Unlimited projects</li>
          <li>• Full imports (JSON)</li>
        </ul>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Upgrade ($30/mo)'}
          </button>
        </div>
      </div>
    </div>
  );
}

