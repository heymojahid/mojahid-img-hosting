import { NextRequest, NextResponse } from 'next/server';
import { getRateLimiter } from '@/lib/rate-limiter';
import { generateUploadPath } from '@/lib/sanitizer';
import { buildAppProxyUrl, buildCustomDomainUrl } from '@/lib/url';
import { APP_DEFAULT_PASSWORD, EXTENSION_TO_MIME } from '@/lib/constants';
import { UploadCategory } from '@/lib/types';
import {
  getR2Config,
  isR2Configured,
  createR2PresignedUploadUrl,
  buildR2DirectUrl,
} from '@/lib/r2';

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
  try {
    // 1. Rate limiting check
    const clientIp = getClientIp(req);
    const maxRequests = process.env.RATE_LIMIT_MAX_REQUESTS
      ? parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10)
      : 100;
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
          },
        }
      );
    }

    // 2. Check Cloudflare R2 configuration
    if (!isR2Configured()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cloudflare R2 is not configured on the server. Please add R2 credentials to .env.local.',
          code: 'R2_NOT_CONFIGURED',
        },
        { status: 503 }
      );
    }

    let r2Config;
    try {
      r2Config = getR2Config();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid R2 configuration';
      return NextResponse.json(
        {
          success: false,
          error: message,
          code: 'CONFIG_ERROR',
        },
        { status: 500 }
      );
    }

    // 3. Parse JSON body
    let body: {
      filename?: string;
      size?: number;
      type?: string;
      category?: UploadCategory;
      password?: string;
    };

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON request payload.',
          code: 'INVALID_PAYLOAD',
        },
        { status: 400 }
      );
    }

    // 4. Password Authorization Check
    if (!verifyAuthorization(req, body.password)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Personal access password required.',
          code: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
    }

    const filename = body.filename?.trim();
    const size = typeof body.size === 'number' ? body.size : 0;
    const category: UploadCategory = body.category === 'file' ? 'file' : 'image';

    if (!filename) {
      return NextResponse.json(
        {
          success: false,
          error: 'Filename is required.',
          code: 'NO_FILENAME',
        },
        { status: 400 }
      );
    }

    // Validate size against R2 limit (e.g. 500 MB default)
    if (size > r2Config.maxFileSizeBytes) {
      const maxMB = Math.round(r2Config.maxFileSizeBytes / (1024 * 1024));
      return NextResponse.json(
        {
          success: false,
          error: `File size (${(size / (1024 * 1024)).toFixed(1)} MB) exceeds the ${maxMB} MB Cloudflare R2 limit.`,
          code: 'FILE_TOO_LARGE',
        },
        { status: 400 }
      );
    }

    // Validate extension
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

    if (FORBIDDEN_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        {
          success: false,
          error: `Files with .${ext} extension are strictly prohibited for security reasons.`,
          code: 'FORBIDDEN_EXTENSION',
        },
        { status: 400 }
      );
    }

    const dotExt = `.${ext}`;
    const detectedMime =
      EXTENSION_TO_MIME[dotExt] ||
      body.type ||
      'application/octet-stream';

    // 5. Generate unique short path under uploads/YYYY/MM/
    const { storedName, path: uploadPath } = generateUploadPath(
      filename,
      detectedMime,
      new Date(),
      dotExt
    );

    // 6. Generate presigned PUT URL
    const presignedUrl = await createR2PresignedUploadUrl(
      r2Config,
      uploadPath,
      detectedMime,
      1800 // 30 minutes expiration
    );

    // 7. Build URLs
    const directUrl = buildR2DirectUrl(r2Config, uploadPath);
    const appDomain =
      process.env.PUBLIC_IMAGE_BASE_URL?.trim() ||
      process.env.CUSTOM_IMAGE_BASE_URL?.trim();
    const customDomainUrl =
      appDomain && !appDomain.includes('.r2.dev')
        ? buildCustomDomainUrl(appDomain, uploadPath)
        : null;
    const proxyUrl = buildAppProxyUrl(uploadPath);

    const safeSha = `r2-${storedName.replace(/[^a-zA-Z0-9]/g, '')}`;

    return NextResponse.json({
      success: true,
      uploadUrl: presignedUrl,
      method: 'PUT',
      headers: {
        'Content-Type': detectedMime,
      },
      file: {
        name: filename,
        storedName,
        path: uploadPath,
        size,
        mimeType: detectedMime,
        sha: safeSha,
        directUrl,
        customDomainUrl,
        proxyUrl,
        uploadedAt: new Date().toISOString(),
        category,
        provider: 'r2',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      {
        success: false,
        error: `Presign error: ${message}`,
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
