'use client';

import React, { useState } from 'react';
import {
  Clock,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  Search,
  Monitor,
  Smartphone,
  FileText,
  Palette,
  FileArchive,
  File,
  Image as ImageIcon,
  AlertTriangle,
} from 'lucide-react';
import { UploadHistoryItem } from '@/lib/history';
import { UploadCategory } from '@/lib/types';

interface UploadHistoryProps {
  items: UploadHistoryItem[];
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
  compact?: boolean;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatTimeAgo(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Recently';
  }
}

export function UploadHistory({
  items,
  onRemoveItem,
  onClearAll,
  compact = false,
}: UploadHistoryProps) {
  const [filter, setFilter] = useState<'all' | UploadCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const handleCopy = async (id: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => {
        setCopiedId((prev) => (prev === id ? null : prev));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  const filteredItems = items.filter((item) => {
    if (filter !== 'all' && item.category !== filter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.storedName.toLowerCase().includes(q) ||
        item.url.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getItemIcon = (item: UploadHistoryItem) => {
    const ext = (item.name.split('.').pop() || item.storedName.split('.').pop() || '').toLowerCase();

    if (item.category === 'image' || item.mimeType.startsWith('image/')) {
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-800 bg-black/80">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.url}
            alt={item.name}
            className="h-full w-full object-cover"
            onError={(e) => {
              // Fallback if image fails to load
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      );
    }

    if (ext === 'exe' || ext === 'msi') {
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10">
          <Monitor className="h-5 w-5 text-blue-400" />
        </div>
      );
    }

    if (ext === 'apk' || ext === 'aab') {
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10">
          <Smartphone className="h-5 w-5 text-emerald-400" />
        </div>
      );
    }

    if (ext === 'pdf') {
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10">
          <FileText className="h-5 w-5 text-rose-400" />
        </div>
      );
    }

    if (ext === 'plp') {
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-500/20 bg-sky-500/10">
          <Palette className="h-5 w-5 text-sky-400" />
        </div>
      );
    }

    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10">
          <FileArchive className="h-5 w-5 text-amber-400" />
        </div>
      );
    }

    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900">
        <File className="h-5 w-5 text-zinc-300" />
      </div>
    );
  };

  if (items.length === 0) {
    return (
      <div className="w-full rounded-[28px] border border-zinc-800/80 bg-[#08080a] p-8 text-center shadow-xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/60 text-zinc-400">
          <Clock className="h-6 w-6" />
        </div>
        <h4 className="mt-4 text-base font-semibold text-white">No upload history yet</h4>
        <p className="mt-1 text-xs sm:text-sm text-zinc-400">
          Uploaded images and files with their ultra-short links will appear here automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full rounded-[28px] sm:rounded-[32px] border border-zinc-800/80 bg-[#08080a] p-5 sm:p-7 shadow-2xl transition-all">
      {/* Header with Title and Clear Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-zinc-800/60">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/80 text-zinc-300 shadow-inner">
            <Clock className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Upload History
            </h3>
            <span className="rounded-full bg-zinc-900 px-2.5 py-0.5 text-[11px] font-mono font-medium text-zinc-400 border border-zinc-800">
              {items.length} {items.length === 1 ? 'file' : 'files'}
            </span>
          </div>
        </div>

        {/* Clear All action */}
        <div className="flex items-center gap-2">
          {confirmClear ? (
            <div className="flex items-center gap-2 animate-in fade-in duration-150">
              <span className="text-xs text-rose-400 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                Clear all?
              </span>
              <button
                onClick={() => {
                  onClearAll();
                  setConfirmClear(false);
                }}
                className="rounded-lg bg-rose-500/20 border border-rose-500/40 px-2.5 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-500/30 transition"
              >
                Yes, clear
              </button>
              <button
                onClick={() => setConfirmClear(false)}
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-400 hover:text-white transition"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmClear(true)}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-rose-400 transition py-1 px-2 rounded-lg hover:bg-rose-500/10"
              title="Clear entire upload history"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Category Filter Tabs */}
        <div className="inline-flex rounded-xl bg-black/60 p-1 border border-zinc-800/80">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === 'all'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            All ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('image')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              filter === 'image'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ImageIcon className="h-3 w-3" />
            <span>Images ({items.filter((i) => i.category === 'image').length})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter('file')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              filter === 'file'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <FileArchive className="h-3 w-3" />
            <span>Files ({items.filter((i) => i.category === 'file').length})</span>
          </button>
        </div>

        {/* Search Input */}
        {items.length > 3 && (
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search filename or link..."
              className="w-full rounded-xl border border-zinc-800 bg-black/60 py-1.5 pl-8 pr-3 text-xs text-white placeholder-zinc-500 outline-none transition focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
            />
          </div>
        )}
      </div>

      {/* History Items List */}
      <div className={`mt-4 space-y-2.5 ${compact ? 'max-h-[380px]' : 'max-h-[500px]'} overflow-y-auto pr-1`}>
        {filteredItems.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-500">
            No matching uploads found for current filter.
          </div>
        ) : (
          filteredItems.map((item) => {
            const isCopied = copiedId === item.id;
            const ext = (item.name.split('.').pop() || item.storedName.split('.').pop() || 'FILE').toUpperCase();

            return (
              <div
                key={item.id}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-zinc-800/80 bg-[#0b0b0e] p-3.5 sm:p-4 hover:border-zinc-700/80 hover:bg-[#0f0f13] transition-all"
              >
                {/* File info */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  {getItemIcon(item)}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4
                        className="truncate text-sm font-semibold text-white group-hover:text-zinc-100 transition"
                        title={item.name}
                      >
                        {item.name}
                      </h4>
                      <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-zinc-900 border border-zinc-800 text-zinc-400">
                        {ext}
                      </span>
                      {item.provider === 'r2' && (
                        <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-mono font-semibold bg-orange-500/10 border border-orange-500/20 text-orange-400">
                          R2
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-zinc-400 font-mono">
                      <span>{formatBytes(item.size)}</span>
                      <span>&bull;</span>
                      <span>{formatTimeAgo(item.uploadedAt)}</span>
                    </div>

                    {/* Short Link Display */}
                    <div className="mt-1.5">
                      <span className="inline-block truncate max-w-full text-xs font-mono text-zinc-400 group-hover:text-zinc-300">
                        {item.url}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center pt-2 sm:pt-0 border-t border-zinc-800/50 sm:border-0 w-full sm:w-auto justify-end">
                  {/* Copy Link Button */}
                  <button
                    onClick={() => handleCopy(item.id, item.url)}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition active:scale-95 ${
                      isCopied
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-white text-black hover:bg-zinc-200'
                    }`}
                    title="Copy short link to clipboard"
                  >
                    {isCopied ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>

                  {/* Open Link */}
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-2 text-zinc-400 hover:text-white hover:border-zinc-700 transition"
                    title="Open link in new tab"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>

                  {/* Remove Item */}
                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-2 text-zinc-500 hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/10 transition"
                    title="Remove from history"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
