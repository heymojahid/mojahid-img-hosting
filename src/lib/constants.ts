import { AllowedMimeType } from './types';

export const DEFAULT_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const ALLOWED_MIME_TYPES: readonly AllowedMimeType[] = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
] as const;

export const MIME_TO_EXTENSION: Record<AllowedMimeType, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

export const EXTENSION_TO_MIME: Record<string, AllowedMimeType> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

// Known signatures (magic numbers) for validation
export const MAGIC_NUMBERS = {
  PNG: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  JPEG: [0xff, 0xd8, 0xff],
  GIF87A: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
  GIF89A: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
  WEBP_RIFF: [0x52, 0x49, 0x46, 0x46], // RIFF
  WEBP_TAG: [0x57, 0x45, 0x42, 0x50], // WEBP at offset 8
} as const;

// Executable / malicious signatures to strictly reject
export const PROHIBITED_SIGNATURES = {
  DOS_MZ: [0x4d, 0x5a], // Windows EXE / DLL
  ELF: [0x7f, 0x45, 0x4c, 0x46], // Linux Executable
  JAVA_CLASS: [0xca, 0xfe, 0xba, 0xbe], // Java bytecode
  SHEBANG: [0x23, 0x21], // #! shell script
} as const;
