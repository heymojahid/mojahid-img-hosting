import { NextResponse } from 'next/server';
import { DEFAULT_MAX_FILE_SIZE_BYTES } from '@/lib/constants';
import { SystemStatusResponse } from '@/lib/types';


export async function GET(): Promise<NextResponse<SystemStatusResponse>> {
  const owner = process.env.GITHUB_OWNER?.trim();
  const repo = process.env.GITHUB_REPO?.trim() || 'mojahidx-image-hosting';
  const branch = process.env.GITHUB_BRANCH?.trim() || 'main';
  const hasToken = Boolean(process.env.GITHUB_TOKEN?.trim());
  const publicBaseUrl = process.env.PUBLIC_IMAGE_BASE_URL?.trim();

  const maxFileSizeBytes = process.env.MAX_FILE_SIZE_BYTES
    ? parseInt(process.env.MAX_FILE_SIZE_BYTES, 10)
    : process.env.MAX_FILE_SIZE_MB
    ? parseInt(process.env.MAX_FILE_SIZE_MB, 10) * 1024 * 1024
    : DEFAULT_MAX_FILE_SIZE_BYTES;

  const isConfigured = Boolean(owner && hasToken);

  return NextResponse.json({
    configured: isConfigured,
    owner: owner || undefined,
    repo: repo,
    branch: branch,
    customDomainEnabled: Boolean(publicBaseUrl),
    publicBaseUrl: publicBaseUrl || undefined,
    maxFileSizeMB: Math.round(maxFileSizeBytes / (1024 * 1024)),
    allowedFormats: ['PNG', 'JPEG', 'WebP', 'GIF'],
  });
}
