'use client';

import React from 'react';
import { ShieldCheck, Zap, Lock, Database } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-12 sm:mt-20 border-t border-purple-900/30 bg-[#090714] py-8 sm:py-12 text-xs text-zinc-500">
      <div className="mx-auto max-w-7xl px-3.5 sm:px-6">
        {/* Features row */}
        <div className="mb-10 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4">
          <div className="flex items-start gap-3 rounded-xl border border-purple-900/20 bg-[#0c091a]/60 p-4">
            <Database className="h-5 w-5 shrink-0 text-purple-400" />
            <div>
              <h5 className="font-semibold text-zinc-300">GitHub Object Store</h5>
              <p className="mt-0.5 text-[11px] text-zinc-500">
                Images committed to git history with permanent blob SHAs.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-purple-900/20 bg-[#0c091a]/60 p-4">
            <Lock className="h-5 w-5 shrink-0 text-purple-400" />
            <div>
              <h5 className="font-semibold text-zinc-300">Zero Token Exposure</h5>
              <p className="mt-0.5 text-[11px] text-zinc-500">
                PAT stored strictly server-side. Never bundled or leaked.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-purple-900/20 bg-[#0c091a]/60 p-4">
            <Zap className="h-5 w-5 shrink-0 text-purple-400" />
            <div>
              <h5 className="font-semibold text-zinc-300">Immutable 1-Year Caching</h5>
              <p className="mt-0.5 text-[11px] text-zinc-500">
                Unique paths under uploads/YYYY/MM/ cached for instant load.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-purple-900/20 bg-[#0c091a]/60 p-4">
            <ShieldCheck className="h-5 w-5 shrink-0 text-purple-400" />
            <div>
              <h5 className="font-semibold text-zinc-300">Strict Binary Validation</h5>
              <p className="mt-0.5 text-[11px] text-zinc-500">
                Magic byte verification rejects SVG, HTML, and executables.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-purple-900/20 pt-8 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-300">MojahidX Image Hosting</span>
            <span>&bull;</span>
            <span>Production Grade Image Hosting</span>
          </div>

          <p className="text-[11px]">
            Engineered with Next.js App Router &bull; Tailwind CSS &bull; GitHub REST API
          </p>
        </div>
      </div>
    </footer>
  );
}
