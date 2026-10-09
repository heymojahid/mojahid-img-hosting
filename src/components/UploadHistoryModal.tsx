'use client';

import React from 'react';
import { X } from 'lucide-react';
import { UploadHistory } from './UploadHistory';
import { UploadHistoryItem } from '@/lib/history';

interface UploadHistoryModalProps {
  isOpen: boolean;
  items: UploadHistoryItem[];
  onClose: () => void;
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
}

export function UploadHistoryModal({
  isOpen,
  items,
  onClose,
  onRemoveItem,
  onClearAll,
}: UploadHistoryModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-[32px] border border-zinc-800 bg-[#08080a] p-4 sm:p-6 shadow-2xl shadow-black/90 text-zinc-100 animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 z-20 rounded-xl p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <UploadHistory
          items={items}
          onRemoveItem={onRemoveItem}
          onClearAll={onClearAll}
          compact={false}
        />
      </div>
    </div>
  );
}
