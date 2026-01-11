'use client';

import { useState, useEffect, useRef } from 'react';

interface ExpandableWaitlistProps {
  source?: string;
}

export default function ExpandableWaitlist({ source = 'signed_out_lp' }: ExpandableWaitlistProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle escape key to collapse
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('keydown', handleEscape);
      // Focus input when expanded
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isExpanded]);

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
        // Keep expanded to show success state
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

  return (
    <div className="mt-4">
      {/* Toggle link */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-sm text-white opacity-60 hover:opacity-100 transition-opacity underline focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-[#121211] rounded"
        aria-expanded={isExpanded}
        aria-controls="waitlist-form"
      >
        {isExpanded ? 'Hide' : 'Not ready yet? Get occasional INDEX updates'}
      </button>

      {/* Expandable form */}
      <div
        id="waitlist-form"
        ref={formRef}
        className={`overflow-hidden transition-all duration-200 ease-in-out ${
          isExpanded ? 'max-h-96 opacity-100 mt-4' : 'max-h-0 opacity-0'
        }`}
      >
        {success ? (
          <div className="pt-2">
            <p className="text-sm text-white opacity-80">
              You're on the list.
            </p>
          </div>
        ) : isExpanded ? (
          <div className="pt-4 space-y-3">
            <p className="text-xs text-white opacity-70">
              Occasional notes about INDEX. No newsletter. No noise.
            </p>
            <form onSubmit={handleSubmit} className="space-y-2">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@domain.com"
                  className="flex-1 px-3 py-2 text-sm border border-white/20 rounded-lg bg-white/10 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/40 backdrop-blur-sm"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="px-4 py-2 text-sm bg-white text-[#121211] rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {loading ? '...' : '→'}
                </button>
              </div>
              {error && (
                <p className="text-xs text-red-300">{error}</p>
              )}
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );
}

