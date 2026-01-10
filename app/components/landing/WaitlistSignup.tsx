'use client';

import { useState } from 'react';

interface WaitlistSignupProps {
  source?: string;
  className?: string;
}

export default function WaitlistSignup({ source = 'signed_out_lp', className = '' }: WaitlistSignupProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source }),
      });

      const data = await response.json();

      if (data.ok) {
        setSuccess(true);
        setEmail('');
      } else {
        setError(data.error || 'Something went wrong. Try again.');
      }
    } catch (err) {
      setError('Something went wrong. Try again.');
      console.error('Waitlist signup error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={className}>
        <h3 className="text-lg font-semibold text-[rgb(var(--text))] mb-2">
          You're on the list.
        </h3>
        <p className="text-sm text-[rgb(var(--muted))]">
          We'll email when there's something worth your attention.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <h3 className="text-lg font-semibold text-[rgb(var(--text))] mb-2">
        Early access updates
      </h3>
      <p className="text-sm text-[rgb(var(--muted))] mb-4">
        Occasional notes about INDEX. No newsletter. No noise.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@domain.com"
            className="flex-1 px-4 py-2 border border-[rgb(var(--border))] rounded-lg bg-[rgb(var(--bg))] text-[rgb(var(--text))] placeholder:text-[rgb(var(--muted))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--text))] focus:ring-offset-2"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="px-6 py-2 bg-[rgb(var(--text))] text-[rgb(var(--bg))] rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {loading ? '...' : 'Get updates'}
          </button>
        </div>
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </form>
    </div>
  );
}

