'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trackEvent } from '@/lib/analytics';

interface InviteCodeInputProps {
  variant?: 'hero' | 'compact';
  className?: string;
  darkBg?: boolean;
}

export default function InviteCodeInput({ variant = 'hero', className = '', darkBg = false }: InviteCodeInputProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate code is not empty
    if (!code.trim()) {
      setError('Please enter an invite code');
      return;
    }

    setError(null);
    setLoading(true);

    // Track invite code submission
    trackEvent('invite_code_submitted', {
      code_length: code.trim().length,
    });

    try {
      // Verify invite code
      const verifyResponse = await fetch('/api/invite-codes/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });

      const verifyData = await verifyResponse.json();

      if (!verifyData.valid) {
        setError(verifyData.error || 'Invalid invite code');
        trackEvent('invite_code_rejected', {
          error: verifyData.error || 'Invalid invite code',
        });
        setLoading(false);
        return;
      }

      // Track accepted invite code (privacy-safe: no code string)
      trackEvent('invite_code_accepted');

      // Redirect to signup with invite code
      router.push(`/auth/signup?code=${encodeURIComponent(code.trim().toUpperCase())}`);
    } catch (err) {
      setError('Failed to verify invite code. Please try again.');
      trackEvent('invite_code_rejected', {
        error: 'Network error',
      });
      setLoading(false);
    }
  };

  const isCompact = variant === 'compact';
  const isHero = variant === 'hero';
  const isDark = isHero || darkBg;

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className={`flex ${isCompact ? 'flex-col sm:flex-row gap-3' : 'flex-col sm:flex-row gap-4'} items-stretch sm:items-center`}>
        <input
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError(null);
          }}
          placeholder="Enter invite code"
          className={`flex-1 px-5 py-3.5 rounded-full border ${
            error
              ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20'
              : isDark
              ? 'border-white/20 focus:border-white/40 focus:ring-white/20'
              : 'border-[rgb(var(--text)/0.15)] dark:border-[rgb(var(--text)/0.25)] focus:border-[rgb(var(--text)/0.4)] focus:ring-[rgb(var(--text)/0.1)]'
          } ${
            isDark
              ? 'bg-white/10 backdrop-blur-sm text-white placeholder:text-white/60'
              : 'bg-white/50 dark:bg-black/30 backdrop-blur-sm text-[rgb(var(--text))] placeholder:text-[rgb(var(--muted))] placeholder:opacity-60'
          } focus:outline-none focus:ring-2 transition-all font-medium`}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          className={`px-6 py-3.5 rounded-full font-medium shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ${
            isCompact ? 'text-base' : 'text-lg'
          } ${
            isDark
              ? 'bg-white text-[#121211]'
              : 'bg-[#121211] dark:bg-[#FAF8F6] text-[#FAF8F6] dark:text-[#121211]'
          }`}
        >
          {loading ? 'Verifying...' : 'Continue'}
        </button>
      </div>
      {error && (
        <p className={`mt-2 text-sm ${isDark ? 'text-red-400' : 'text-red-600 dark:text-red-400'}`}>{error}</p>
      )}
    </form>
  );
}

