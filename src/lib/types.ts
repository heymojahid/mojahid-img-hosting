export type AllowedMimeType =
  | 'image/png'
  | 'image/jpeg'
  | 'image/webp'
  | 'image/gif';

export type UploadCategory = 'image' | 'file';
export type StorageProvider = 'github' | 'r2';

export interface UploadResultData {
  name: string;
  storedName: string;
  path: string;
  size: number;
  mimeType: string;
  sha: string;
  directUrl: string;
  customDomainUrl: string | null;
  proxyUrl: string;
  uploadedAt: string;
  category?: UploadCategory;
  provider?: StorageProvider;
}

export interface UploadSuccessResponse {
  success: true;
  file: UploadResultData;
}

export interface UploadErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: string;
}

export type UploadApiResponse = UploadSuccessResponse | UploadErrorResponse;

export interface StorageConfig {
  owner: string;
  repo: string;
  branch: string;
  token: string;
  publicImageBaseUrl?: string;
  maxFileSizeBytes: number;
}

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl?: string;
  maxFileSizeBytes: number;
}

export interface SystemStatusResponse {
  configured: boolean;
  githubConfigured?: boolean;
  r2Configured?: boolean;
  activeProvider?: 'github' | 'r2' | 'hybrid';
  owner?: string;
  repo?: string;
  branch?: string;
  r2Bucket?: string;
  customDomainEnabled: boolean;
  publicBaseUrl?: string;
  maxFileSizeMB: number;
  r2MaxFileSizeMB?: number;
  allowedFormats: string[];
  passwordProtected?: boolean;
}

