'use client';

import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { ImageUploader } from '@/components/ImageUploader';
import { UploadResultCard } from '@/components/UploadResultCard';
import { UploadHistory } from '@/components/UploadHistory';
import { SetupModal } from '@/components/SetupModal';
import { Footer } from '@/components/Footer';
import { SystemStatusResponse, UploadResultData } from '@/lib/types';
import { Sparkles, Shield, AlertTriangle, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'mojahidx_upload_history';

export default function HomePage() {
  const [status, setStatus] = useState<SystemStatusResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [currentUpload, setCurrentUpload] = useState<UploadResultData | null>(null);
  const [history, setHistory] = useState<UploadResultData[]>([]);
  const [setupModalOpen, setSetupModalOpen] = useState(false);

  // Fetch status on load
  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch('/api/status');
        if (res.ok) {
          const data: SystemStatusResponse = await res.json();
          setStatus(data);
        }
      } catch (err) {
        console.error('Failed to query status:', err);
      } finally {
        setLoadingStatus(false);
      }
    }

    checkStatus();
  }, []);

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setTimeout(() => {
            setHistory(parsed);
          }, 0);
        }
      }
    } catch (e) {
      console.error('Failed to parse history:', e);
    }
  }, []);

  const handleUploadSuccess = (data: UploadResultData) => {
    setCurrentUpload(data);

    // Prepend to history and persist
    setHistory((prev) => {
      const updated = [data, ...prev.filter((i) => i.storedName !== data.storedName)].slice(0, 30);
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  };

  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#070512] text-zinc-100 selection:bg-purple-600 selection:text-white">
      {/* Background ambient gradient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-gradient-to-tr from-purple-800/20 via-indigo-700/15 to-violet-900/10 blur-[130px]" />
        <div className="absolute top-[600px] -left-40 h-[400px] w-[500px] rounded-full bg-purple-900/10 blur-[120px]" />
        <div className="absolute top-[800px] -right-40 h-[400px] w-[500px] rounded-full bg-indigo-900/10 blur-[120px]" />
      </div>

      <Navbar
        status={status}
        loadingStatus={loadingStatus}
        onOpenSetupGuide={() => setSetupModalOpen(true)}
      />

      <main className="relative z-10 flex-1 px-3.5 py-6 sm:px-6 sm:py-10 lg:py-12">
        <div className="mx-auto max-w-4xl">
          {/* Storage Alert (when not configured yet) */}
          {!loadingStatus && status && !status.configured && (
            <div className="mb-6 sm:mb-8 flex flex-col items-start justify-between gap-3 sm:gap-4 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-purple-950/30 to-amber-950/20 p-4 sm:p-5 backdrop-blur-md sm:flex-row sm:items-center">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-amber-200">
                    Storage Repository Not Connected
                  </h4>
                  <p className="mt-0.5 text-[11px] sm:text-xs text-zinc-300">
                    Configure your <code className="font-mono text-amber-300">GITHUB_TOKEN</code> and{' '}
                    <code className="font-mono text-amber-300">GITHUB_OWNER</code> in environment variables to enable uploads.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSetupModalOpen(true)}
                className="w-full sm:w-auto justify-center flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-amber-500/20 px-3.5 py-2 text-xs font-bold text-amber-300 ring-1 ring-amber-500/40 transition hover:bg-amber-500 hover:text-black"
              >
                <span>Setup Guide</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Hero Section */}
          <div className="text-center mb-6 sm:mb-10 px-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-800/40 bg-purple-950/40 px-3 py-1 text-[11px] sm:text-xs font-semibold text-purple-300 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-purple-400 shrink-0" />
              <span>MojahidX Image Hosting</span>
              <span className="text-purple-600">&bull;</span>
              <span className="text-zinc-400">Edge CDN</span>
            </div>

            <h1 className="mt-3 sm:mt-4 text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Host Images on{' '}
              <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-purple-500 bg-clip-text text-transparent">
                Edge CDN
              </span>
            </h1>

            <p className="mx-auto mt-2 sm:mt-3 max-w-2xl text-xs sm:text-sm text-zinc-400 leading-relaxed">
              Fast, secure image hosting with instant Markdown, HTML, and ultra-short shareable links.
            </p>
          </div>

          {/* Upload or Result Card */}
          <div className="mx-auto w-full transition-all">
            {currentUpload ? (
              <UploadResultCard
                data={currentUpload}
                onReset={() => setCurrentUpload(null)}
              />
            ) : (
              <ImageUploader
                maxFileSizeMB={status?.maxFileSizeMB || 5}
                onUploadSuccess={handleUploadSuccess}
              />
            )}
          </div>

          {/* Feature Highlights Grid */}
          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-purple-900/30 bg-[#0d0a1b]/60 p-4 backdrop-blur-xs">
              <div className="flex items-center gap-2 text-purple-300">
                <Shield className="h-4 w-4" />
                <h4 className="text-xs font-bold text-white">Magic Byte Verification</h4>
              </div>
              <p className="mt-1.5 text-xs text-zinc-400 leading-relaxed">
                Rejects SVG and executables at the binary level. Only valid PNG, JPEG, WebP, and GIF are stored.
              </p>
            </div>

            <div className="rounded-xl border border-purple-900/30 bg-[#0d0a1b]/60 p-4 backdrop-blur-xs">
              <div className="flex items-center gap-2 text-purple-300">
                <Zap className="h-4 w-4" />
                <h4 className="text-xs font-bold text-white">Immutable Unique Paths</h4>
              </div>
              <p className="mt-1.5 text-xs text-zinc-400 leading-relaxed">
                Stored under <code className="font-mono text-purple-300">uploads/YYYY/MM/</code> with random cryptographic IDs to prevent collisions.
              </p>
            </div>

            <div className="rounded-xl border border-purple-900/30 bg-[#0d0a1b]/60 p-4 backdrop-blur-xs">
              <div className="flex items-center gap-2 text-purple-300">
                <CheckCircle2 className="h-4 w-4" />
                <h4 className="text-xs font-bold text-white">Instant Embed Formats</h4>
              </div>
              <p className="mt-1.5 text-xs text-zinc-400 leading-relaxed">
                1-click copy for Direct Raw URLs, Custom Domains, Markdown snippets, and HTML tags.
              </p>
            </div>
          </div>

          {/* Session Upload History */}
          <UploadHistory
            history={history}
            onClearHistory={handleClearHistory}
            onSelectImage={(item) => setCurrentUpload(item)}
          />
        </div>
      </main>

      <Footer />

      {/* Setup Guide Modal */}
      <SetupModal
        isOpen={setupModalOpen}
        onClose={() => setSetupModalOpen(false)}
        status={status}
      />
    </div>
  );
}
