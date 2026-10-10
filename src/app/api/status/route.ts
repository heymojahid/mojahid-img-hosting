import { NextResponse } from 'next/server';
import { SystemStatusResponse } from '@/lib/types';
import { getSystemStorageStatus } from '@/lib/storage';

export async function GET(): Promise<NextResponse<SystemStatusResponse>> {
  const owner = process.env.GITHUB_OWNER?.trim();
  const repo = process.env.GITHUB_REPO?.trim() || 'mojahidx-image-hosting';
  const branch = process.env.GITHUB_BRANCH?.trim() || 'main';
  const publicBaseUrl =
    process.env.PUBLIC_IMAGE_BASE_URL?.trim() ||
    process.env.CUSTOM_IMAGE_BASE_URL?.trim() ||
    process.env.R2_PUBLIC_URL?.trim();

  const storageStatus = getSystemStorageStatus();

  return NextResponse.json({
    configured: storageStatus.configured,
    githubConfigured: storageStatus.githubConfigured,
    r2Configured: storageStatus.r2Configured,
    activeProvider: storageStatus.activeProvider,
    owner: owner || undefined,
    repo: repo,
    branch: branch,
    r2Bucket: storageStatus.r2Bucket,
    customDomainEnabled: Boolean(publicBaseUrl),
    publicBaseUrl: publicBaseUrl || undefined,
    maxFileSizeMB: storageStatus.maxFileSizeMB,
    r2MaxFileSizeMB: storageStatus.r2MaxFileSizeMB,
    allowedFormats: ['PNG', 'JPEG', 'WebP', 'GIF', 'APK', 'AAB', 'EXE', 'MSI', 'PDF', 'PLP', 'ZIP', 'ISO'],
    passwordProtected: true,
  });
}

