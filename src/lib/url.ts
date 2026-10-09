/**
 * Builds the direct raw GitHub URL with proper URI encoding of each path segment.
 */
export function buildRawGitHubUrl(
  owner: string,
  repo: string,
  branch: string,
  filePath: string
): string {
  const cleanOwner = encodeURIComponent(owner.trim());
  const cleanRepo = encodeURIComponent(repo.trim());
  const cleanBranch = encodeURIComponent(branch.trim());

  // Encode each segment of filePath separately to maintain slash structure
  const encodedSegments = filePath
    .split('/')
    .filter(Boolean)
    .map((seg) => encodeURIComponent(seg))
    .join('/');

  return `https://raw.githubusercontent.com/${cleanOwner}/${cleanRepo}/${cleanBranch}/${encodedSegments}`;
}

/**
 * Builds the custom domain image URL if PUBLIC_IMAGE_BASE_URL or CUSTOM_IMAGE_BASE_URL is configured.
 * For ultra-short format (uploads/YYYY/MM/YYMM-hash.ext), generates:
 * https://img.mojahidx.com/i/YYMM-hash.ext
 */
export function buildCustomDomainUrl(
  baseUrl: string | undefined,
  filePath: string
): string | null {
  if (!baseUrl || !baseUrl.trim()) {
    return null;
  }

  // Strip trailing slashes from base URL
  const cleanBase = baseUrl.trim().replace(/\/+$/, '');

  // Strip leading slashes from file path
  const cleanPath = filePath.replace(/^\/+/, '');

  // If ultra-short format (uploads/YYYY/MM/YYMM-hash.ext), compress to /i/YYMM-hash.ext
  const shortMatch = cleanPath.match(
    /^uploads\/\d{4}\/\d{2}\/(\d{4}-[a-fA-F0-9]{8}\.[a-zA-Z0-9]+)$/i
  );
  if (shortMatch) {
    return `${cleanBase}/i/${shortMatch[1]}`;
  }

  return `${cleanBase}/${cleanPath}`;
}

/**
 * Builds the application proxy URL (served by this app's route handler).
 * E.g., /i/2610-a1b2c3d4.png or /uploads/2026/10/file.png
 */
export function buildAppProxyUrl(filePath: string): string {
  const cleanPath = filePath.replace(/^\/+/, '');

  const shortMatch = cleanPath.match(
    /^uploads\/\d{4}\/\d{2}\/(\d{4}-[a-fA-F0-9]{8}\.[a-zA-Z0-9]+)$/i
  );
  if (shortMatch) {
    return `/i/${shortMatch[1]}`;
  }

  return `/${cleanPath}`;
}
