export type AllowedMimeType =
  | 'image/png'
  | 'image/jpeg'
  | 'image/webp'
  | 'image/gif';

export type UploadCategory = 'image' | 'file';

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

export interface SystemStatusResponse {
  configured: boolean;
  owner?: string;
  repo?: string;
  branch?: string;
  customDomainEnabled: boolean;
  publicBaseUrl?: string;
  maxFileSizeMB: number;
  allowedFormats: string[];
  passwordProtected?: boolean;
}
