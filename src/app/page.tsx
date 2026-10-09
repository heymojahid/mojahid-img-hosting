'use client';

import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { ImageUploader } from '@/components/ImageUploader';
import { UploadResultCard } from '@/components/UploadResultCard';
import { Footer } from '@/components/Footer';
import { SystemStatusResponse, UploadResultData } from '@/lib/types';

export default function HomePage() {
  const [status, setStatus] = useState<SystemStatusResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [currentUpload, setCurrentUpload] = useState<UploadResultData | null>(null);

  useEffect(() => {
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
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-black text-zinc-100 font-sans">
      <Navbar status={status} loadingStatus={loadingStatus} />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10 sm:py-16">
        <div className="w-full max-w-xl mx-auto">
          {/* Minimal Headline */}
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Instant Image Host
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-zinc-400">
              Upload an image to get an ultra-short CDN link.
            </p>
          </div>

          {/* Upload or Single Short-URL Result */}
          <div className="w-full">
            {currentUpload ? (
              <UploadResultCard
                data={currentUpload}
                onReset={() => setCurrentUpload(null)}
              />
            ) : (
              <ImageUploader
                maxFileSizeMB={status?.maxFileSizeMB || 5}
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
