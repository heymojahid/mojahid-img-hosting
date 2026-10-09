'use client';

import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, ArrowRight, X } from 'lucide-react';

interface PasswordModalProps {
  isOpen: boolean;
  onSuccess: (password: string) => void;
  onClose?: () => void;
}

export function PasswordModal({ isOpen, onSuccess, onClose }: PasswordModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem('mojahidx_auth_token', password);
        onSuccess(password);
      } else {
        setError(data.error || 'Incorrect password.');
      }
    } catch {
      // Fallback: check locally if network issue
      if (password === 'Mojahid@1234') {
        localStorage.setItem('mojahidx_auth_token', password);
        onSuccess(password);
      } else {
        setError('Network error. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-md rounded-[32px] border border-zinc-800 bg-[#0a0a0c] p-6 sm:p-8 shadow-2xl shadow-black/90 text-zinc-100 animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute right-5 top-5 rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-white transition"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Header Icon */}
        <div className="flex items-center justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/80 shadow-inner">
            <Lock className="h-7 w-7 text-white" />
          </div>
        </div>

        {/* Title */}
        <div className="mt-5 text-center">
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-display">
            Personal Upload Access
          </h3>
          <p className="mt-1.5 text-xs sm:text-sm text-zinc-400">
            Enter your password to upload files to your private host.
          </p>
        </div>

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Enter password..."
              autoFocus
              className="w-full rounded-2xl border border-zinc-800 bg-black/60 px-4 py-3.5 pr-12 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-center text-xs text-rose-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-semibold text-black transition hover:bg-zinc-200 active:scale-95 disabled:opacity-50 shadow-md"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
                <span>Verifying...</span>
              </span>
            ) : (
              <>
                <span>Unlock &amp; Upload</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Security badge note */}
        <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-zinc-500">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          <span>Password is saved for this session</span>
        </div>
      </div>
    </div>
  );
}
