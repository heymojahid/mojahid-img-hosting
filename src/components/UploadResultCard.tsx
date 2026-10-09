'use client';

import React, { useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  Code,
  FileText,
  Globe,
  RefreshCw,
  Download,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { UploadResultData } from '@/lib/types';

interface UploadResultCardProps {
  data: UploadResultData;
  onReset: () => void;
}

export function UploadResultCard({ data, onReset }: UploadResultCardProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const primaryUrl = data.customDomainUrl || data.directUrl;

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const copyOptions = [
    ...(data.customDomainUrl
      ? [
          {
            key: 'short',
            label: 'Ultra-Short Custom URL',
            description: 'Fastest 1-year cached link (only ~40 chars)',
            value: data.customDomainUrl,
            icon: Zap,
            featured: true,
          },
        ]
      : []),
    {
      key: 'markdown',
      label: 'Markdown Syntax',
      description: 'Ready to paste into GitHub, Reddit, Notion, Obsidian',
      value: `![${data.name}](${primaryUrl})`,
      icon: FileText,
    },
    {
      key: 'html',
      label: 'HTML <img> Tag',
      description: 'Standard responsive HTML snippet with lazy loading',
      value: `<img src="${primaryUrl}" alt="${data.name}" loading="lazy" />`,
      icon: Code,
    },
    {
      key: 'direct',
      label: 'Direct Raw GitHub URL',
      description: 'Permanent GitHub CDN URL for direct embedding',
      value: data.directUrl,
      icon: Globe,
    },
    {
      key: 'bbcode',
      label: 'BBCode',
      description: 'For forums, bulletin boards, and communities',
      value: `[IMG]${primaryUrl}[/IMG]`,
      icon: Code,
    },
  ];

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="w-full rounded-2xl border border-purple-800/40 bg-[#120e24]/90 p-4 sm:p-6 shadow-2xl shadow-purple-950/40 backdrop-blur-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-purple-900/30 pb-4 sm:pb-5">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30">
            <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-xl font-bold text-white">Upload Confirmed</h2>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] sm:text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/30">
                Live
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-zinc-400">
              SHA:{' '}
              <span className="font-mono text-purple-300">
                {data.sha ? data.sha.slice(0, 7) : 'verified'}
              </span>
            </p>
          </div>
        </div>

        <button
          onClick={onReset}
          className="flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 sm:py-2 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-purple-600/30 transition-all hover:bg-purple-500 active:scale-95"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Upload Another Image</span>
        </button>
      </div>

      {/* Main Grid: Preview & Links */}
      <div className="mt-5 sm:mt-6 grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Image Preview & Details */}
        <div className="flex flex-col gap-3.5 lg:col-span-5">
          <div className="relative flex aspect-square sm:aspect-auto sm:h-64 lg:aspect-square w-full items-center justify-center overflow-hidden rounded-xl border border-purple-900/40 bg-[#090713]">
            {/* Checkerboard pattern for transparency */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `radial-gradient(#8b5cf6 0.75px, transparent 0.75px), radial-gradient(#8b5cf6 0.75px, #090713 0.75px)`,
                backgroundSize: '16px 16px',
                backgroundPosition: '0 0, 8px 8px',
              }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={primaryUrl}
              alt={data.name}
              className="relative z-10 max-h-full max-w-full object-contain p-2"
            />
          </div>

          {/* Mobile Quick Action Buttons below preview */}
          <div className="flex items-center gap-2">
            <a
              href={primaryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-purple-950/70 border border-purple-800/40 py-2 text-xs font-semibold text-purple-200 transition hover:bg-purple-900/50"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Open Image</span>
            </a>
            <a
              href={data.directUrl}
              download={data.storedName}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-zinc-900 border border-zinc-800 py-2 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-800"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download</span>
            </a>
          </div>

          {/* Metadata Card */}
          <div className="rounded-xl border border-purple-900/30 bg-[#0b0918] p-3 sm:p-4 text-xs">
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <div>
                <span className="text-[11px] text-zinc-500 block">File Name</span>
                <p className="truncate font-medium text-zinc-200" title={data.name}>
                  {data.name}
                </p>
              </div>
              <div>
                <span className="text-[11px] text-zinc-500 block">Size</span>
                <p className="font-medium text-zinc-200">{formatFileSize(data.size)}</p>
              </div>
              <div>
                <span className="text-[11px] text-zinc-500 block">Format</span>
                <p className="font-mono uppercase text-purple-400">
                  {data.mimeType.replace('image/', '')}
                </p>
              </div>
              <div>
                <span className="text-[11px] text-zinc-500 block">Unique ID</span>
                <p className="truncate font-mono text-[11px] text-zinc-300">
                  {data.storedName}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Copy Options */}
        <div className="flex flex-col gap-3 lg:col-span-7">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-300">
              Quick Embed & Share Links
            </span>
            <span className="text-[11px] text-zinc-400">Tap copy</span>
          </div>

          {copyOptions.map((opt) => {
            const Icon = opt.icon;
            const isCopied = copiedKey === opt.key;

            return (
              <div
                key={opt.key}
                className={`group rounded-xl border p-3 sm:p-3.5 transition-all ${
                  opt.featured
                    ? 'border-purple-600/60 bg-[#161033] shadow-md shadow-purple-950/50'
                    : 'border-purple-900/30 bg-[#0b0918]/80 hover:border-purple-700/50 hover:bg-[#0f0c22]'
                }`}
              >
                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                        opt.featured
                          ? 'bg-purple-600 text-white'
                          : 'bg-purple-950 text-purple-300 ring-1 ring-purple-800/40'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-white truncate">
                        {opt.label}
                      </h4>
                      <p className="text-[10px] sm:text-[11px] text-zinc-400 truncate">
                        {opt.description}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => copyToClipboard(opt.value, opt.key)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all active:scale-95 ${
                      isCopied
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                        : opt.featured
                        ? 'bg-purple-600 text-white hover:bg-purple-500'
                        : 'bg-purple-600/20 text-purple-200 ring-1 ring-purple-500/40 hover:bg-purple-600 hover:text-white'
                    }`}
                    aria-label={`Copy ${opt.label}`}
                  >
                    {isCopied ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Code Preview Box */}
                <div className="mt-2.5 flex items-center rounded-lg bg-[#06050d] px-2.5 py-1.5 sm:px-3 sm:py-2">
                  <code className="w-full overflow-x-auto whitespace-nowrap font-mono text-[11px] text-purple-200/90 select-all scrollbar-none">
                    {opt.value}
                  </code>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
