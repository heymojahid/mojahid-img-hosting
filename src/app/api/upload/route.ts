import { NextRequest, NextResponse } from 'next/server';
import { getStorageConfig, uploadToGitHub } from '@/lib/github';
import { getRateLimiter } from '@/lib/rate-limiter';
import { generateUploadPath } from '@/lib/sanitizer';
import { buildAppProxyUrl, buildCustomDomainUrl, buildRawGitHubUrl } from '@/lib/url';
import { validateGeneralFile, validateImageFile } from '@/lib/validator';
import { UploadApiResponse, UploadCategory } from '@/lib/types';
import { APP_DEFAULT_PASSWORD } from '@/lib/constants';

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

    // 2. Validate server configuration
    let config;
    try {
      config = getStorageConfig();
    } catch (configErr) {
      const message = configErr instanceof Error ? configErr.message : 'Server storage misconfiguration';
      return NextResponse.json(
        {
          success: false,
          error: message,
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

    // 5. Extract buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    let detectedMime = 'application/octet-stream';
    let fileExtension: string | undefined;

    // Up to 100 MB limit
    const maxSizeBytes = 100 * 1024 * 1024;

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

    // 6. Generate unique safe path under uploads/YYYY/MM/
    const { storedName, path } = generateUploadPath(
      file.name,
      detectedMime,
      new Date(),
      fileExtension
    );

    // 7. Upload directly to GitHub REST Contents API
    const githubResult = await uploadToGitHub(
      config,
      path,
      buffer,
      file.name
    );

    // 8. Formulate URLs
    const directUrl = buildRawGitHubUrl(
      config.owner,
      config.repo,
      config.branch,
      path
    );
    const customDomainUrl = buildCustomDomainUrl(config.publicImageBaseUrl, path);
    const proxyUrl = buildAppProxyUrl(path);

    // 9. Return response
    return NextResponse.json(
      {
        success: true,
        file: {
          name: file.name,
          storedName,
          path,
          size: buffer.length,
          mimeType: detectedMime,
          sha: githubResult.sha,
          directUrl,
          customDomainUrl,
          proxyUrl,
          uploadedAt: new Date().toISOString(),
          category,
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
