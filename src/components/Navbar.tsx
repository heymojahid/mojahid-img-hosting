'use client';

import React from 'react';
import { AlertTriangle, ExternalLink, HelpCircle, HardDrive } from 'lucide-react';
import { SystemStatusResponse } from '@/lib/types';

interface NavbarProps {
  status: SystemStatusResponse | null;
  loadingStatus: boolean;
  onOpenSetupGuide: () => void;
}

export function Navbar({ status, loadingStatus, onOpenSetupGuide }: NavbarProps) {
  const isConfigured = status?.configured;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-purple-900/30 bg-[#0c0a15]/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-violet-500 shadow-lg shadow-purple-600/30">
            <span className="font-mono text-xl font-black text-white tracking-tighter">MX</span>
            <div className="absolute -inset-0.5 rounded-xl bg-purple-500/20 blur-sm pointer-events-none" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-white">
                Mojahid<span className="text-purple-400">X</span>
              </span>
              <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-300 ring-1 ring-purple-500/30">
                Image Hosting
              </span>
            </div>
            <p className="hidden text-xs text-zinc-400 sm:block">
              GitHub-Backed &bull; Edge Cached &bull; Zero Server Leaks
            </p>
          </div>
        </div>

        {/* Right Action & System Status */}
        <div className="flex items-center gap-3">
          {/* Storage Status Pill */}
          <button
            onClick={onOpenSetupGuide}
            className={`group flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
              loadingStatus
                ? 'bg-zinc-800 text-zinc-400'
                : isConfigured
                ? 'bg-emerald-950/60 text-emerald-300 ring-1 ring-emerald-500/40 hover:bg-emerald-900/60'
                : 'bg-amber-950/60 text-amber-300 ring-1 ring-amber-500/40 hover:bg-amber-900/60'
            }`}
            title="Click to view storage configuration"
          >
            {loadingStatus ? (
              <span className="h-2 w-2 animate-ping rounded-full bg-zinc-400" />
            ) : isConfigured ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                </span>
                <span className="hidden sm:inline">Storage:</span>
                <span className="font-mono text-[11px] font-semibold">
                  {status?.repo || 'Connected'}
                </span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                <span className="font-semibold">Setup Storage</span>
              </>
            )}
          </button>

          {/* Setup / Docs Button */}
          <button
            onClick={onOpenSetupGuide}
            className="flex items-center gap-1.5 rounded-lg border border-purple-800/40 bg-purple-950/30 px-3 py-1.5 text-xs font-medium text-purple-200 transition-colors hover:border-purple-600 hover:bg-purple-900/40"
          >
            <HelpCircle className="h-3.5 w-3.5 text-purple-400" />
            <span className="hidden sm:inline">Setup Guide</span>
          </button>

          {/* GitHub Source Link */}
          {status?.owner && status?.repo && (
            <a
              href={`https://github.com/${status.owner}/${status.repo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
            >
              <HardDrive className="h-3.5 w-3.5 text-purple-400" />
              <span className="hidden md:inline">Storage Repo</span>
              <ExternalLink className="h-3 w-3 text-zinc-400" />
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
