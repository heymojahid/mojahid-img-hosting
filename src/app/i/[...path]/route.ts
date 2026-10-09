import { NextRequest, NextResponse } from 'next/server';
import { EXTENSION_TO_MIME } from '@/lib/constants';
import { resolveShortImagePath } from '@/lib/sanitizer';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
): Promise<Response> {
  try {
    const { path: pathSegments } = await context.params;

    if (!pathSegments || pathSegments.length === 0) {
      return new NextResponse('Image path missing', { status: 400 });
    }

    // Resolve short path (e.g. "2610-a1b2c3d4.png" or "2026/10/photo.jpg")
    const joinedPath = pathSegments.join('/');
    const resolvedPath = resolveShortImagePath(joinedPath);

    if (!resolvedPath) {
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
    const rawGitHubUrl = `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(branch)}/${resolvedPath}`;

    const headers: Record<string, string> = {
      'User-Agent': 'MojahidX-Image-Hosting-Proxy/1.0',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const upstreamResponse = await fetch(rawGitHubUrl, {
      headers,
      next: { revalidate: 31536000 },
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
    const extension = '.' + resolvedPath.split('.').pop()?.toLowerCase();
    const contentType =
      EXTENSION_TO_MIME[extension] ||
      upstreamResponse.headers.get('content-type') ||
      'application/octet-stream';

    // Immutable caching headers
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

    const clientEtag = req.headers.get('if-none-match');
    if (clientEtag && etag && clientEtag === etag) {
      return new Response(null, {
        status: 304,
        headers: responseHeaders,
      });
    }

    return new Response(upstreamResponse.body, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return new NextResponse(`Error serving image: ${message}`, { status: 500 });
  }
}
