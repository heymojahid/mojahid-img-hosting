import { NextRequest, NextResponse } from 'next/server';
import { EXTENSION_TO_MIME } from '@/lib/constants';
import { isValidUploadPath } from '@/lib/sanitizer';


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

    const owner = process.env.GITHUB_OWNER?.trim();
    const repo = process.env.GITHUB_REPO?.trim() || 'mojahidx-image-hosting';
    const branch = process.env.GITHUB_BRANCH?.trim() || 'main';
    const token = process.env.GITHUB_TOKEN?.trim();

    if (!owner) {
      return new NextResponse('Storage repository owner not configured', { status: 500 });
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
        return new NextResponse('Image not found', { status: 404 });
      }
      return new NextResponse(
        `Failed to fetch image from storage: ${upstreamResponse.statusText}`,
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
