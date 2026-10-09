import { NextRequest, NextResponse } from 'next/server';
import { getStorageConfig } from '@/lib/github';
import { getRateLimiter } from '@/lib/rate-limiter';
import { generateUploadPath } from '@/lib/sanitizer';
import { buildAppProxyUrl, buildCustomDomainUrl, buildRawGitHubUrl } from '@/lib/url';
import { APP_DEFAULT_PASSWORD, EXTENSION_TO_MIME } from '@/lib/constants';
import { UploadCategory } from '@/lib/types';

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

    // 2. Validate storage configuration
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

    // 3. Parse JSON request body
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

    // 4. Password Authorization Check (Personal Use Only)
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

    // 100 MB max file size
    const maxSizeBytes = 100 * 1024 * 1024;
    if (size > maxSizeBytes) {
      return NextResponse.json(
        {
          success: false,
          error: `File size (${(size / (1024 * 1024)).toFixed(1)} MB) exceeds the 100 MB limit.`,
          code: 'FILE_TOO_LARGE',
        },
        { status: 400 }
      );
    }

    // Extract clean extension
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

    const dotExt = `.${ext}`;
    const detectedMime =
      EXTENSION_TO_MIME[dotExt] ||
      body.type ||
      'application/octet-stream';

    // 5. Generate unique short path under uploads/YYYY/MM/
    const { storedName, path } = generateUploadPath(
      filename,
      detectedMime,
      new Date(),
      dotExt
    );

    // 6. Formulate URLs
    const directUrl = buildRawGitHubUrl(
      config.owner,
      config.repo,
      config.branch,
      path
    );
    const customDomainUrl = buildCustomDomainUrl(config.publicImageBaseUrl, path);
    const proxyUrl = buildAppProxyUrl(path);

    // 7. GitHub REST Contents direct upload endpoint URL
    const encodedPath = path
      .split('/')
      .filter(Boolean)
      .map((seg) => encodeURIComponent(seg))
      .join('/');

    const uploadUrl = `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/contents/${encodedPath}`;

    return NextResponse.json({
      success: true,
      uploadUrl,
      branch: config.branch,
      token: config.token,
      file: {
        name: filename,
        storedName,
        path,
        size,
        mimeType: detectedMime,
        sha: '',
        directUrl,
        customDomainUrl,
        proxyUrl,
        uploadedAt: new Date().toISOString(),
        category,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      {
        success: false,
        error: `Upload ticket error: ${message}`,
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
