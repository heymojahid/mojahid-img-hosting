'use client';

import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Copy,
  Check,
  Server,
} from 'lucide-react';
import { SystemStatusResponse } from '@/lib/types';

interface SetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: SystemStatusResponse | null;
}

export function SetupModal({ isOpen, onClose, status }: SetupModalProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const envSample = `# Storage Repository Settings
GITHUB_OWNER=your-github-username
GITHUB_REPO=mojahidx-image-hosting
GITHUB_BRANCH=main

# Fine-Grained Personal Access Token (Never exposed to client)
# Scope required: "Contents: Read and write" for mojahidx-image-hosting
GITHUB_TOKEN=github_pat_11A...

# Optional Custom Domain / CDN Base URL (e.g., https://img.mojahidx.com)
# If omitted, defaults to https://raw.githubusercontent.com/{owner}/{repo}/{branch}
PUBLIC_IMAGE_BASE_URL=

# Optional Limits
MAX_FILE_SIZE_MB=5
RATE_LIMIT_MAX_REQUESTS=25
RATE_LIMIT_WINDOW_SECONDS=600`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-purple-800/40 bg-[#0f0c22] shadow-2xl shadow-purple-950/60 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-purple-900/30 px-4 py-3.5 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-purple-600/20 text-purple-300 ring-1 ring-purple-500/40">
              <Server className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">Setup Guide</h2>
              <p className="text-[11px] sm:text-xs text-zinc-400">GitHub storage &amp; custom domain setup</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 text-xs text-zinc-300">
          {/* Current Live Status Banner */}
          <div className="rounded-xl border border-purple-900/40 bg-[#080614] p-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-purple-400" />
              Current System Status
            </h3>
            <div className="mt-2.5 grid grid-cols-2 gap-3 sm:grid-cols-4 font-mono text-[11px]">
              <div className="rounded-lg bg-zinc-900/60 p-2.5 border border-zinc-800">
                <span className="text-zinc-500 block">Status:</span>
                <span className={status?.configured ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                  {status?.configured ? 'Configured' : 'Needs Token'}
                </span>
              </div>
              <div className="rounded-lg bg-zinc-900/60 p-2.5 border border-zinc-800">
                <span className="text-zinc-500 block">Storage:</span>
                <span className="text-purple-300 truncate block">
                  {status?.configured ? 'Connected' : 'Pending'}
                </span>
              </div>
              <div className="rounded-lg bg-zinc-900/60 p-2.5 border border-zinc-800">
                <span className="text-zinc-500 block">Engine:</span>
                <span className="text-zinc-200">GitHub REST API</span>
              </div>
              <div className="rounded-lg bg-zinc-900/60 p-2.5 border border-zinc-800">
                <span className="text-zinc-500 block">Max Size:</span>
                <span className="text-zinc-200">{status?.maxFileSizeMB || 5} MB</span>
              </div>
            </div>
          </div>

          {/* Step 1: Create Repository */}
          <div className="space-y-2">
            <h4 className="flex items-center gap-2 text-sm font-bold text-white">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-[11px] font-bold text-white">
                1
              </span>
              Create the Dedicated GitHub Image Storage Repository
            </h4>
            <p className="text-zinc-400 pl-7 leading-relaxed">
              Create a new public (or private) GitHub repository named{' '}
              <code className="rounded bg-purple-950 px-1.5 py-0.5 text-purple-300 font-mono">
                mojahidx-image-hosting
              </code>
              . Initialize it with a default <code className="font-mono text-purple-300">main</code> branch (e.g. with a README).
            </p>
          </div>

          {/* Step 2: Fine-Grained Token */}
          <div className="space-y-2">
            <h4 className="flex items-center gap-2 text-sm font-bold text-white">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-[11px] font-bold text-white">
                2
              </span>
              Create a Fine-Grained Personal Access Token (PAT)
            </h4>
            <div className="pl-7 space-y-1.5 text-zinc-400 leading-relaxed">
              <p>
                1. Go to GitHub &rarr; <strong>Settings</strong> &rarr; <strong>Developer settings</strong> &rarr;{' '}
                <strong>Personal access tokens</strong> &rarr; <strong>Fine-grained tokens</strong>.
              </p>
              <p>
                2. Set Token name: <code className="font-mono text-purple-300">MojahidX Image Hosting Upload</code>.
              </p>
              <p>
                3. Under <strong>Repository access</strong>, select: <em>Only select repositories</em> &rarr;{' '}
                <strong className="text-zinc-200">mojahidx-image-hosting</strong>.
              </p>
              <p>
                4. Under <strong>Repository permissions</strong>, find <strong>Contents</strong> and set it to{' '}
                <strong className="text-purple-300">Read and write</strong>.
              </p>
              <p className="text-emerald-400/90 font-medium pt-1">
                &bull; Security Guarantee: This token has zero access to your other repositories or account settings.
              </p>
            </div>
          </div>

          {/* Step 3: Configure Environment Variables */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="flex items-center gap-2 text-sm font-bold text-white">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-[11px] font-bold text-white">
                  3
                </span>
                Configure Environment Variables (.env.local or Vercel)
              </h4>
              <button
                onClick={() => copyText(envSample, 'env')}
                className="flex items-center gap-1 text-[11px] font-semibold text-purple-400 hover:text-purple-300"
              >
                {copiedKey === 'env' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedKey === 'env' ? 'Copied!' : 'Copy template'}</span>
              </button>
            </div>
            <div className="pl-7">
              <pre className="rounded-xl border border-purple-900/40 bg-[#06040d] p-3 font-mono text-[11px] text-purple-200/90 overflow-x-auto">
                {envSample}
              </pre>
            </div>
          </div>

          {/* Step 4: Custom Domain Setup */}
          <div className="space-y-2">
            <h4 className="flex items-center gap-2 text-sm font-bold text-white">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-[11px] font-bold text-white">
                4
              </span>
              Custom Domain (img.mojahidx.com) & Vercel Caching
            </h4>
            <div className="pl-7 space-y-1.5 text-zinc-400 leading-relaxed">
              <p>
                1. <strong>Add Domain in Vercel:</strong> Project Settings &rarr; Domains &rarr; Add{' '}
                <code className="font-mono text-purple-300">img.mojahidx.com</code>.
              </p>
              <p>
                2. <strong>DNS Record:</strong> In your DNS provider (Cloudflare, Namecheap, etc.), create a{' '}
                <strong>CNAME</strong> record:
                <br />
                <code className="mt-1 block rounded bg-purple-950/60 p-2 font-mono text-purple-300">
                  Type: CNAME | Name: img | Value: cname.vercel-dns.com
                </code>
              </p>
              <p>
                3. <strong>Image Serving:</strong> Requests to{' '}
                <code className="font-mono text-purple-300">img.mojahidx.com/uploads/*</code> are served by our streaming route with{' '}
                <code className="font-mono text-emerald-400">Cache-Control: public, max-age=31536000, immutable</code>.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end border-t border-purple-900/30 px-6 py-3 bg-[#0a0817]">
          <button
            onClick={onClose}
            className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-purple-500"
          >
            Got it, Close
          </button>
        </div>
      </div>
    </div>
  );
}
