'use client';

import React, { useState } from 'react';
import { Copy, Check, Trash2, History, Clock } from 'lucide-react';
import { UploadResultData } from '@/lib/types';

interface UploadHistoryProps {
  history: UploadResultData[];
  onClearHistory: () => void;
  onSelectImage: (item: UploadResultData) => void;
}

export function UploadHistory({ history, onClearHistory, onSelectImage }: UploadHistoryProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (history.length === 0) {
    return null;
  }

  const copyUrl = async (url: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="mt-8 sm:mt-12 w-full rounded-2xl border border-purple-900/30 bg-[#100d22]/80 p-4 sm:p-6 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-purple-900/30 pb-3.5 sm:pb-4">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" />
          <h3 className="text-sm sm:text-base font-bold text-white">Recent Uploads</h3>
          <span className="rounded-full bg-purple-900/40 px-2 py-0.5 text-xs font-mono text-purple-300">
            {history.length}
          </span>
        </div>

        <button
          onClick={onClearHistory}
          className="flex items-center gap-1.5 rounded-lg border border-purple-950 px-2.5 py-1 text-[11px] sm:text-xs font-medium text-zinc-400 transition hover:border-rose-900/50 hover:bg-rose-950/30 hover:text-rose-300 active:scale-95"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Clear</span>
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {history.map((item) => {
          const urlToCopy = item.customDomainUrl || item.directUrl;
          const isCopied = copiedId === item.storedName;

          return (
            <div
              key={item.storedName}
              onClick={() => onSelectImage(item)}
              className="group flex cursor-pointer items-center gap-3 rounded-xl border border-purple-900/30 bg-[#090715] p-3 transition-all hover:border-purple-600/50 hover:bg-[#0e0a1f]"
            >
              {/* Thumbnail */}
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-purple-950 bg-[#05040a]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.directUrl}
                  alt={item.name}
                  className="max-h-full max-w-full object-contain"
                  loading="lazy"
                />
              </div>

              {/* Text info */}
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-semibold text-white group-hover:text-purple-300" title={item.name}>
                  {item.name}
                </p>
                <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-zinc-400">
                  <span>{formatFileSize(item.size)}</span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    {formatTime(item.uploadedAt)}
                  </span>
                </div>
              </div>

              {/* Copy Direct URL Button */}
              <button
                onClick={(e) => copyUrl(urlToCopy, item.storedName, e)}
                className={`shrink-0 rounded-lg p-2 text-xs transition-all ${
                  isCopied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-purple-950/60 text-purple-300 hover:bg-purple-800 hover:text-white'
                }`}
                title="Copy Direct URL"
              >
                {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
