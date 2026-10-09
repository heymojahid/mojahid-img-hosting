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
 * Builds the custom domain image URL if PUBLIC_IMAGE_BASE_URL is configured.
 * E.g., https://img.mojahidx.com/uploads/2026/10/xyz-file.png
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

  return `${cleanBase}/${cleanPath}`;
}

/**
 * Builds the application proxy URL (served by this app's route handler).
 * E.g., /uploads/2026/10/xyz-file.png
 */
export function buildAppProxyUrl(filePath: string): string {
  const cleanPath = filePath.replace(/^\/+/, '');
  // Ensure starts with /
  return `/${cleanPath}`;
}
