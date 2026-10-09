'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  UploadCloud,
  AlertCircle,
  X,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';
import { UploadApiResponse, UploadResultData } from '@/lib/types';

interface ImageUploaderProps {
  maxFileSizeMB: number;
  onUploadSuccess: (data: UploadResultData) => void;
}

const ALLOWED_MIME_LIST = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

export function ImageUploader({ maxFileSizeMB, onUploadSuccess }: ImageUploaderProps) {
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

  const handleFile = (file: File) => {
    setErrorMessage(null);

    // 1. Check for SVG
    if (file.type.includes('svg') || file.name.toLowerCase().endsWith('.svg')) {
      setErrorMessage('SVG files are not allowed. Please choose PNG, JPEG, WebP, or GIF.');
      return;
    }

    // 2. Check for allowed MIME type
    if (!ALLOWED_MIME_LIST.includes(file.type.toLowerCase())) {
      setErrorMessage(`Unsupported format. Please choose PNG, JPEG, WebP, or GIF.`);
      return;
    }

    // 3. Check file size
    const maxSizeBytes = maxFileSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setErrorMessage(`File size (${sizeMB} MB) exceeds ${maxFileSizeMB} MB limit.`);
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

  const handleUpload = async () => {
    if (!selectedFile || uploading) return;

    setUploading(true);
    setErrorMessage(null);
    setUploadProgress(20);

    const formData = new FormData();
    formData.append('file', selectedFile);

    const progressTimer = setInterval(() => {
      setUploadProgress((prev) => (prev < 80 ? prev + 15 : prev));
    }, 250);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressTimer);

      const result: UploadApiResponse = await response.json();

      if (!response.ok || !result.success) {
        const errorText = !result.success ? result.error : 'Upload failed.';
        setErrorMessage(errorText);
        setUploading(false);
        setUploadProgress(0);
        return;
      }

      setUploadProgress(100);

      setTimeout(() => {
        setUploading(false);
        onUploadSuccess(result.file);
        resetSelection();
      }, 250);
    } catch (err) {
      clearInterval(progressTimer);
      const msg = err instanceof Error ? err.message : 'Network error.';
      setErrorMessage(msg);
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        id="image-file-input"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={handleInputChange}
        className="hidden"
        disabled={uploading}
      />

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-900/50 bg-red-950/20 px-4 py-3 text-xs text-red-300">
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
          className={`group flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed p-8 sm:p-12 text-center transition-all ${
            dragActive
              ? 'border-white bg-zinc-900/40'
              : 'border-zinc-800 bg-[#09090b] hover:border-zinc-600 hover:bg-[#0c0c0e]'
          }`}
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 transition-transform group-hover:scale-105 group-hover:text-white">
            <UploadCloud className="h-6 w-6" />
          </div>

          <h3 className="text-sm sm:text-base font-semibold text-white">
            <span>Drop image here or </span>
            <span className="text-zinc-400 underline underline-offset-4 group-hover:text-white">
              browse file
            </span>
          </h3>

          <p className="mt-1.5 text-xs text-zinc-500">
            PNG, JPEG, WebP, GIF &bull; Max {maxFileSizeMB} MB
          </p>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="mt-4 flex sm:hidden items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300"
          >
            <ImageIcon className="h-3.5 w-3.5" />
            <span>Select File</span>
          </button>
        </div>
      ) : (
        /* Preview / Confirm */
        <div className="rounded-2xl border border-zinc-800 bg-[#09090b] p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <div className="relative flex h-48 w-full sm:h-32 sm:w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-800 bg-black">
              {previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-h-full max-w-full object-contain p-2"
                />
              )}
            </div>

            <div className="flex-1 min-w-0 w-full">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="truncate text-sm sm:text-base font-semibold text-white">
                    {selectedFile.name}
                  </h4>
                  <p className="mt-0.5 text-xs text-zinc-400 font-mono">
                    {formatFileSize(selectedFile.size)}
                    {imageDimensions && ` • ${imageDimensions.width}×${imageDimensions.height}px`}
                  </p>
                </div>

                {!uploading && (
                  <button
                    onClick={resetSelection}
                    className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {uploading && (
                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-xs font-mono text-zinc-400">
                    <span>Uploading...</span>
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

              <div className="mt-4 flex gap-2.5">
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-xs sm:text-sm font-semibold transition-all ${
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
                    className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs sm:text-sm font-medium text-zinc-400 hover:text-white"
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
