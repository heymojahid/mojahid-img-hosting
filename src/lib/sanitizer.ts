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
 * Generates an immutable, non-colliding path under uploads/YYYY/MM/
 */
export function generateUploadPath(
  originalName: string,
  detectedMime: AllowedMimeType,
  date: Date = new Date()
): {
  storedName: string;
  path: string;
  extension: string;
} {
  const year = date.getUTCFullYear().toString();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');

  // Generate 12-char random alphanumeric identifier
  const uniqueId = crypto.randomBytes(6).toString('hex');

  const slug = sanitizeFilenameSlug(originalName);
  const extension = MIME_TO_EXTENSION[detectedMime] || '.png';

  const storedName = `${uniqueId}-${slug}${extension}`;
  const path = `uploads/${year}/${month}/${storedName}`;

  return {
    storedName,
    path,
    extension,
  };
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
