'use client';

import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { UnifiedUploader } from '@/components/UnifiedUploader';
import { UploadResultCard } from '@/components/UploadResultCard';
import { PasswordModal } from '@/components/PasswordModal';
import { Footer } from '@/components/Footer';
import { SystemStatusResponse, UploadResultData } from '@/lib/types';

export default function HomePage() {
  const [status, setStatus] = useState<SystemStatusResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [currentUpload, setCurrentUpload] = useState<UploadResultData | null>(null);

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
  };

  const handleLock = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mojahidx_auth_token');
    }
    setAuthToken('');
    setIsAuthenticated(false);
    try {
      await fetch('/api/auth', { method: 'DELETE' });
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-black text-zinc-100 font-sans selection:bg-white selection:text-black">
      {/* Password Vault Modal */}
      <PasswordModal
        isOpen={!isAuthenticated}
        onSuccess={handleUnlock}
      />

      <Navbar
        status={status}
        loadingStatus={loadingStatus}
        isAuthenticated={isAuthenticated}
        onLock={handleLock}
      />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-16">
        <div className={`w-full ${currentUpload ? 'max-w-2xl' : 'max-w-xl'} mx-auto transition-all duration-300`}>
          {/* Headline (Only shown during upload state) */}
          {!currentUpload && (
            <div className="text-center mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-display">
                Instant Host &amp; Cloud Storage
              </h1>
              <p className="mt-1.5 text-xs sm:text-sm text-zinc-400">
                Upload images or files up to 100MB to get an ultra-short CDN link.
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
                authToken={authToken}
                onUploadSuccess={(data) => setCurrentUpload(data)}
              />
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
