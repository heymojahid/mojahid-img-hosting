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
  Layers,
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
    {
      key: 'direct',
      label: 'Direct Raw URL',
      description: 'Permanent GitHub CDN URL for direct embedding & raw access',
      value: data.directUrl,
      icon: Globe,
    },
    ...(data.customDomainUrl
      ? [
          {
            key: 'custom',
            label: 'Custom Domain CDN',
            description: 'Vercel Edge cached URL (img.mojahidx.com)',
            value: data.customDomainUrl,
            icon: Globe,
          },
        ]
      : []),
    {
      key: 'proxy',
      label: 'Edge Proxy URL',
      description: 'Proxied through this app with 1-year immutable caching',
      value: typeof window !== 'undefined' ? `${window.location.origin}${data.proxyUrl}` : data.proxyUrl,
      icon: Layers,
    },
    {
      key: 'markdown',
      label: 'Markdown Syntax',
      description: 'Ready to paste into GitHub, Reddit, Notion, or Obsidian',
      value: `![${data.name}](${primaryUrl})`,
      icon: FileText,
    },
    {
      key: 'html',
      label: 'HTML <img> Tag',
      description: 'Standard responsive HTML image snippet with lazy loading',
      value: `<img src="${primaryUrl}" alt="${data.name}" loading="lazy" />`,
      icon: Code,
    },
    {
      key: 'bbcode',
      label: 'BBCode',
      description: 'For classic forums, bulletin boards, and communities',
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
    <div className="w-full rounded-2xl border border-purple-800/40 bg-[#120e24]/90 p-6 shadow-2xl shadow-purple-950/40 backdrop-blur-xl">
      {/* Success Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-purple-900/30 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">Upload Confirmed</h2>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/30">
                Committed to GitHub
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Verified commit sha:{' '}
              <span className="font-mono text-purple-300">
                {data.sha ? data.sha.slice(0, 7) : 'verified'}
              </span>
            </p>
          </div>
        </div>

        <button
          onClick={onReset}
          className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-purple-600/30 transition-all hover:bg-purple-500 hover:shadow-purple-500/40 active:scale-95"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Upload Another</span>
        </button>
      </div>

      {/* Main Grid: Preview on Left, Links on Right */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Image Preview & Details */}
        <div className="flex flex-col gap-4 lg:col-span-5">
          <div className="group relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border border-purple-900/40 bg-[#090713]">
            {/* Checkerboard background pattern for transparent images */}
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
              src={data.directUrl}
              alt={data.name}
              className="relative z-10 max-h-full max-w-full object-contain p-2 transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 z-20 flex items-center justify-center gap-3 bg-black/60 opacity-0 backdrop-blur-xs transition-opacity group-hover:opacity-100">
              <a
                href={data.directUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg bg-purple-600/90 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-purple-500"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Open Full</span>
              </a>
              <a
                href={data.directUrl}
                download={data.storedName}
                className="flex items-center gap-1.5 rounded-lg bg-zinc-800/90 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-700"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Save</span>
              </a>
            </div>
          </div>

          {/* Metadata Card */}
          <div className="rounded-xl border border-purple-900/30 bg-[#0b0918] p-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-zinc-500">Original File</span>
                <p className="truncate font-medium text-zinc-200" title={data.name}>
                  {data.name}
                </p>
              </div>
              <div>
                <span className="text-zinc-500">File Size</span>
                <p className="font-medium text-zinc-200">{formatFileSize(data.size)}</p>
              </div>
              <div>
                <span className="text-zinc-500">Format</span>
                <p className="font-mono uppercase text-purple-400">
                  {data.mimeType.replace('image/', '')}
                </p>
              </div>
              <div>
                <span className="text-zinc-500">Path Under Repo</span>
                <p className="truncate font-mono text-[11px] text-zinc-400" title={data.path}>
                  {data.path}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Copy Options */}
        <div className="flex flex-col gap-3.5 lg:col-span-7">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-300">
              Quick Embed & Direct Links
            </span>
            <span className="text-[11px] text-zinc-400">Click button to copy</span>
          </div>

          {copyOptions.map((opt) => {
            const Icon = opt.icon;
            const isCopied = copiedKey === opt.key;

            return (
              <div
                key={opt.key}
                className="group relative rounded-xl border border-purple-900/30 bg-[#0b0918]/80 p-3.5 transition-all hover:border-purple-600/50 hover:bg-[#0f0c22]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-950 text-purple-300 ring-1 ring-purple-800/40">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-white">{opt.label}</h4>
                      <p className="text-[11px] text-zinc-400">{opt.description}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => copyToClipboard(opt.value, opt.key)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      isCopied
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                        : 'bg-purple-600/20 text-purple-200 ring-1 ring-purple-500/40 hover:bg-purple-600 hover:text-white'
                    }`}
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

                {/* Code Preview Strip */}
                <div className="mt-2.5 flex items-center justify-between rounded-lg bg-[#06050d] px-3 py-2">
                  <code className="overflow-x-auto whitespace-nowrap font-mono text-[11px] text-purple-200/90 select-all">
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
