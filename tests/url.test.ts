import { describe, it, expect } from 'vitest';
import {
  buildAppProxyUrl,
  buildCustomDomainUrl,
  buildRawGitHubUrl,
} from '../src/lib/url';

describe('URL Generator', () => {
  it('correctly constructs raw GitHub direct URL with URI encoding', () => {
    const rawUrl = buildRawGitHubUrl(
      'heymojahid',
      'mojahidx-image-hosting',
      'main',
      'uploads/2026/10/a1b2-photo.png'
    );

    expect(rawUrl).toBe(
      'https://raw.githubusercontent.com/heymojahid/mojahidx-image-hosting/main/uploads/2026/10/a1b2-photo.png'
    );
  });

  it('correctly encodes special characters in owner, repo, or branch', () => {
    const rawUrl = buildRawGitHubUrl(
      'my-org',
      'image-storage-repo',
      'feature/uploads',
      'uploads/2026/10/test file#1.png'
    );

    expect(rawUrl).toBe(
      'https://raw.githubusercontent.com/my-org/image-storage-repo/feature%2Fuploads/uploads/2026/10/test%20file%231.png'
    );
  });

  it('constructs custom domain URL and trims slashes correctly', () => {
    expect(
      buildCustomDomainUrl('https://img.mojahidx.com', 'uploads/2026/10/img.png')
    ).toBe('https://img.mojahidx.com/uploads/2026/10/img.png');

    // With trailing slash in base and leading slash in path
    expect(
      buildCustomDomainUrl('https://img.mojahidx.com/', '/uploads/2026/10/img.png')
    ).toBe('https://img.mojahidx.com/uploads/2026/10/img.png');

    // When base URL is undefined or empty
    expect(buildCustomDomainUrl(undefined, 'uploads/2026/10/img.png')).toBeNull();
    expect(buildCustomDomainUrl('', 'uploads/2026/10/img.png')).toBeNull();
  });

  it('constructs local app proxy URL', () => {
    expect(buildAppProxyUrl('uploads/2026/10/img.png')).toBe(
      '/uploads/2026/10/img.png'
    );
    expect(buildAppProxyUrl('/uploads/2026/10/img.png')).toBe(
      '/uploads/2026/10/img.png'
    );
  });
});
