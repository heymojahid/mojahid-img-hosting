import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isR2Configured, getR2Config, buildR2DirectUrl } from '../src/lib/r2';
import { chooseStorageProvider, getSystemStorageStatus } from '../src/lib/storage';

describe('Cloudflare R2 Configuration & Storage Routing', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('isR2Configured', () => {
    it('returns false when R2 environment variables are missing', () => {
      delete process.env.R2_ACCOUNT_ID;
      delete process.env.R2_ACCESS_KEY_ID;
      delete process.env.R2_SECRET_ACCESS_KEY;
      delete process.env.R2_BUCKET_NAME;

      expect(isR2Configured()).toBe(false);
    });

    it('returns true when all required R2 environment variables are present', () => {
      process.env.R2_ACCOUNT_ID = 'test_account_123';
      process.env.R2_ACCESS_KEY_ID = 'test_access_key';
      process.env.R2_SECRET_ACCESS_KEY = 'test_secret_key';
      process.env.R2_BUCKET_NAME = 'my-r2-bucket';

      expect(isR2Configured()).toBe(true);
    });
  });

  describe('getR2Config', () => {
    it('throws descriptive error if required R2 vars are missing', () => {
      delete process.env.R2_ACCOUNT_ID;
      delete process.env.R2_ACCESS_KEY_ID;
      delete process.env.R2_SECRET_ACCESS_KEY;
      delete process.env.R2_BUCKET_NAME;

      expect(() => getR2Config()).toThrow(/Missing required Cloudflare R2 environment variables/);
    });

    it('returns parsed config with custom and default limits', () => {
      process.env.R2_ACCOUNT_ID = 'acc_123';
      process.env.R2_ACCESS_KEY_ID = 'key_123';
      process.env.R2_SECRET_ACCESS_KEY = 'sec_123';
      process.env.R2_BUCKET_NAME = 'bucket_123';
      process.env.R2_PUBLIC_URL = 'https://pub-xyz.r2.dev';
      process.env.R2_MAX_FILE_SIZE_MB = '250';

      const config = getR2Config();
      expect(config.accountId).toBe('acc_123');
      expect(config.bucketName).toBe('bucket_123');
      expect(config.publicUrl).toBe('https://pub-xyz.r2.dev');
      expect(config.maxFileSizeBytes).toBe(250 * 1024 * 1024);
    });
  });

  describe('buildR2DirectUrl', () => {
    it('builds direct CDN URL when publicUrl is present', () => {
      const config = {
        accountId: 'acc',
        accessKeyId: 'key',
        secretAccessKey: 'sec',
        bucketName: 'bucket',
        publicUrl: 'https://files.example.com/',
        maxFileSizeBytes: 500 * 1024 * 1024,
      };

      const url = buildR2DirectUrl(config, 'uploads/2026/10/app.apk');
      expect(url).toBe('https://files.example.com/uploads/2026/10/app.apk');
    });

    it('falls back to relative path if publicUrl is absent', () => {
      const config = {
        accountId: 'acc',
        accessKeyId: 'key',
        secretAccessKey: 'sec',
        bucketName: 'bucket',
        maxFileSizeBytes: 500 * 1024 * 1024,
      };

      const url = buildR2DirectUrl(config, 'uploads/2026/10/app.apk');
      expect(url).toBe('/uploads/2026/10/app.apk');
    });
  });

  describe('chooseStorageProvider', () => {
    beforeEach(() => {
      // Set both GitHub and R2 configured
      process.env.GITHUB_OWNER = 'mojahid';
      process.env.GITHUB_TOKEN = 'gh_token';
      process.env.R2_ACCOUNT_ID = 'acc';
      process.env.R2_ACCESS_KEY_ID = 'key';
      process.env.R2_SECRET_ACCESS_KEY = 'sec';
      process.env.R2_BUCKET_NAME = 'bucket';
    });

    it('routes big files (APK, EXE, MSI, ZIP, ISO) to Cloudflare R2', () => {
      expect(chooseStorageProvider('file', '.apk', 50 * 1024 * 1024)).toBe('r2');
      expect(chooseStorageProvider('file', '.exe', 80 * 1024 * 1024)).toBe('r2');
      expect(chooseStorageProvider('file', '.msi', 30 * 1024 * 1024)).toBe('r2');
      expect(chooseStorageProvider('file', '.zip', 120 * 1024 * 1024)).toBe('r2');
      expect(chooseStorageProvider('file', '.iso', 400 * 1024 * 1024)).toBe('r2');
    });

    it('routes files above GitHub 25MB limit to Cloudflare R2 even if category is image', () => {
      expect(chooseStorageProvider('image', '.png', 30 * 1024 * 1024)).toBe('r2');
    });

    it('routes standard images under 25MB to GitHub', () => {
      expect(chooseStorageProvider('image', '.png', 2 * 1024 * 1024)).toBe('github');
      expect(chooseStorageProvider('image', '.jpg', 5 * 1024 * 1024)).toBe('github');
    });
  });

  describe('createR2PresignedUploadUrl', () => {
    it('generates a signed S3 upload URL with correct endpoint and bucket key', async () => {
      const config = {
        accountId: '1c58da51bedefd013248aac9c3d16384',
        accessKeyId: 'test_access_key',
        secretAccessKey: 'test_secret_key',
        bucketName: 'mojahid-files',
        maxFileSizeBytes: 500 * 1024 * 1024,
      };

      const { createR2PresignedUploadUrl } = await import('../src/lib/r2');
      const presignedUrl = await createR2PresignedUploadUrl(
        config,
        'uploads/2026/10/app.apk',
        'application/vnd.android.package-archive',
        1800
      );

      expect(presignedUrl).toContain('mojahid-files.1c58da51bedefd013248aac9c3d16384.r2.cloudflarestorage.com/uploads/2026/10/app.apk');
      expect(presignedUrl).toContain('X-Amz-Signature');
    });
  });
});


