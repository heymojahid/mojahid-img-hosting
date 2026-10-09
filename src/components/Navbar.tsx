'use client';

import React from 'react';
import { SystemStatusResponse } from '@/lib/types';

interface NavbarProps {
  status: SystemStatusResponse | null;
  loadingStatus: boolean;
}

export function Navbar({ status, loadingStatus }: NavbarProps) {
  const isConfigured = status?.configured;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-900 bg-black/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand Logo: MojahidX */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-black font-mono text-xs font-black tracking-tighter">
            M
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold tracking-tight text-white">
              Mojahid<span className="text-zinc-400 font-light">X</span>
            </span>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2 text-xs">
          {loadingStatus ? (
            <span className="h-2 w-2 rounded-full bg-zinc-700 animate-pulse" />
          ) : isConfigured ? (
            <div className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-[11px] text-zinc-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              <span className="font-mono">ready</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-[11px] text-amber-400">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              <span>setup token</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
