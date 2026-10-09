import { AllowedMimeType } from './types';

// Default max file size: 100 MB as requested
export const DEFAULT_MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB
export const DEFAULT_MAX_FILE_SIZE_MB = 100;

// Default personal vault password
export const APP_DEFAULT_PASSWORD = 'Mojahid@1234';

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

// Supported file extensions for files upload (EXE, MSI, APK, AAB, PDF, PLP, ZIP, etc.)
export const ALLOWED_FILE_EXTENSIONS: readonly string[] = [
  'exe',
  'msi',
  'apk',
  'aab',
  'pdf',
  'plp',
  'zip',
  'rar',
  '7z',
  'tar',
  'gz',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'txt',
  'json',
  'csv',
  'mp4',
  'mp3',
] as const;

export const EXTENSION_TO_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.exe': 'application/x-msdownload',
  '.msi': 'application/x-msi',
  '.apk': 'application/vnd.android.package-archive',
  '.aab': 'application/octet-stream',
  '.pdf': 'application/pdf',
  '.plp': 'application/octet-stream',
  '.zip': 'application/zip',
  '.rar': 'application/x-rar-compressed',
  '.7z': 'application/x-7z-compressed',
  '.tar': 'application/x-tar',
  '.gz': 'application/gzip',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.txt': 'text/plain',
  '.json': 'application/json',
  '.csv': 'text/csv',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
};

// Known signatures (magic numbers) for image validation
export const MAGIC_NUMBERS = {
  PNG: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  JPEG: [0xff, 0xd8, 0xff],
  GIF87A: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
  GIF89A: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
  WEBP_RIFF: [0x52, 0x49, 0x46, 0x46], // RIFF
  WEBP_TAG: [0x57, 0x45, 0x42, 0x50], // WEBP at offset 8
} as const;

// Executable / dangerous script signatures to strictly reject
export const PROHIBITED_SIGNATURES = {
  DOS_MZ: [0x4d, 0x5a], // Windows EXE / DLL
  ELF: [0x7f, 0x45, 0x4c, 0x46], // Linux Executable
  JAVA_CLASS: [0xca, 0xfe, 0xba, 0xbe], // Java bytecode
  SHEBANG: [0x23, 0x21], // #! shell script
} as const;
