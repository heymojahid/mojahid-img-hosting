import { getStorageConfig } from './github';
import { getR2Config, isR2Configured } from './r2';
import { StorageProvider, UploadCategory } from './types';
import { DEFAULT_MAX_FILE_SIZE_MB, DEFAULT_R2_MAX_FILE_SIZE_MB } from './constants';

const BIG_FILE_EXTENSIONS = new Set([
  'exe', 'msi', 'apk', 'aab', 'zip', 'rar', '7z', 'tar', 'gz',
  'iso', 'dmg', 'pkg', 'deb', 'rpm', 'pdf', 'plp', 'mp4', 'mp3',
]);

/**
 * Checks whether GitHub storage is configured.
 */
export function isGitHubConfigured(): boolean {
  try {
    getStorageConfig();
    return true;
  } catch {
    return false;
  }
}

/**
 * Determines which storage provider to use for a given upload.
 * Big files (APK, EXE, MSI, ZIP, etc. or category 'file' or files > 25MB)
 * are routed to Cloudflare R2 whenever R2 is configured!
 */
export function chooseStorageProvider(
  category: UploadCategory,
  extension: string,
  sizeBytes: number = 0
): StorageProvider {
  const r2Ready = isR2Configured();
  const githubReady = isGitHubConfigured();

  // If only one is configured, use the available one
  if (r2Ready && !githubReady) {
    return 'r2';
  }
  if (!r2Ready && githubReady) {
    return 'github';
  }
  if (!r2Ready && !githubReady) {
    // Default to R2 if neither is configured, or github
    return 'r2';
  }

  // BOTH are configured:
  // Route big files, APKs, EXEs, MSI, ZIPs, or File Upload tab to Cloudflare R2!
  const cleanExt = extension.replace(/^\.+/, '').toLowerCase();
  const isBigFormat = BIG_FILE_EXTENSIONS.has(cleanExt);
  const isOverGitHubLimit = sizeBytes > 25 * 1024 * 1024; // > 25 MB

  if (category === 'file' || isBigFormat || isOverGitHubLimit) {
    return 'r2';
  }

  // Standard images under 25MB go to GitHub
  return 'github';
}

/**
 * Retrieves unified system storage status.
 */
export function getSystemStorageStatus() {
  const githubReady = isGitHubConfigured();
  const r2Ready = isR2Configured();

  let activeProvider: 'github' | 'r2' | 'hybrid' = 'github';
  if (githubReady && r2Ready) {
    activeProvider = 'hybrid';
  } else if (r2Ready) {
    activeProvider = 'r2';
  }

  let r2Bucket: string | undefined;
  let r2MaxMB = DEFAULT_R2_MAX_FILE_SIZE_MB;
  if (r2Ready) {
    try {
      const conf = getR2Config();
      r2Bucket = conf.bucketName;
      r2MaxMB = Math.round(conf.maxFileSizeBytes / (1024 * 1024));
    } catch {
      // ignore
    }
  }

  return {
    configured: githubReady || r2Ready,
    githubConfigured: githubReady,
    r2Configured: r2Ready,
    activeProvider,
    r2Bucket,
    maxFileSizeMB: DEFAULT_MAX_FILE_SIZE_MB,
    r2MaxFileSizeMB: r2MaxMB,
  };
}
