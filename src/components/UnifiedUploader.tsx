'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  UploadCloud,
  AlertCircle,
  X,
  Loader2,
  Image as ImageIcon,
  FileArchive,
  FileText,
  Smartphone,
  Palette,
  Monitor,
  File,
} from 'lucide-react';
import { UploadResultData, UploadCategory } from '@/lib/types';

interface UnifiedUploaderProps {
  maxFileSizeMB?: number;
  r2MaxFileSizeMB?: number;
  r2Configured?: boolean;
  authToken?: string;
  isAuthenticated?: boolean;
  onRequestAuth?: (onSuccess: (password: string) => void) => void;
  onUploadSuccess: (data: UploadResultData) => void;
}

const ALLOWED_IMAGE_MIMES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const FORBIDDEN_EXTENSIONS = ['bat', 'cmd', 'sh', 'php', 'phtml', 'cgi', 'pl', 'vbs', 'com', 'scr'];

async function uploadFileViaPresignedR2(
  file: File,
  category: 'image' | 'file',
  passwordToken: string,
  onProgress: (percent: number) => void
): Promise<UploadResultData> {
  const presignRes = await fetch('/api/upload/presign', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-app-password': passwordToken,
    },
    body: JSON.stringify({
      filename: file.name,
      size: file.size,
      type: file.type,
      category,
      password: passwordToken,
    }),
  });

  let presignData: {
    success: boolean;
    uploadUrl?: string;
    file?: UploadResultData;
    error?: string;
  };

  try {
    const text = await presignRes.text();
    presignData = JSON.parse(text);
  } catch {
    throw new Error(`Server returned HTTP ${presignRes.status}: ${presignRes.statusText}`);
  }

  if (!presignRes.ok || !presignData.success || !presignData.uploadUrl || !presignData.file) {
    if (presignRes.status === 401) {
      throw new Error('UNAUTHORIZED_PASSWORD');
    }
    throw new Error(presignData.error || 'Failed to initialize Cloudflare R2 upload.');
  }

  const { uploadUrl, file: fileResult } = presignData;

  onProgress(10);

  // Direct PUT to Cloudflare R2 via XMLHttpRequest with exact upload progress
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader(
      'Content-Type',
      fileResult.mimeType || file.type || 'application/octet-stream'
    );

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable && evt.total > 0) {
        const percent = Math.min(98, 10 + Math.round((evt.loaded / evt.total) * 88));
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
      } else {
        reject(new Error(`Cloudflare R2 returned HTTP ${xhr.status}: ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Direct upload to Cloudflare R2 failed due to network or CORS.'));
    };

    xhr.send(file);
  });

  return fileResult;
}

async function uploadFileInChunks(
  file: File,
  category: 'image' | 'file',
  passwordToken: string,
  onProgress: (percent: number) => void
): Promise<UploadResultData> {
  const CHUNK_SIZE = 3 * 1024 * 1024; // 3.0 MB chunk size (strictly below Vercel 4.5MB limit)
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const uploadId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `upload_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  onProgress(5);

  let finalResult: UploadResultData | null = null;

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(file.size, start + CHUNK_SIZE);
    const chunkBlob = file.slice(start, end);

    const formData = new FormData();
    formData.append('uploadId', uploadId);
    formData.append('chunkIndex', String(i));
    formData.append('totalChunks', String(totalChunks));
    formData.append('filename', file.name);
    formData.append('category', category);
    formData.append('password', passwordToken);
    formData.append('chunk', chunkBlob, `chunk_${i}.bin`);

    const response = await fetch('/api/upload/chunk', {
      method: 'POST',
      headers: {
        'x-app-password': passwordToken,
      },
      body: formData,
    });

    let data: {
      success: boolean;
      completed?: boolean;
      file?: UploadResultData;
      error?: string;
    };

    try {
      const text = await response.text();
      data = JSON.parse(text);
    } catch {
      if (response.status === 413) {
        throw new Error('Chunk payload exceeds server limit.');
      }
      throw new Error(`Server returned HTTP ${response.status}: ${response.statusText}`);
    }

    if (!response.ok || !data.success) {
      if (response.status === 401) {
        throw new Error('UNAUTHORIZED_PASSWORD');
      }
      throw new Error(data.error || `Upload failed at chunk ${i + 1}/${totalChunks}.`);
    }

    // Scale progress smoothly up to 98% during chunks, 100% on completion
    const chunkProgress = Math.min(98, Math.round(((i + 1) / totalChunks) * 98));
    onProgress(chunkProgress);

    if (data.completed && data.file) {
      finalResult = data.file;
    }
  }

  if (!finalResult) {
    throw new Error('Upload completed without receiving file details.');
  }

  onProgress(100);
  return finalResult;
}

export function UnifiedUploader({
  maxFileSizeMB = 100,
  r2MaxFileSizeMB = 500,
  r2Configured = false,
  authToken = '',
  isAuthenticated = false,
  onRequestAuth,
  onUploadSuccess,
}: UnifiedUploaderProps) {
  const [activeTab, setActiveTab] = useState<UploadCategory>('image');
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetSelection = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setImageDimensions(null);
    setErrorMessage(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [previewUrl]);

  const switchTab = (tab: UploadCategory) => {
    if (tab === activeTab) return;
    resetSelection();
    setActiveTab(tab);
  };

  const handleFile = (file: File) => {
    setErrorMessage(null);

    const effectiveLimitMB = activeTab === 'file' && r2Configured ? r2MaxFileSizeMB : maxFileSizeMB;
    const maxSizeBytes = effectiveLimitMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setErrorMessage(`File size (${sizeMB} MB) exceeds ${effectiveLimitMB} MB limit.`);
      return;
    }

    const extMatch = file.name.toLowerCase().match(/\.([a-z0-9]+)$/);
    const ext = extMatch ? extMatch[1] : '';

    if (activeTab === 'image') {
      if (file.type.includes('svg') || ext === 'svg') {
        setErrorMessage('SVG files are not permitted for security reasons.');
        return;
      }

      if (!ALLOWED_IMAGE_MIMES.includes(file.type.toLowerCase()) && !['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
        setErrorMessage('Please select a valid image (PNG, JPEG, WebP, GIF).');
        return;
      }

      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);

      const img = new Image();
      img.onload = () => {
        setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = url;
    } else {
      // General file upload
      if (FORBIDDEN_EXTENSIONS.includes(ext)) {
        setErrorMessage(`Files with .${ext} extension are strictly prohibited.`);
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const executeUpload = async (token: string) => {
    if (!selectedFile) return;

    setUploading(true);
    setErrorMessage(null);
    setUploadProgress(5);

    try {
      let fileData: UploadResultData;
      const isBigOrFile = activeTab === 'file' || selectedFile.size > 25 * 1024 * 1024;

      if (r2Configured && isBigOrFile) {
        try {
          fileData = await uploadFileViaPresignedR2(
            selectedFile,
            activeTab,
            token,
            (progress) => setUploadProgress(progress)
          );
        } catch (r2Err) {
          if (r2Err instanceof Error && r2Err.message === 'UNAUTHORIZED_PASSWORD') {
            throw r2Err;
          }
          console.warn('Direct R2 upload failed, falling back to chunked upload:', r2Err);
          fileData = await uploadFileInChunks(
            selectedFile,
            activeTab,
            token,
            (progress) => setUploadProgress(progress)
          );
        }
      } else {
        fileData = await uploadFileInChunks(
          selectedFile,
          activeTab,
          token,
          (progress) => setUploadProgress(progress)
        );
      }

      setUploadProgress(100);

      setTimeout(() => {
        setUploading(false);
        onUploadSuccess(fileData);
        resetSelection();
      }, 250);
    } catch (err) {
      if (err instanceof Error && err.message === 'UNAUTHORIZED_PASSWORD') {
        localStorage.removeItem('mojahidx_auth_token');
        if (onRequestAuth) {
          onRequestAuth((newToken) => executeUpload(newToken));
          setUploading(false);
          setUploadProgress(0);
          return;
        }
      }
      const msg = err instanceof Error ? err.message : 'Network error during upload.';
      setErrorMessage(msg);
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleUpload = () => {
    if (!selectedFile || uploading) return;

    const savedToken =
      authToken ||
      (typeof window !== 'undefined' ? localStorage.getItem('mojahidx_auth_token') : null);

    // If not authenticated, prompt for password now!
    if (!isAuthenticated && !savedToken && onRequestAuth) {
      onRequestAuth((verifiedPassword) => {
        executeUpload(verifiedPassword);
      });
      return;
    }

    executeUpload(savedToken || authToken || '');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getFileBadgeIcon = (filename: string) => {
    const ext = (filename.split('.').pop() || '').toLowerCase();
    if (ext === 'exe' || ext === 'msi') return <Monitor className="h-6 w-6 text-blue-400" />;
    if (ext === 'apk' || ext === 'aab') return <Smartphone className="h-6 w-6 text-emerald-400" />;
    if (ext === 'pdf') return <FileText className="h-6 w-6 text-rose-400" />;
    if (ext === 'plp') return <Palette className="h-6 w-6 text-sky-400" />;
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return <FileArchive className="h-6 w-6 text-amber-400" />;
    return <File className="h-6 w-6 text-zinc-300" />;
  };

  return (
    <div className="w-full">
      {/* Tab Switcher: Tab 1 (Image Upload) vs Tab 2 (File Upload) */}
      <div className="flex items-center justify-center mb-6">
        <div className="inline-flex p-1.5 rounded-2xl bg-[#09090c] border border-zinc-800/90 shadow-xl">
          <button
            type="button"
            onClick={() => switchTab('image')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'image'
                ? 'bg-white text-black shadow-lg shadow-white/10'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Image Upload</span>
          </button>

          <button
            type="button"
            onClick={() => switchTab('file')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'file'
                ? 'bg-white text-black shadow-lg shadow-white/10'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/60'
            }`}
          >
            <FileArchive className="w-4 h-4" />
            <span>File Upload</span>
            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full border ${
              r2Configured
                ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}>
              {r2Configured ? `${r2MaxFileSizeMB}MB` : `${maxFileSizeMB}MB`}
            </span>
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        id="file-input-element"
        accept={activeTab === 'image' ? 'image/png,image/jpeg,image/webp,image/gif' : undefined}
        onChange={handleInputChange}
        className="hidden"
        disabled={uploading}
      />

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-xs text-red-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Dropzone */}
      {!selectedFile ? (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`group flex cursor-pointer flex-col items-center justify-center rounded-[28px] sm:rounded-[32px] border border-dashed p-8 sm:p-12 text-center transition-all ${
            dragActive
              ? 'border-white bg-zinc-900/50'
              : 'border-zinc-800 bg-[#08080a] hover:border-zinc-600 hover:bg-[#0c0c0f]'
          }`}
        >
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/90 text-zinc-300 transition-transform group-hover:scale-105 group-hover:text-white shadow-inner">
            {activeTab === 'image' ? <UploadCloud className="h-7 w-7" /> : <FileArchive className="h-7 w-7 text-emerald-400" />}
          </div>

          <h3 className="text-base sm:text-lg font-semibold text-white">
            <span>Drop {activeTab === 'image' ? 'image' : 'file'} here or </span>
            <span className="text-zinc-400 underline underline-offset-4 group-hover:text-white">
              browse file
            </span>
          </h3>

          {/* Formats Info */}
          {activeTab === 'image' ? (
            <p className="mt-2 text-xs sm:text-sm text-zinc-500">
              PNG, JPEG, WebP, GIF &bull; Max {maxFileSizeMB} MB
            </p>
          ) : (
            <div className="mt-2 flex flex-col items-center gap-2">
              <p className="text-xs sm:text-sm text-zinc-400">
                Supports APK, EXE, MSI, AAB, ZIP, RAR, ISO, PDF &bull; Max{' '}
                {r2Configured ? r2MaxFileSizeMB : maxFileSizeMB} MB
                {r2Configured && (
                  <span className="ml-1.5 text-orange-400 font-medium">
                    (Cloudflare R2)
                  </span>
                )}
              </p>
              {/* Pill tags */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                {['.APK', '.EXE', '.MSI', '.AAB', '.ZIP', '.RAR', '.ISO', '.PDF', '.PLP'].map((ext) => (
                  <span
                    key={ext}
                    className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-400"
                  >
                    {ext}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="mt-5 flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-800 hover:text-white"
          >
            {activeTab === 'image' ? <ImageIcon className="h-3.5 w-3.5" /> : <FileArchive className="h-3.5 w-3.5" />}
            <span>Choose {activeTab === 'image' ? 'Image' : 'File'}</span>
          </button>
        </div>
      ) : (
        /* Selected File Preview & Confirm */
        <div className="rounded-[28px] sm:rounded-[32px] border border-zinc-800 bg-[#08080a] p-5 sm:p-7 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-6">
            {/* Left box: preview image or file badge */}
            <div className="relative flex h-36 w-full sm:h-32 sm:w-32 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-zinc-800 bg-black/80">
              {previewUrl && activeTab === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-h-full max-w-full object-contain p-2"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-3">
                  {getFileBadgeIcon(selectedFile.name)}
                </div>
              )}
            </div>

            {/* Right box: file info & upload button */}
            <div className="flex-1 min-w-0 w-full">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="truncate text-base font-semibold text-white">
                    {selectedFile.name}
                  </h4>
                  <p className="mt-1 text-xs text-zinc-400 font-mono">
                    {formatFileSize(selectedFile.size)}
                    {imageDimensions && ` • ${imageDimensions.width}×${imageDimensions.height}px`}
                  </p>
                </div>

                {!uploading && (
                  <button
                    onClick={resetSelection}
                    className="rounded-xl p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-white transition"
                    title="Remove file"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Progress bar */}
              {uploading && (
                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-xs font-mono text-zinc-400">
                    <span>Uploading to storage...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-900">
                    <div
                      className="h-full bg-white transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="mt-5 flex gap-2.5">
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 px-5 text-xs sm:text-sm font-semibold transition-all ${
                    uploading
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      : 'bg-white text-black hover:bg-zinc-200 active:scale-[0.98]'
                  }`}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <span>Get Instant Link</span>
                  )}
                </button>

                {!uploading && (
                  <button
                    onClick={resetSelection}
                    className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-xs sm:text-sm font-medium text-zinc-400 hover:text-white transition"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
