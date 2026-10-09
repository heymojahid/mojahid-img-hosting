import {
  ALLOWED_MIME_TYPES,
  DEFAULT_MAX_FILE_SIZE_BYTES,
  EXTENSION_TO_MIME,
  MAGIC_NUMBERS,
  PROHIBITED_SIGNATURES,
} from './constants';
import { AllowedMimeType } from './types';

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  detectedMimeType?: AllowedMimeType;
}

export interface GeneralFileValidationResult {
  valid: boolean;
  error?: string;
  detectedMimeType?: string;
  extension?: string;
}

/**
 * Checks whether buffer starts with the given byte array at the specified offset.
 */
function matchesBytes(
  buffer: Uint8Array,
  expected: readonly number[],
  offset: number = 0
): boolean {
  if (buffer.length < offset + expected.length) {
    return false;
  }
  for (let i = 0; i < expected.length; i++) {
    if (buffer[offset + i] !== expected[i]) {
      return false;
    }
  }
  return true;
}

/**
 * Detects whether the buffer contains text markers indicating SVG, XML, HTML, or script content.
 */
function containsForbiddenTextPayload(buffer: Uint8Array): boolean {
  const checkLength = Math.min(buffer.length, 1024);
  const textHeader = new TextDecoder('utf-8', { fatal: false })
    .decode(buffer.subarray(0, checkLength))
    .toLowerCase();

  const forbiddenKeywords = [
    '<svg',
    'xmlns="http://www.w3.org/2000/svg"',
    '<?xml',
    '<!doctype html',
    '<html',
    '<script',
    'javascript:',
    'vbscript:',
  ];

  for (const keyword of forbiddenKeywords) {
    if (textHeader.includes(keyword)) {
      return true;
    }
  }

  return false;
}

/**
 * Detects image file format from its binary magic bytes.
 */
export function detectFileSignature(buffer: Uint8Array): AllowedMimeType | null {
  // 1. Prohibited binary executable signatures check
  if (
    matchesBytes(buffer, PROHIBITED_SIGNATURES.DOS_MZ) ||
    matchesBytes(buffer, PROHIBITED_SIGNATURES.ELF) ||
    matchesBytes(buffer, PROHIBITED_SIGNATURES.JAVA_CLASS) ||
    matchesBytes(buffer, PROHIBITED_SIGNATURES.SHEBANG)
  ) {
    return null;
  }

  // 2. Reject if it contains SVG or HTML markup
  if (containsForbiddenTextPayload(buffer)) {
    return null;
  }

  // 3. PNG: 8-byte signature: 89 50 4E 47 0D 0A 1A 0A
  if (matchesBytes(buffer, MAGIC_NUMBERS.PNG)) {
    return 'image/png';
  }

  // 4. JPEG: 3-byte signature: FF D8 FF
  if (matchesBytes(buffer, MAGIC_NUMBERS.JPEG)) {
    return 'image/jpeg';
  }

  // 5. GIF: 6-byte signature: GIF87a or GIF89a
  if (
    matchesBytes(buffer, MAGIC_NUMBERS.GIF87A) ||
    matchesBytes(buffer, MAGIC_NUMBERS.GIF89A)
  ) {
    return 'image/gif';
  }

  // 6. WebP: 12-byte header: RIFF (bytes 0-3) + 4 bytes size + WEBP (bytes 8-11)
  if (
    matchesBytes(buffer, MAGIC_NUMBERS.WEBP_RIFF, 0) &&
    matchesBytes(buffer, MAGIC_NUMBERS.WEBP_TAG, 8)
  ) {
    return 'image/webp';
  }

  return null;
}

/**
 * Formats bytes into a human-readable string (e.g. 5 MB, 320 KB).
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Validates an uploaded image file buffer against MIME, magic numbers, and size limits.
 */
export function validateImageFile(
  buffer: Uint8Array,
  declaredMimeType: string,
  maxSizeBytes: number = DEFAULT_MAX_FILE_SIZE_BYTES
): FileValidationResult {
  // Check empty buffer
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: 'File is empty.' };
  }

  // Check file size
  if (buffer.length > maxSizeBytes) {
    return {
      valid: false,
      error: `File size (${formatBytes(buffer.length)}) exceeds the maximum allowed limit of ${formatBytes(maxSizeBytes)}.`,
    };
  }

  // Normalize declared mime type
  const normalizedMime = declaredMimeType.toLowerCase().trim();

  // SVG rejection
  if (
    normalizedMime.includes('svg') ||
    normalizedMime === 'image/svg+xml'
  ) {
    return {
      valid: false,
      error: 'SVG files are not permitted for security reasons. Only PNG, JPEG, WebP, and GIF are allowed.',
    };
  }

  // Validate declared MIME matches allowed list
  if (!ALLOWED_MIME_TYPES.includes(normalizedMime as AllowedMimeType)) {
    return {
      valid: false,
      error: `Unsupported file type "${declaredMimeType}". Allowed types: PNG, JPEG, WebP, GIF.`,
    };
  }

  // Detect binary signature (magic bytes)
  const detectedMime = detectFileSignature(buffer);

  if (!detectedMime) {
    return {
      valid: false,
      error: 'Invalid file signature. The file content does not match allowed image formats (PNG, JPEG, WebP, GIF) or contains forbidden data.',
    };
  }

  // Ensure detected signature matches declared mime type (or both are JPEG variations)
  if (detectedMime !== normalizedMime) {
    return {
      valid: false,
      error: `MIME type mismatch: declared as "${declaredMimeType}", but actual file content is "${detectedMime}".`,
    };
  }

  return {
    valid: true,
    detectedMimeType: detectedMime,
  };
}

/**
 * Validates general files (APK, AAB, PDF, PLP, ZIP, documents) up to 100MB.
 */
export function validateGeneralFile(
  buffer: Uint8Array,
  fileName: string,
  declaredMimeType: string,
  maxSizeBytes: number = DEFAULT_MAX_FILE_SIZE_BYTES
): GeneralFileValidationResult {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: 'File is empty.' };
  }

  if (buffer.length > maxSizeBytes) {
    return {
      valid: false,
      error: `File size (${formatBytes(buffer.length)}) exceeds the maximum allowed limit of ${formatBytes(maxSizeBytes)}.`,
    };
  }

  // Extract clean extension
  const extMatch = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
  const ext = extMatch ? extMatch[1] : '';

  if (!ext) {
    return { valid: false, error: 'File must have a valid extension.' };
  }

  // Strictly prohibited dangerous executable extensions
  const forbiddenExtensions = [
    'exe', 'bat', 'cmd', 'sh', 'php', 'phtml', 'cgi', 'pl', 'vbs', 'msi', 'com', 'scr'
  ];

  if (forbiddenExtensions.includes(ext)) {
    return {
      valid: false,
      error: `Files with .${ext} extension are strictly prohibited for security reasons.`,
    };
  }

  const dotExt = `.${ext}`;
  const resolvedMime =
    EXTENSION_TO_MIME[dotExt] ||
    declaredMimeType ||
    'application/octet-stream';

  return {
    valid: true,
    detectedMimeType: resolvedMime,
    extension: dotExt,
  };
}
