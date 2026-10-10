import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { DEFAULT_R2_MAX_FILE_SIZE_BYTES } from './constants';
import { R2Config } from './types';

/**
 * Checks if the required Cloudflare R2 environment variables are present.
 */
export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID?.trim() &&
    process.env.R2_ACCESS_KEY_ID?.trim() &&
    process.env.R2_SECRET_ACCESS_KEY?.trim() &&
    process.env.R2_BUCKET_NAME?.trim()
  );
}

/**
 * Reads Cloudflare R2 configuration from server-side environment variables.
 * Throws a helpful descriptive error if required values are missing.
 */
export function getR2Config(): R2Config {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucketName = process.env.R2_BUCKET_NAME?.trim();
  const publicUrl = process.env.R2_PUBLIC_URL?.trim();

  const maxFileSizeBytes = process.env.R2_MAX_FILE_SIZE_MB
    ? parseInt(process.env.R2_MAX_FILE_SIZE_MB, 10) * 1024 * 1024
    : process.env.R2_MAX_FILE_SIZE_BYTES
    ? parseInt(process.env.R2_MAX_FILE_SIZE_BYTES, 10)
    : DEFAULT_R2_MAX_FILE_SIZE_BYTES;

  const missing: string[] = [];
  if (!accountId) missing.push('R2_ACCOUNT_ID');
  if (!accessKeyId) missing.push('R2_ACCESS_KEY_ID');
  if (!secretAccessKey) missing.push('R2_SECRET_ACCESS_KEY');
  if (!bucketName) missing.push('R2_BUCKET_NAME');

  if (missing.length > 0) {
    throw new Error(
      `Missing required Cloudflare R2 environment variables: ${missing.join(', ')}. Please configure them in your server environment.`
    );
  }

  return {
    accountId: accountId!,
    accessKeyId: accessKeyId!,
    secretAccessKey: secretAccessKey!,
    bucketName: bucketName!,
    publicUrl: publicUrl || undefined,
    maxFileSizeBytes,
  };
}

let cachedS3Client: { client: S3Client; key: string } | null = null;

/**
 * Returns an S3Client instance configured for Cloudflare R2.
 */
export function getR2Client(config?: R2Config): S3Client {
  const conf = config || getR2Config();
  const cacheKey = `${conf.accountId}:${conf.accessKeyId}`;

  if (cachedS3Client && cachedS3Client.key === cacheKey) {
    return cachedS3Client.client;
  }

  const endpoint = `https://${conf.accountId}.r2.cloudflarestorage.com`;

  const client = new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId: conf.accessKeyId,
      secretAccessKey: conf.secretAccessKey,
    },
  });

  cachedS3Client = { client, key: cacheKey };
  return client;
}

/**
 * Creates a presigned PUT URL allowing clients to upload directly to Cloudflare R2.
 * This completely bypasses Vercel/serverless payload body limits (4.5 MB).
 */
export async function createR2PresignedUploadUrl(
  config: R2Config,
  path: string,
  contentType: string,
  expiresInSeconds: number = 1800 // 30 minutes
): Promise<string> {
  const client = getR2Client(config);
  const cleanKey = path.replace(/^\/+/, '');

  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: cleanKey,
    ContentType: contentType,
  });

  return await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

export interface R2UploadResult {
  etag?: string;
  key: string;
}

/**
 * Uploads a buffer directly to Cloudflare R2 server-to-server.
 */
export async function uploadToR2(
  config: R2Config,
  path: string,
  buffer: Uint8Array | Buffer,
  contentType: string
): Promise<R2UploadResult> {
  const client = getR2Client(config);
  const cleanKey = path.replace(/^\/+/, '');

  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: cleanKey,
    Body: buffer,
    ContentType: contentType,
  });

  const response = await client.send(command);

  return {
    etag: response.ETag?.replace(/"/g, ''),
    key: cleanKey,
  };
}

/**
 * Fetches an object stream from Cloudflare R2.
 */
export async function getR2Object(config: R2Config, path: string) {
  const client = getR2Client(config);
  const cleanKey = path.replace(/^\/+/, '');

  const command = new GetObjectCommand({
    Bucket: config.bucketName,
    Key: cleanKey,
  });

  return await client.send(command);
}

/**
 * Checks whether an object exists in Cloudflare R2.
 */
export async function checkR2ObjectExists(
  config: R2Config,
  path: string
): Promise<boolean> {
  try {
    const client = getR2Client(config);
    const cleanKey = path.replace(/^\/+/, '');

    const command = new HeadObjectCommand({
      Bucket: config.bucketName,
      Key: cleanKey,
    });

    await client.send(command);
    return true;
  } catch {
    return false;
  }
}

/**
 * Builds the direct public URL for a file stored on Cloudflare R2.
 * If R2_PUBLIC_URL is configured (e.g. https://pub-xxx.r2.dev or https://dl.mojahidx.com),
 * returns the direct CDN URL.
 */
export function buildR2DirectUrl(config: R2Config, path: string): string {
  const cleanKey = path.replace(/^\/+/, '');

  if (config.publicUrl && config.publicUrl.trim()) {
    const cleanBase = config.publicUrl.trim().replace(/\/+$/, '');
    return `${cleanBase}/${cleanKey}`;
  }

  // Fallback if no public domain attached: use app proxy
  return `/${cleanKey}`;
}
