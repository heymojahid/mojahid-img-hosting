import { NextRequest, NextResponse } from 'next/server';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { getStorageConfig, uploadToGitHub } from '@/lib/github';
import { getRateLimiter } from '@/lib/rate-limiter';
import { generateUploadPath } from '@/lib/sanitizer';
import { buildAppProxyUrl, buildCustomDomainUrl, buildRawGitHubUrl } from '@/lib/url';
import { validateGeneralFile, validateImageFile } from '@/lib/validator';
import { UploadCategory } from '@/lib/types';
import { APP_DEFAULT_PASSWORD, EXTENSION_TO_MIME } from '@/lib/constants';

function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}

function verifyAuthorization(req: NextRequest, bodyPassword?: string | null): boolean {
  const expected = process.env.APP_PASSWORD?.trim() || APP_DEFAULT_PASSWORD;
  const authCookie = req.cookies.get('mojahidx_auth')?.value;
  const authHeader = req.headers.get('x-app-password');

  return (
    authCookie === 'authorized' ||
    authHeader === expected ||
    bodyPassword === expected
  );
}

const FORBIDDEN_EXTENSIONS = [
  'bat', 'cmd', 'sh', 'php', 'phtml', 'cgi', 'pl', 'vbs', 'com', 'scr'
];

export async function POST(req: NextRequest): Promise<NextResponse> {
  let tempFilePath: string | null = null;
  try {
    // 1. Rate limiting check
    const clientIp = getClientIp(req);
    const maxRequests = process.env.RATE_LIMIT_MAX_REQUESTS
      ? parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10)
      : 200;
    const windowSeconds = process.env.RATE_LIMIT_WINDOW_SECONDS
      ? parseInt(process.env.RATE_LIMIT_WINDOW_SECONDS, 10)
      : 600;

    const rateLimiter = getRateLimiter(maxRequests, windowSeconds);
    const rateCheck = rateLimiter.check(clientIp);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Rate limit exceeded. Please wait ${rateCheck.resetSeconds} seconds before continuing.`,
          code: 'RATE_LIMIT_EXCEEDED',
        },
        { status: 429 }
      );
    }

    // 2. Validate storage configuration
    let config;
    try {
      config = getStorageConfig();
    } catch (configErr) {
      const message = configErr instanceof Error ? configErr.message : 'Server storage misconfiguration';
      return NextResponse.json(
        { success: false, error: message, code: 'CONFIG_ERROR' },
        { status: 500 }
      );
    }

    // 3. Parse FormData payload
    const formData = await req.formData();
    const password = formData.get('password')?.toString();

    // 4. Password Authorization Check
    if (!verifyAuthorization(req, password)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Personal access password required.',
          code: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
    }

    const uploadId = formData.get('uploadId')?.toString()?.trim();
    const chunkIndexStr = formData.get('chunkIndex')?.toString();
    const totalChunksStr = formData.get('totalChunks')?.toString();
    const filename = formData.get('filename')?.toString()?.trim();
    const rawCategory = formData.get('category')?.toString()?.toLowerCase();
    const category: UploadCategory = rawCategory === 'file' ? 'file' : 'image';
    const chunkFile = formData.get('chunk');

    if (!uploadId || !chunkIndexStr || !totalChunksStr || !filename) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required chunk metadata (uploadId, chunkIndex, totalChunks, filename).',
          code: 'INVALID_METADATA',
        },
        { status: 400 }
      );
    }

    // Security: Validate uploadId is strictly safe alphanumeric characters
    if (!/^[a-zA-Z0-9_\-]+$/.test(uploadId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid upload identifier.',
          code: 'INVALID_UPLOAD_ID',
        },
        { status: 400 }
      );
    }

    const chunkIndex = parseInt(chunkIndexStr, 10);
    const totalChunks = parseInt(totalChunksStr, 10);

    if (isNaN(chunkIndex) || isNaN(totalChunks) || chunkIndex < 0 || chunkIndex >= totalChunks) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid chunk index or total chunks count.',
          code: 'INVALID_CHUNK_INDEX',
        },
        { status: 400 }
      );
    }

    if (!chunkFile || !(chunkFile instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Chunk binary payload is required.',
          code: 'MISSING_CHUNK_PAYLOAD',
        },
        { status: 400 }
      );
    }

    // Extension security check
    const extMatch = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
    const ext = extMatch ? extMatch[1] : '';

    if (!ext) {
      return NextResponse.json(
        {
          success: false,
          error: 'File must have a valid extension.',
          code: 'INVALID_EXTENSION',
        },
        { status: 400 }
      );
    }

    if (category === 'image') {
      const allowedImgExts = ['png', 'jpg', 'jpeg', 'webp', 'gif'];
      if (!allowedImgExts.includes(ext)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Image format must be PNG, JPEG, WebP, or GIF.',
            code: 'INVALID_IMAGE_FORMAT',
          },
          { status: 400 }
        );
      }
    } else {
      if (FORBIDDEN_EXTENSIONS.includes(ext)) {
        return NextResponse.json(
          {
            success: false,
            error: `Files with .${ext} extension are strictly prohibited.`,
            code: 'FORBIDDEN_EXTENSION',
          },
          { status: 400 }
        );
      }
    }

    // Extract chunk bytes
    const chunkArrayBuffer = await chunkFile.arrayBuffer();
    const chunkBuffer = Buffer.from(chunkArrayBuffer);

    // Temp file location in os.tmpdir()
    const tempDir = path.join(os.tmpdir(), 'mojahidx_chunks');
    await fs.promises.mkdir(tempDir, { recursive: true });
    tempFilePath = path.join(tempDir, `${uploadId}.bin`);

    // Write first chunk or append subsequent chunks
    if (chunkIndex === 0) {
      await fs.promises.writeFile(tempFilePath, chunkBuffer);
    } else {
      await fs.promises.appendFile(tempFilePath, chunkBuffer);
    }

    // If more chunks are remaining, acknowledge chunk reception
    if (chunkIndex < totalChunks - 1) {
      return NextResponse.json({
        success: true,
        completed: false,
        chunkIndex,
        totalChunks,
      });
    }

    // FINAL CHUNK: Assemble full file and commit to GitHub
    const fullBuffer = await fs.promises.readFile(tempFilePath);

    // Clean up temporary file immediately
    await fs.promises.unlink(tempFilePath).catch(() => {});
    tempFilePath = null;

    // Validate size (max 35MB supported by GitHub API)
    const maxSizeBytes = 35 * 1024 * 1024;
    if (fullBuffer.length > maxSizeBytes) {
      const sizeMB = (fullBuffer.length / (1024 * 1024)).toFixed(1);
      return NextResponse.json(
        {
          success: false,
          error: `File size (${sizeMB} MB) exceeds maximum supported limit of 35 MB.`,
          code: 'FILE_TOO_LARGE',
        },
        { status: 400 }
      );
    }

    // Run deep validators
    const dotExt = `.${ext}`;
    const detectedMime =
      EXTENSION_TO_MIME[dotExt] ||
      chunkFile.type ||
      'application/octet-stream';

    const u8 = new Uint8Array(fullBuffer);
    if (category === 'image') {
      const imgValidation = validateImageFile(u8, detectedMime, maxSizeBytes);
      if (!imgValidation.valid) {
        return NextResponse.json(
          { success: false, error: imgValidation.error, code: 'VALIDATION_FAILED' },
          { status: 400 }
        );
      }
    } else {
      const fileValidation = validateGeneralFile(u8, filename, detectedMime, maxSizeBytes);
      if (!fileValidation.valid) {
        return NextResponse.json(
          { success: false, error: fileValidation.error, code: 'VALIDATION_FAILED' },
          { status: 400 }
        );
      }
    }

    // Generate unique short path under uploads/YYYY/MM/
    const { storedName, path: uploadPath } = generateUploadPath(
      filename,
      detectedMime,
      new Date(),
      dotExt
    );

    // Commit server-to-server to GitHub
    const githubResult = await uploadToGitHub(
      config,
      uploadPath,
      u8,
      filename
    );

    // Build URLs
    const directUrl = buildRawGitHubUrl(
      config.owner,
      config.repo,
      config.branch,
      uploadPath
    );
    const customDomainUrl = buildCustomDomainUrl(config.publicImageBaseUrl, uploadPath);
    const proxyUrl = buildAppProxyUrl(uploadPath);

    return NextResponse.json(
      {
        success: true,
        completed: true,
        file: {
          name: filename,
          storedName,
          path: uploadPath,
          size: fullBuffer.length,
          mimeType: detectedMime,
          sha: githubResult.sha,
          directUrl,
          customDomainUrl,
          proxyUrl,
          uploadedAt: new Date().toISOString(),
          category,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (tempFilePath) {
      await fs.promises.unlink(tempFilePath).catch(() => {});
    }
    const message = error instanceof Error ? error.message : 'Unknown server error during chunk upload';
    return NextResponse.json(
      {
        success: false,
        error: `Upload processing failed: ${message}`,
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
