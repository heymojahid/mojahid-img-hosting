'use client';

import React, { useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { UploadResultData } from '@/lib/types';

interface UploadResultCardProps {
  data: UploadResultData;
  onReset: () => void;
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

  return (
    <div className="w-full rounded-2xl border border-zinc-800 bg-[#09090b] p-5 sm:p-7">
      {/* Image Preview */}
      <div className="relative flex max-h-72 w-full items-center justify-center overflow-hidden rounded-xl border border-zinc-800 bg-black p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ultraShortUrl}
          alt={data.name}
          className="max-h-64 max-w-full object-contain rounded-lg"
        />
      </div>

      {/* Instant Ultra-Short URL Strip */}
      <div className="mt-5 space-y-2">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span className="font-medium text-white">Instant CDN URL</span>
          <a
            href={ultraShortUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors"
          >
            <span>Open</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {/* Input & Copy Button Group */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex-1 flex items-center rounded-xl border border-zinc-800 bg-black px-3.5 py-2.5">
            <input
              type="text"
              readOnly
              value={ultraShortUrl}
              className="w-full bg-transparent font-mono text-xs sm:text-sm text-zinc-200 outline-none select-all"
            />
          </div>

          <button
            onClick={copyToClipboard}
            className={`flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs sm:text-sm font-semibold transition-all active:scale-95 ${
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
        </div>
      </div>

      {/* Upload Another Button */}
      <div className="mt-5 pt-4 border-t border-zinc-900 flex justify-center">
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors py-1"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Upload Another Image</span>
        </button>
      </div>
    </div>
  );
}
