import crypto from 'crypto';
import { MIME_TO_EXTENSION } from './constants';
import { AllowedMimeType } from './types';

/**
 * Sanitizes an original filename into a URL-friendly, safe slug.
 * Removes all directory traversal indicators, control characters, and special symbols.
 */
export function sanitizeFilenameSlug(originalName: string): string {
  // Extract just the basename component (strip directory separators)
  const segments = originalName.split(/[/\\]/).filter(Boolean);
  const rawBase = segments.length > 0 ? segments[segments.length - 1] : 'image';

  // Strip extension if present (only if not a hidden dotfile or dot at start)
  const lastDotIndex = rawBase.lastIndexOf('.');
  const nameWithoutExt = lastDotIndex > 0 ? rawBase.substring(0, lastDotIndex) : rawBase;

  // Replace spaces and special characters with hyphens
  const clean = nameWithoutExt
    .toLowerCase()
    .normalize('NFKD') // Normalize unicode
    .replace(/[^\w\s-]/g, '') // Remove non-word chars except space and hyphen
    .replace(/[\s_]+/g, '-') // Replace space/underscore with hyphen
    .replace(/-+/g, '-') // Replace consecutive hyphens
    .replace(/^-+|-+$/g, ''); // Trim hyphens from ends

  // Limit slug length to 40 chars or default to 'image'
  return clean.slice(0, 40) || 'image';
}

/**
 * Generates an immutable, non-colliding ultra-short path under uploads/YYYY/MM/
 * Format: uploads/YYYY/MM/YYMM-hash.ext
 * E.g., uploads/2026/10/2610-a1b2c3d4.png
 */
export function generateUploadPath(
  originalName: string,
  detectedMime: AllowedMimeType,
  date: Date = new Date()
): {
  storedName: string;
  path: string;
  extension: string;
  shortId: string;
} {
  const fullYear = date.getUTCFullYear().toString(); // "2026"
  const shortYear = fullYear.slice(-2); // "26"
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0'); // "10"

  // 8-character random hexadecimal unique identifier (4.29 billion combinations per month)
  const randomHex = crypto.randomBytes(4).toString('hex');

  const extension = MIME_TO_EXTENSION[detectedMime] || '.png';
  const shortId = `${shortYear}${month}-${randomHex}`; // "2610-a1b2c3d4"
  const storedName = `${shortId}${extension}`; // "2610-a1b2c3d4.png"
  const path = `uploads/${fullYear}/${month}/${storedName}`;

  return {
    storedName,
    path,
    extension,
    shortId,
  };
}

/**
 * Resolves a short or full route path into the canonical uploads/YYYY/MM/... storage path.
 * Supports:
 * - 2610-a1b2c3d4.png -> uploads/2026/10/2610-a1b2c3d4.png
 * - 2026/10/filename.png -> uploads/2026/10/filename.png
 */
export function resolveShortImagePath(pathParam: string): string | null {
  if (!pathParam || typeof pathParam !== 'string') return null;

  const normalized = pathParam.replace(/\\/g, '/').replace(/^\/+/, '');

  // 1. Check ultra-short format: YYMM-hash.ext (e.g. 2610-a1b2c3d4.jpg)
  const shortMatch = normalized.match(/^(\d{2})(\d{2})-([a-fA-F0-9]{8})\.(png|jpg|jpeg|webp|gif)$/i);
  if (shortMatch) {
    const fullYear = `20${shortMatch[1]}`;
    const month = shortMatch[2];
    return `uploads/${fullYear}/${month}/${normalized}`;
  }

  // 2. Check full subpath under uploads (e.g. 2026/10/xyz.png)
  if (normalized.startsWith('uploads/')) {
    return isValidUploadPath(normalized) ? normalized : null;
  }

  const withUploads = `uploads/${normalized}`;
  return isValidUploadPath(withUploads) ? withUploads : null;
}

/**
 * Validates whether a requested path is safe and strictly conforms to uploads/YYYY/MM/filename
 * Prevents directory traversal attacks like ../.. or absolute paths.
 */
export function isValidUploadPath(path: string): boolean {
  if (!path || typeof path !== 'string') return false;

  // Normalize slashes
  const normalized = path.replace(/\\/g, '/');

  // Must not contain directory traversal or null bytes
  if (normalized.includes('..') || normalized.includes('\0')) {
    return false;
  }

  // Regex pattern strictly matching: uploads/YYYY/MM/filename.ext
  // YYYY = 4 digits, MM = 2 digits, filename = alphanumeric, hyphens, underscores, dots
  const uploadPathRegex = /^uploads\/\d{4}\/\d{2}\/[a-zA-Z0-9_\-\.]+\.(png|jpg|jpeg|webp|gif)$/i;

  return uploadPathRegex.test(normalized);
}
