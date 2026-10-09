'use client';

import React, { useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  RefreshCw,
  Maximize2,
} from 'lucide-react';
import { UploadResultData } from '@/lib/types';

interface UploadResultCardProps {
  data: UploadResultData;
  onReset: () => void;
}

function formatBytes(bytes: number) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function UploadResultCard({ data, onReset }: UploadResultCardProps) {
  const [copied, setCopied] = useState(false);

  // The ultra-short URL (or fallback)
  const ultraShortUrl = data.customDomainUrl || data.proxyUrl || data.directUrl;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(ultraShortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  // Format a friendly display title
  const displayName = data.name || 'Image Preview';
  const formatType = data.mimeType ? data.mimeType.replace('image/', '').toUpperCase() : 'IMAGE';

  return (
    <div className="w-full rounded-[30px] sm:rounded-[36px] border border-zinc-800/80 bg-[#070709] p-5 sm:p-8 shadow-2xl shadow-black/90 transition-all">
      {/* Top Image Preview Viewport (Framed box matching reference design) */}
      <div className="relative w-full rounded-[20px] sm:rounded-2xl border border-zinc-800/80 bg-[#020203] overflow-hidden p-4 sm:p-8 flex flex-col items-center justify-center min-h-[260px] sm:min-h-[360px] group">
        {/* Floating Top-Left Badge (Inspired by bento pills) */}
        <div className="absolute top-3 sm:top-4 left-3 sm:left-4 z-10 flex items-center gap-2 rounded-lg border border-zinc-800/90 bg-black/80 backdrop-blur-md px-2.5 py-1 text-[11px] font-mono text-zinc-300 select-none">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
          <span>LIVE CDN</span>
        </div>

        {/* Floating Top-Right Format & Size Badge */}
        <div className="absolute top-3 sm:top-4 right-3 sm:right-4 z-10 flex items-center gap-1.5 rounded-lg border border-zinc-800/90 bg-black/80 backdrop-blur-md px-2.5 py-1 text-[11px] font-mono text-zinc-400 select-none">
          <span>{formatType}</span>
          <span>·</span>
          <span>{formatBytes(data.size)}</span>
        </div>

        {/* Preview Image with Ambient Glow */}
        <div className="relative flex items-center justify-center w-full h-full py-4 sm:py-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ultraShortUrl}
            alt={data.name}
            className="max-h-[240px] sm:max-h-[320px] max-w-full object-contain rounded-xl shadow-2xl shadow-black transition-transform duration-300 group-hover:scale-[1.01]"
          />
        </div>

        {/* Floating Bottom-Right "EXPAND" pill (Same to same as reference image) */}
        <a
          href={ultraShortUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 z-10 flex items-center gap-1.5 rounded-lg border border-zinc-800/80 bg-zinc-900/90 hover:bg-zinc-800 hover:border-zinc-700 backdrop-blur-md px-2.5 py-1 text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-zinc-400 hover:text-white transition select-none"
        >
          <span>EXPAND</span>
          <Maximize2 className="h-3 w-3" />
        </a>
      </div>

      {/* Title & Description Section (Exactly matching reference image layout) */}
      <div className="mt-6 sm:mt-7 px-1">
        <h2 className="text-xl sm:text-3xl font-bold tracking-tight text-white font-display truncate">
          {displayName}
        </h2>
        <p className="mt-2 text-xs sm:text-base text-zinc-400 leading-relaxed font-sans max-w-xl">
          Your image is permanently hosted with an instant ultra-short CDN link and cached globally across all edge locations.
        </p>
      </div>

      {/* URL Input & 1-Click Copy Bar */}
      <div className="mt-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 rounded-2xl border border-zinc-800/90 bg-[#030304] p-2 pl-3 sm:pl-4 shadow-inner">
          <input
            type="text"
            readOnly
            value={ultraShortUrl}
            className="w-full bg-transparent font-mono text-xs sm:text-sm text-zinc-200 outline-none select-all truncate py-1.5"
            aria-label="Image short CDN link"
          />

          <div className="flex items-center gap-2">
            <button
              onClick={copyToClipboard}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs sm:text-sm font-semibold transition-all active:scale-95 ${
                copied
                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                  : 'bg-white text-black hover:bg-zinc-200'
              }`}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copy Link</span>
                </>
              )}
            </button>

            <a
              href={ultraShortUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open image in new tab"
              className="flex items-center justify-center rounded-xl border border-zinc-800 hover:border-zinc-700 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white px-3.5 py-2.5 transition active:scale-95 text-xs sm:text-sm"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Upload Another Button */}
      <div className="mt-6 pt-4 border-t border-zinc-900 flex justify-center">
        <button
          onClick={onReset}
          className="flex items-center gap-2 text-xs sm:text-sm text-zinc-400 hover:text-white transition-colors py-1.5 px-3 rounded-lg hover:bg-zinc-900/60"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Upload Another Image</span>
        </button>
      </div>
    </div>
  );
}
