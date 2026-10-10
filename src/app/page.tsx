'use client';

import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { UnifiedUploader } from '@/components/UnifiedUploader';
import { UploadResultCard } from '@/components/UploadResultCard';
import { PasswordModal } from '@/components/PasswordModal';
import { UploadHistory } from '@/components/UploadHistory';
import { UploadHistoryModal } from '@/components/UploadHistoryModal';
import { Footer } from '@/components/Footer';
import { SystemStatusResponse, UploadResultData } from '@/lib/types';
import {
  UploadHistoryItem,
  getUploadHistory,
  addUploadToHistory,
  removeUploadFromHistory,
  clearUploadHistory,
} from '@/lib/history';

export default function HomePage() {
  const [status, setStatus] = useState<SystemStatusResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [currentUpload, setCurrentUpload] = useState<UploadResultData | null>(null);

  // Upload History State (persisted in localStorage)
  const [history, setHistory] = useState<UploadHistoryItem[]>(() => {
    if (typeof window !== 'undefined') {
      return getUploadHistory();
    }
    return [];
  });
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);

  // Authentication State (Password protection: Mojahid@1234)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return Boolean(localStorage.getItem('mojahidx_auth_token'));
    }
    return false;
  });

  const [authToken, setAuthToken] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('mojahidx_auth_token') || '';
    }
    return '';
  });

  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [pendingUploadCallback, setPendingUploadCallback] = useState<((pwd: string) => void) | null>(null);

  useEffect(() => {

    // If not authenticated via local token, check server cookie session asynchronously
    if (!isAuthenticated) {
      fetch('/api/auth')
        .then((r) => r.json())
        .then((data) => {
          if (data.authenticated) {
            setIsAuthenticated(true);
          }
        })
        .catch(() => {});
    }

    // Check system status
    async function checkStatus() {
      try {
        const res = await fetch('/api/status');
        if (res.ok) {
          const data: SystemStatusResponse = await res.json();
          setStatus(data);
        }
      } catch (err) {
        console.error('Failed to query status:', err);
      } finally {
        setLoadingStatus(false);
      }
    }

    checkStatus();
  }, [isAuthenticated]);

  const handleUnlock = (password: string) => {
    setAuthToken(password);
    setIsAuthenticated(true);
    setShowPasswordModal(false);
    if (pendingUploadCallback) {
      pendingUploadCallback(password);
      setPendingUploadCallback(null);
    }
  };

  const handleRequestAuth = (callback: (pwd: string) => void) => {
    setPendingUploadCallback(() => callback);
    setShowPasswordModal(true);
  };

  const handleCloseModal = () => {
    setShowPasswordModal(false);
    setPendingUploadCallback(null);
  };

  const handleLock = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mojahidx_auth_token');
    }
    setAuthToken('');
    setIsAuthenticated(false);
    setShowPasswordModal(false);
    setPendingUploadCallback(null);
    try {
      await fetch('/api/auth', { method: 'DELETE' });
    } catch {
      // ignore
    }
  };

  const handleUploadSuccess = (data: UploadResultData) => {
    setCurrentUpload(data);
    const updated = addUploadToHistory(data);
    setHistory(updated);
  };

  const handleRemoveHistoryItem = (id: string) => {
    const updated = removeUploadFromHistory(id);
    setHistory(updated);
  };

  const handleClearHistory = () => {
    clearUploadHistory();
    setHistory([]);
  };

  return (
    <div className="flex min-h-screen flex-col bg-black text-zinc-100 font-sans selection:bg-white selection:text-black">
      {/* Password Vault Modal (only shown when an upload is requested without active auth) */}
      <PasswordModal
        isOpen={showPasswordModal}
        onSuccess={handleUnlock}
        onClose={handleCloseModal}
      />

      {/* Upload History Overlay Modal */}
      <UploadHistoryModal
        isOpen={showHistoryModal}
        items={history}
        onClose={() => setShowHistoryModal(false)}
        onRemoveItem={handleRemoveHistoryItem}
        onClearAll={handleClearHistory}
      />

      <Navbar
        status={status}
        loadingStatus={loadingStatus}
        isAuthenticated={isAuthenticated}
        onLock={handleLock}
        historyCount={history.length}
        onOpenHistory={() => setShowHistoryModal(true)}
      />

      <main className="flex-1 flex flex-col items-center justify-start px-4 py-8 sm:py-14">
        <div className={`w-full ${currentUpload ? 'max-w-2xl' : 'max-w-xl'} mx-auto transition-all duration-300`}>
          {/* Headline (Only shown during upload state) */}
          {!currentUpload && (
            <div className="text-center mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
                Instant Host &amp; Cloud Storage
              </h1>
              <p className="mt-1.5 text-xs sm:text-sm text-zinc-400">
                Upload images or files up to {status?.r2Configured ? `${status.r2MaxFileSizeMB || 500}MB` : `${status?.maxFileSizeMB || 100}MB`} to get an ultra-short CDN link.
              </p>
            </div>
          )}

          {/* Upload or Reference-styled Result Card */}
          <div className="w-full">
            {currentUpload ? (
              <UploadResultCard
                data={currentUpload}
                onReset={() => setCurrentUpload(null)}
              />
            ) : (
              <UnifiedUploader
                maxFileSizeMB={status?.maxFileSizeMB || 100}
                r2MaxFileSizeMB={status?.r2MaxFileSizeMB || 500}
                r2Configured={status?.r2Configured || false}
                authToken={authToken}
                isAuthenticated={isAuthenticated}
                onRequestAuth={handleRequestAuth}
                onUploadSuccess={handleUploadSuccess}
              />
            )}
          </div>

          {/* Persistent Upload History Section */}
          {history.length > 0 && (
            <div className="mt-10 sm:mt-12 w-full animate-in fade-in slide-in-from-bottom-3 duration-300">
              <UploadHistory
                items={history}
                onRemoveItem={handleRemoveHistoryItem}
                onClearAll={handleClearHistory}
              />
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
