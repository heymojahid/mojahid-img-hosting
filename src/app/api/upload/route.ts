import { NextRequest, NextResponse } from 'next/server';
import { getStorageConfig, uploadToGitHub } from '@/lib/github';
import { getRateLimiter } from '@/lib/rate-limiter';
import { generateUploadPath } from '@/lib/sanitizer';
import { buildAppProxyUrl, buildCustomDomainUrl, buildRawGitHubUrl } from '@/lib/url';
import { validateGeneralFile, validateImageFile } from '@/lib/validator';
import { UploadApiResponse, UploadCategory } from '@/lib/types';
import { APP_DEFAULT_PASSWORD } from '@/lib/constants';
import { getR2Config, uploadToR2, buildR2DirectUrl } from '@/lib/r2';
import { chooseStorageProvider, getSystemStorageStatus } from '@/lib/storage';


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

function verifyAuthorization(req: NextRequest, formPassword?: string | null): boolean {
  const expected = process.env.APP_PASSWORD?.trim() || APP_DEFAULT_PASSWORD;
  const authCookie = req.cookies.get('mojahidx_auth')?.value;
  const authHeader = req.headers.get('x-app-password');

  return (
    authCookie === 'authorized' ||
    authHeader === expected ||
    formPassword === expected
  );
}

export async function POST(req: NextRequest): Promise<NextResponse<UploadApiResponse>> {
  try {
    // 1. Rate limiting check
    const clientIp = getClientIp(req);
    const maxRequests = process.env.RATE_LIMIT_MAX_REQUESTS
      ? parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10)
      : 50;
    const windowSeconds = process.env.RATE_LIMIT_WINDOW_SECONDS
      ? parseInt(process.env.RATE_LIMIT_WINDOW_SECONDS, 10)
      : 600;

    const rateLimiter = getRateLimiter(maxRequests, windowSeconds);
    const rateCheck = rateLimiter.check(clientIp);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Rate limit exceeded. Please wait ${rateCheck.resetSeconds} seconds before uploading again.`,
          code: 'RATE_LIMIT_EXCEEDED',
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateCheck.resetSeconds.toString(),
            'X-RateLimit-Limit': rateCheck.totalLimit.toString(),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    // 2. Validate storage configuration
    const storageStatus = getSystemStorageStatus();
    if (!storageStatus.configured) {
      return NextResponse.json(
        {
          success: false,
          error: 'No storage provider configured. Please configure Cloudflare R2 or GitHub credentials.',
          code: 'CONFIG_ERROR',
        },
        { status: 500 }
      );
    }

    // 3. Parse multipart/form-data
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid multipart/form-data request body.',
          code: 'INVALID_FORM_DATA',
        },
        { status: 400 }
      );
    }

    // 4. Password Authorization Check (Personal Use Only)
    const formPassword = formData.get('password')?.toString();
    if (!verifyAuthorization(req, formPassword)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Personal access password required.',
          code: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
    }

    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: 'No file was provided. Expected form field "file".',
          code: 'NO_FILE',
        },
        { status: 400 }
      );
    }

    const rawCategory = formData.get('category')?.toString()?.toLowerCase();
    const category: UploadCategory = rawCategory === 'file' ? 'file' : 'image';
    const customName = formData.get('customName')?.toString()?.trim();

    // 5. Extract buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    let detectedMime = 'application/octet-stream';
    let fileExtension: string | undefined;

    // Up to 500 MB limit for R2, 100 MB default
    const maxSizeBytes = storageStatus.r2Configured
      ? (storageStatus.r2MaxFileSizeMB || 500) * 1024 * 1024
      : (storageStatus.maxFileSizeMB || 100) * 1024 * 1024;

    if (category === 'file') {
      const generalValidation = validateGeneralFile(
        buffer,
        file.name,
        file.type,
        maxSizeBytes
      );
      if (!generalValidation.valid) {
        return NextResponse.json(
          {
            success: false,
            error: generalValidation.error || 'File validation failed.',
            code: 'INVALID_FILE',
          },
          { status: 400 }
        );
      }
      detectedMime = generalValidation.detectedMimeType || 'application/octet-stream';
      fileExtension = generalValidation.extension;
    } else {
      // Image category
      const imgValidation = validateImageFile(buffer, file.type, maxSizeBytes);
      if (!imgValidation.valid || !imgValidation.detectedMimeType) {
        return NextResponse.json(
          {
            success: false,
            error: imgValidation.error || 'Image validation failed.',
            code: 'INVALID_FILE',
          },
          { status: 400 }
        );
      }
      detectedMime = imgValidation.detectedMimeType;
    }

    // 6. Generate unique safe path under uploads/YYYY/MM/ (with optional custom file slug)
    const { storedName, path } = generateUploadPath(
      file.name,
      detectedMime,
      new Date(),
      fileExtension,
      customName
    );

    // 7. Choose storage provider (Cloudflare R2 for big files, APKs, EXEs; GitHub for images)
    const provider = chooseStorageProvider(category, fileExtension || '', buffer.length);
    let directUrl: string;
    let customDomainUrl: string | null;
    let sha: string;

    if (provider === 'r2') {
      const r2Config = getR2Config();
      const r2Result = await uploadToR2(r2Config, path, buffer, detectedMime);
      sha = r2Result.etag || `r2-${storedName.replace(/[^a-zA-Z0-9]/g, '')}`;
      directUrl = buildR2DirectUrl(r2Config, path);
      const appDomain =
        process.env.PUBLIC_IMAGE_BASE_URL?.trim() ||
        process.env.CUSTOM_IMAGE_BASE_URL?.trim();
      customDomainUrl =
        appDomain && !appDomain.includes('.r2.dev')
          ? buildCustomDomainUrl(appDomain, path)
          : null;
    } else {
      const ghConfig = getStorageConfig();
      const githubResult = await uploadToGitHub(
        ghConfig,
        path,
        buffer,
        file.name
      );
      sha = githubResult.sha;
      directUrl = buildRawGitHubUrl(
        ghConfig.owner,
        ghConfig.repo,
        ghConfig.branch,
        path
      );
      customDomainUrl = buildCustomDomainUrl(ghConfig.publicImageBaseUrl, path);
    }

    const proxyUrl = buildAppProxyUrl(path);

    // 8. Return response
    return NextResponse.json(
      {
        success: true,
        file: {
          name: file.name,
          storedName,
          path,
          size: buffer.length,
          mimeType: detectedMime,
          sha,
          directUrl,
          customDomainUrl,
          proxyUrl,
          uploadedAt: new Date().toISOString(),
          category,
          provider,
        },
      },
      {
        status: 201,
        headers: {
          'X-RateLimit-Limit': rateCheck.totalLimit.toString(),
          'X-RateLimit-Remaining': rateCheck.remaining.toString(),
        },
      }
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'An unexpected server error occurred';
    return NextResponse.json(
      {
        success: false,
        error: errorMsg,
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
