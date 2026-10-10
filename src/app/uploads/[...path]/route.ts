import { NextRequest, NextResponse } from 'next/server';
import { EXTENSION_TO_MIME } from '@/lib/constants';
import { isValidUploadPath } from '@/lib/sanitizer';
import { isR2Configured, getR2Config, getR2Object } from '@/lib/r2';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
): Promise<Response> {
  try {
    const { path: pathSegments } = await context.params;

    if (!pathSegments || pathSegments.length === 0) {
      return new NextResponse('Image path missing', { status: 400 });
    }

    // Reconstruct path under uploads/
    const subPath = pathSegments.join('/');
    const fullPath = `uploads/${subPath}`;

    // Validate path against directory traversal and valid filename structure
    if (!isValidUploadPath(fullPath)) {
      return new NextResponse('Invalid or forbidden image path', { status: 400 });
    }

    // 1. Try Cloudflare R2 if configured
    if (isR2Configured()) {
      try {
        const r2Config = getR2Config();
        const r2Object = await getR2Object(r2Config, fullPath);

        if (r2Object && r2Object.Body) {
          const extension = '.' + fullPath.split('.').pop()?.toLowerCase();
          const contentType =
            r2Object.ContentType ||
            EXTENSION_TO_MIME[extension] ||
            'application/octet-stream';

          const responseHeaders = new Headers();
          responseHeaders.set('Content-Type', contentType);
          responseHeaders.set(
            'Cache-Control',
            'public, max-age=31536000, s-maxage=31536000, immutable'
          );
          responseHeaders.set('Access-Control-Allow-Origin', '*');
          responseHeaders.set('X-Content-Type-Options', 'nosniff');
          responseHeaders.set('X-Storage-Provider', 'cloudflare-r2');

          if (r2Object.ContentLength) {
            responseHeaders.set('Content-Length', r2Object.ContentLength.toString());
          }

          if (r2Object.ETag) {
            const cleanEtag = r2Object.ETag.replace(/"/g, '');
            responseHeaders.set('ETag', `"${cleanEtag}"`);

            const clientEtag = req.headers.get('if-none-match');
            if (clientEtag && (clientEtag === `"${cleanEtag}"` || clientEtag === cleanEtag)) {
              return new Response(null, {
                status: 304,
                headers: responseHeaders,
              });
            }
          }

          const webStream = r2Object.Body.transformToWebStream();
          return new Response(webStream, {
            status: 200,
            headers: responseHeaders,
          });
        }
      } catch (r2Err: unknown) {
        const isNotFound =
          r2Err &&
          typeof r2Err === 'object' &&
          ('name' in r2Err && (r2Err.name === 'NoSuchKey' || r2Err.name === 'NotFound'));
        if (!isNotFound) {
          console.warn('R2 proxy read error in /uploads, falling back to GitHub:', r2Err);
        }
      }
    }

    // 2. Fallback to GitHub
    const owner = process.env.GITHUB_OWNER?.trim();
    const repo = process.env.GITHUB_REPO?.trim() || 'mojahidx-image-hosting';
    const branch = process.env.GITHUB_BRANCH?.trim() || 'main';
    const token = process.env.GITHUB_TOKEN?.trim();

    if (!owner) {
      return new NextResponse('Storage repository not found or configured', { status: 404 });
    }

    // Build raw GitHub URL
    const rawGitHubUrl = `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(branch)}/${fullPath}`;

    // Forward request with optional auth token (supports both public and private storage repos)
    const headers: Record<string, string> = {
      'User-Agent': 'MojahidX-Image-Hosting-Proxy/1.0',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const upstreamResponse = await fetch(rawGitHubUrl, {
      headers,
      next: { revalidate: 31536000 }, // Next.js cache
    });

    if (!upstreamResponse.ok) {
      if (upstreamResponse.status === 404) {
        return new NextResponse('File not found in storage', { status: 404 });
      }
      return new NextResponse(
        `Failed to fetch file from storage: ${upstreamResponse.statusText}`,
        { status: upstreamResponse.status }
      );
    }

    // Infer content type from extension
    const extension = '.' + fullPath.split('.').pop()?.toLowerCase();
    const contentType =
      EXTENSION_TO_MIME[extension] ||
      upstreamResponse.headers.get('content-type') ||
      'application/octet-stream';

    // Prepare immutable caching headers
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', contentType);
    responseHeaders.set(
      'Cache-Control',
      'public, max-age=31536000, s-maxage=31536000, immutable'
    );
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('X-Content-Type-Options', 'nosniff');
    responseHeaders.set('X-Storage-Provider', 'github');

    const etag = upstreamResponse.headers.get('etag');
    if (etag) {
      responseHeaders.set('ETag', etag);
    }

    // Check If-None-Match for 304 Not Modified
    const clientEtag = req.headers.get('if-none-match');
    if (clientEtag && etag && clientEtag === etag) {
      return new Response(null, {
        status: 304,
        headers: responseHeaders,
      });
    }

    // Stream image body directly to client
    return new Response(upstreamResponse.body, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return new NextResponse(`Error serving image: ${message}`, { status: 500 });
  }
}
