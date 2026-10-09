'use client';

import React from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { SystemStatusResponse } from '@/lib/types';

interface NavbarProps {
  status: SystemStatusResponse | null;
  loadingStatus: boolean;
  onOpenSetupGuide: () => void;
}

export function Navbar({ status, loadingStatus, onOpenSetupGuide }: NavbarProps) {
  const isConfigured = status?.configured;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-purple-900/30 bg-[#0c0a15]/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3.5 py-2.5 sm:px-6 sm:py-3">
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-violet-500 shadow-md shadow-purple-600/30">
            <span className="font-mono text-base sm:text-lg font-black text-white tracking-tighter">MX</span>
            <div className="absolute -inset-0.5 rounded-xl bg-purple-500/20 blur-xs pointer-events-none" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-base sm:text-lg font-bold tracking-tight text-white">
                Mojahid<span className="text-purple-400">X</span>
              </span>
              <span className="rounded-full bg-purple-500/10 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-semibold text-purple-300 ring-1 ring-purple-500/30">
                Host
              </span>
            </div>
            <p className="hidden text-[11px] text-zinc-400 sm:block">
              Edge Cached &bull; Zero Server Leaks
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Status Pill */}
          <button
            onClick={onOpenSetupGuide}
            className={`group flex items-center gap-1.5 sm:gap-2 rounded-full px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs font-medium transition-all ${
              loadingStatus
                ? 'bg-zinc-800 text-zinc-400'
                : isConfigured
                ? 'bg-emerald-950/60 text-emerald-300 ring-1 ring-emerald-500/40 hover:bg-emerald-900/60'
                : 'bg-amber-950/60 text-amber-300 ring-1 ring-amber-500/40 hover:bg-amber-900/60'
            }`}
            title="System storage status"
          >
            {loadingStatus ? (
              <span className="h-2 w-2 animate-ping rounded-full bg-zinc-400" />
            ) : isConfigured ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                </span>
                <span className="text-[11px] font-semibold">
                  <span className="hidden sm:inline">Storage: </span>Ready
                </span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-[11px] font-semibold">Setup</span>
              </>
            )}
          </button>

          {/* Setup / Docs Button */}
          <button
            onClick={onOpenSetupGuide}
            className="flex items-center gap-1.5 rounded-lg border border-purple-800/40 bg-purple-950/30 px-2.5 py-1.5 sm:px-3 text-xs font-medium text-purple-200 transition-colors hover:border-purple-600 hover:bg-purple-900/40 active:scale-95"
            aria-label="Setup guide"
          >
            <HelpCircle className="h-3.5 w-3.5 text-purple-400" />
            <span className="hidden xs:inline sm:inline">Guide</span>
          </button>
        </div>
      </div>
    </header>
  );
}
