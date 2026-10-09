'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  UploadCloud,
  AlertCircle,
  X,
  Loader2,
  Sparkles,
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
  const [uploadStep, setUploadStep] = useState<string>('');
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
    setUploadStep('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [previewUrl]);

  const handleFile = (file: File) => {
    setErrorMessage(null);

    // 1. Check for SVG
    if (file.type.includes('svg') || file.name.toLowerCase().endsWith('.svg')) {
      setErrorMessage(
        'SVG files are not permitted for security reasons. Please upload PNG, JPEG, WebP, or GIF.'
      );
      return;
    }

    // 2. Check for allowed MIME type
    if (!ALLOWED_MIME_LIST.includes(file.type.toLowerCase())) {
      setErrorMessage(
        `File format "${file.type || 'unknown'}" is not supported. Please choose a PNG, JPEG, WebP, or GIF image.`
      );
      return;
    }

    // 3. Check file size
    const maxSizeBytes = maxFileSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setErrorMessage(
        `File size (${sizeMB} MB) exceeds the limit of ${maxFileSizeMB} MB. Please select a smaller file.`
      );
      return;
    }

    setSelectedFile(file);

    // Create object URL for instant preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Calculate dimensions
    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = url;
  };

  // Drag listeners
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

  // Execute upload
  const handleUpload = async () => {
    if (!selectedFile || uploading) return;

    setUploading(true);
    setErrorMessage(null);
    setUploadProgress(15);
    setUploadStep('Validating binary signature & metadata...');

    const formData = new FormData();
    formData.append('file', selectedFile);

    // Simulate progress updates for responsive feel
    const progressTimer = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev < 40) {
          setUploadStep('Encoding base64 buffer for GitHub REST API...');
          return prev + 15;
        }
        if (prev < 80) {
          setUploadStep('Committing image to GitHub repository...');
          return prev + 10;
        }
        return prev;
      });
    }, 300);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressTimer);

      const result: UploadApiResponse = await response.json();

      if (!response.ok || !result.success) {
        const errorText = !result.success ? result.error : 'Failed to complete upload.';
        setErrorMessage(errorText);
        setUploading(false);
        setUploadProgress(0);
        return;
      }

      setUploadProgress(100);
      setUploadStep('Upload confirmed by GitHub!');

      setTimeout(() => {
        setUploading(false);
        onUploadSuccess(result.file);
        resetSelection();
      }, 400);
    } catch (err) {
      clearInterval(progressTimer);
      const msg = err instanceof Error ? err.message : 'Network error during upload.';
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
      {/* Hidden native input */}
      <input
        ref={fileInputRef}
        type="file"
        id="image-file-input"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={handleInputChange}
        className="hidden"
        disabled={uploading}
      />

      {/* Error Banner */}
      {errorMessage && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-950/40 p-4 text-xs text-rose-200 backdrop-blur-md animate-in fade-in">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
          <div className="flex-1">
            <p className="font-semibold text-rose-300">Upload Rejected</p>
            <p className="mt-0.5 text-rose-200/90 leading-relaxed">{errorMessage}</p>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Dropzone View (when no file selected) */}
      {!selectedFile ? (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-300 ${
            dragActive
              ? 'border-purple-400 bg-purple-950/40 shadow-2xl shadow-purple-600/30 scale-[1.01]'
              : 'border-purple-800/40 bg-[#100d20]/70 hover:border-purple-500 hover:bg-[#15102a]/80'
          }`}
        >
          {/* Subtle background glow */}
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-purple-600/5 to-transparent" />

          {/* Icon */}
          <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-700/40 to-indigo-600/30 text-purple-300 ring-1 ring-purple-500/30 transition-transform duration-300 group-hover:scale-110 group-hover:text-white">
            <UploadCloud className="h-8 w-8" />
            <div className="absolute -inset-1 rounded-2xl bg-purple-500/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          <h3 className="text-base font-bold text-white sm:text-lg">
            Drag & drop your image here, or{' '}
            <span className="text-purple-400 underline decoration-purple-500/60 underline-offset-4 group-hover:text-purple-300">
              browse files
            </span>
          </h3>

          <p className="mt-2 text-xs text-zinc-400">
            Supports <strong className="text-zinc-200">PNG, JPEG, WebP, GIF</strong> up to{' '}
            <strong className="text-purple-300">{maxFileSizeMB} MB</strong>
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {['PNG', 'JPEG', 'WEBP', 'GIF'].map((fmt) => (
              <span
                key={fmt}
                className="rounded-md bg-purple-950/60 px-2.5 py-1 text-[11px] font-mono font-medium text-purple-300 ring-1 ring-purple-800/50"
              >
                .{fmt.toLowerCase()}
              </span>
            ))}
            <span className="rounded-md bg-zinc-900/80 px-2.5 py-1 text-[11px] font-medium text-zinc-400 ring-1 ring-zinc-800">
              SVG Prohibited
            </span>
          </div>
        </div>
      ) : (
        /* File Staging & Preview View */
        <div className="rounded-2xl border border-purple-800/40 bg-[#120e24]/90 p-6 shadow-xl backdrop-blur-xl">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            {/* Preview Thumbnail */}
            <div className="relative flex h-36 w-36 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-purple-900/60 bg-[#090713]">
              {previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-h-full max-w-full object-contain p-1"
                />
              )}
            </div>

            {/* File Details */}
            <div className="flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="max-w-md truncate text-base font-bold text-white" title={selectedFile.name}>
                    {selectedFile.name}
                  </h4>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                    <span className="font-mono text-purple-300">
                      {formatFileSize(selectedFile.size)}
                    </span>
                    <span>&bull;</span>
                    <span className="uppercase font-mono text-purple-400">
                      {selectedFile.type.replace('image/', '')}
                    </span>
                    {imageDimensions && (
                      <>
                        <span>&bull;</span>
                        <span className="font-mono text-zinc-300">
                          {imageDimensions.width} &times; {imageDimensions.height} px
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {!uploading && (
                  <button
                    onClick={resetSelection}
                    className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
                    title="Remove selected file"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>

              {/* Progress Bar during upload */}
              {uploading && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 font-medium text-purple-300">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {uploadStep}
                    </span>
                    <span className="font-mono font-bold text-purple-400">
                      {uploadProgress}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-900">
                    <div
                      className="h-full bg-gradient-to-r from-purple-600 via-indigo-500 to-purple-400 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-5 flex items-center gap-3">
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-sm font-bold text-white shadow-lg transition-all ${
                    uploading
                      ? 'cursor-not-allowed bg-purple-900/60 text-purple-300 opacity-70'
                      : 'bg-gradient-to-r from-purple-600 to-indigo-600 shadow-purple-600/30 hover:from-purple-500 hover:to-indigo-500 hover:shadow-purple-500/40 active:scale-[0.98]'
                  }`}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Committing to GitHub...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 text-purple-200" />
                      <span>Upload to MojahidX</span>
                    </>
                  )}
                </button>

                {!uploading && (
                  <button
                    onClick={resetSelection}
                    className="rounded-xl border border-purple-900/50 bg-[#0d0b1a] px-4 py-2.5 text-sm font-semibold text-zinc-300 transition hover:border-purple-700 hover:text-white"
                  >
                    Change File
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
