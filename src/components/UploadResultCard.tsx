'use client';

import React, { useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  RefreshCw,
  Maximize2,
  FileText,
  FileArchive,
  Download,
  Smartphone,
  Palette,
  File,
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

  const isImage =
    data.mimeType.startsWith('image/') ||
    /\.(png|jpe?g|webp|gif)$/i.test(data.storedName);

  const fileExt = (data.name.split('.').pop() || data.storedName.split('.').pop() || 'FILE').toUpperCase();

  // Pick file icon
  const renderFileIcon = () => {
    const ext = fileExt.toLowerCase();
    if (ext === 'apk' || ext === 'aab') {
      return (
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_40px_-10px_rgba(16,185,129,0.3)]">
            <Smartphone className="h-10 w-10 text-emerald-400" />
          </div>
          <span className="text-xs font-mono font-bold text-emerald-400 tracking-wider">
            ANDROID PACKAGE ({fileExt})
          </span>
        </div>
      );
    }
    if (ext === 'pdf') {
      return (
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 shadow-[0_0_40px_-10px_rgba(244,63,94,0.3)]">
            <FileText className="h-10 w-10 text-rose-400" />
          </div>
          <span className="text-xs font-mono font-bold text-rose-400 tracking-wider">
            PDF DOCUMENT
          </span>
        </div>
      );
    }
    if (ext === 'plp') {
      return (
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-sky-500/30 bg-sky-500/10 shadow-[0_0_40px_-10px_rgba(14,165,233,0.3)]">
            <Palette className="h-10 w-10 text-sky-400" />
          </div>
          <span className="text-xs font-mono font-bold text-sky-400 tracking-wider">
            PIXELLAB PROJECT (PLP)
          </span>
        </div>
      );
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return (
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 shadow-[0_0_40px_-10px_rgba(245,158,11,0.3)]">
            <FileArchive className="h-10 w-10 text-amber-400" />
          </div>
          <span className="text-xs font-mono font-bold text-amber-400 tracking-wider">
            ARCHIVE ({fileExt})
          </span>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 shadow-inner">
          <File className="h-10 w-10 text-zinc-300" />
        </div>
        <span className="text-xs font-mono font-bold text-zinc-400 tracking-wider">
          {fileExt} FILE
        </span>
      </div>
    );
  };

  return (
    <div className="w-full rounded-[30px] sm:rounded-[36px] border border-zinc-800/80 bg-[#070709] p-5 sm:p-8 shadow-2xl shadow-black/90 transition-all">
      {/* Top Preview Viewport (Framed box matching reference design) */}
      <div className="relative w-full rounded-[20px] sm:rounded-2xl border border-zinc-800/80 bg-[#020203] overflow-hidden p-4 sm:p-8 flex flex-col items-center justify-center min-h-[260px] sm:min-h-[360px] group">
        {/* Floating Top-Left Badge */}
        <div className="absolute top-3 sm:top-4 left-3 sm:left-4 z-10 flex items-center gap-2 rounded-lg border border-zinc-800/90 bg-black/80 backdrop-blur-md px-2.5 py-1 text-[11px] font-mono text-zinc-300 select-none">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
          <span>LIVE CDN</span>
        </div>

        {/* Floating Top-Right Format & Size Badge */}
        <div className="absolute top-3 sm:top-4 right-3 sm:right-4 z-10 flex items-center gap-1.5 rounded-lg border border-zinc-800/90 bg-black/80 backdrop-blur-md px-2.5 py-1 text-[11px] font-mono text-zinc-400 select-none">
          <span>{fileExt}</span>
          <span>·</span>
          <span>{formatBytes(data.size)}</span>
        </div>

        {/* Viewport Content */}
        <div className="relative flex items-center justify-center w-full h-full py-6">
          {isImage ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={ultraShortUrl}
              alt={data.name}
              className="max-h-[240px] sm:max-h-[320px] max-w-full object-contain rounded-xl shadow-2xl shadow-black transition-transform duration-300 group-hover:scale-[1.01]"
            />
          ) : (
            renderFileIcon()
          )}
        </div>

        {/* Floating Bottom-Right Action Pill (Reference Design) */}
        <a
          href={ultraShortUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 z-10 flex items-center gap-1.5 rounded-lg border border-zinc-800/80 bg-zinc-900/90 hover:bg-zinc-800 hover:border-zinc-700 backdrop-blur-md px-2.5 py-1 text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-zinc-400 hover:text-white transition select-none"
        >
          {isImage ? (
            <>
              <span>EXPAND</span>
              <Maximize2 className="h-3 w-3" />
            </>
          ) : (
            <>
              <span>DOWNLOAD</span>
              <Download className="h-3 w-3" />
            </>
          )}
        </a>
      </div>

      {/* Title & Description Section (Matching reference typography) */}
      <div className="mt-6 sm:mt-7 px-1">
        <h2 className="text-xl sm:text-3xl font-bold tracking-tight text-white font-display truncate">
          {data.name || 'File Uploaded'}
        </h2>
        <p className="mt-2 text-xs sm:text-base text-zinc-400 leading-relaxed font-sans max-w-xl">
          {isImage
            ? 'Your image is permanently hosted with an instant ultra-short CDN link and cached globally.'
            : 'Your file is permanently hosted with an instant ultra-short download link and high-speed delivery.'}
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
            aria-label="Short CDN link"
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
              aria-label="Open in new tab"
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
          <span>Upload Another File</span>
        </button>
      </div>
    </div>
  );
}
