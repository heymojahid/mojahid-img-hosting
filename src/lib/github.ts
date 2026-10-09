import { DEFAULT_MAX_FILE_SIZE_BYTES } from './constants';
import { StorageConfig } from './types';

/**
 * Reads server-side environment variables for GitHub storage.
 * Throws a clean descriptive error if required values are missing.
 * NOTE: This function MUST ONLY be called server-side.
 */
export function getStorageConfig(): StorageConfig {
  const owner = process.env.GITHUB_OWNER?.trim();
  const repo = process.env.GITHUB_REPO?.trim() || 'mojahidx-image-hosting';
  const branch = process.env.GITHUB_BRANCH?.trim() || 'main';
  const token = process.env.GITHUB_TOKEN?.trim();
  const publicImageBaseUrl =
    process.env.PUBLIC_IMAGE_BASE_URL?.trim() ||
    process.env.CUSTOM_IMAGE_BASE_URL?.trim();

  const maxFileSizeBytes = process.env.MAX_FILE_SIZE_BYTES
    ? parseInt(process.env.MAX_FILE_SIZE_BYTES, 10)
    : process.env.MAX_FILE_SIZE_MB
    ? parseInt(process.env.MAX_FILE_SIZE_MB, 10) * 1024 * 1024
    : DEFAULT_MAX_FILE_SIZE_BYTES;

  const missing: string[] = [];
  if (!owner) missing.push('GITHUB_OWNER');
  if (!token) missing.push('GITHUB_TOKEN');

  if (missing.length > 0) {
    throw new Error(
      `Missing required storage environment variables: ${missing.join(', ')}. Please configure them in your server environment.`
    );
  }

  return {
    owner: owner!,
    repo,
    branch,
    token: token!,
    publicImageBaseUrl,
    maxFileSizeBytes,
  };
}

export interface GitHubUploadResult {
  sha: string;
  commitSha?: string;
  downloadUrl?: string;
  htmlUrl?: string;
}

/**
 * Uploads a binary buffer to GitHub via REST Contents API.
 * Uses base64 encoding as required by GitHub API.
 */
export async function uploadToGitHub(
  config: StorageConfig,
  path: string,
  buffer: Uint8Array,
  originalFilename: string
): Promise<GitHubUploadResult> {
  const { owner, repo, branch, token } = config;

  // Convert binary buffer to standard Base64 string
  const base64Content = Buffer.from(buffer).toString('base64');

  // Build GitHub API URL with encoded path segments
  const encodedPath = path
    .split('/')
    .filter(Boolean)
    .map((seg) => encodeURIComponent(seg))
    .join('/');

  const apiUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}`;

  const payload = {
    message: `Upload ${originalFilename} via MojahidX Image Hosting`,
    content: base64Content,
    branch: branch,
  };

  let response: Response;
  try {
    response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'MojahidX-Image-Hosting/1.0',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown network error';
    throw new Error(`Failed to connect to GitHub API: ${errorMsg}`);
  }

  // Handle errors securely without exposing token
  if (!response.ok) {
    const status = response.status;
    let githubErrorMsg = '';

    try {
      const errorJson = await response.json();
      githubErrorMsg = errorJson.message || '';
    } catch {
      // ignore json parse failure
    }

    if (status === 401) {
      throw new Error(
        'GitHub authentication failed (HTTP 401). Please check that GITHUB_TOKEN is valid and has not expired.'
      );
    }

    if (status === 403) {
      if (githubErrorMsg.toLowerCase().includes('rate limit')) {
        throw new Error(
          'GitHub API rate limit exceeded. Please wait a few moments before trying again.'
        );
      }
      throw new Error(
        `GitHub permission denied (HTTP 403). Ensure your fine-grained token has "Contents: Read and write" permission for repository "${owner}/${repo}". Details: ${githubErrorMsg}`
      );
    }

    if (status === 404) {
      throw new Error(
        `GitHub repository or branch not found (HTTP 404). Ensure the repository "${owner}/${repo}" exists and branch "${branch}" is created.`
      );
    }

    if (status === 409) {
      throw new Error(
        'GitHub file conflict (HTTP 409). A commit conflict occurred for this file path.'
      );
    }

    if (status === 422) {
      throw new Error(
        `GitHub validation failed (HTTP 422). ${githubErrorMsg || 'Request was rejected by GitHub.'}`
      );
    }

    throw new Error(
      `GitHub API error (${status}): ${githubErrorMsg || response.statusText || 'Unexpected error'}`
    );
  }

  const result = await response.json();

  return {
    sha: result.content?.sha || result.commit?.sha || 'unknown',
    commitSha: result.commit?.sha,
    downloadUrl: result.content?.download_url,
    htmlUrl: result.content?.html_url,
  };
}
