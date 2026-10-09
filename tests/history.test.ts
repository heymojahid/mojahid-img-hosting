import { describe, it, expect, beforeEach } from 'vitest';
import {
  getUploadHistory,
  addUploadToHistory,
  removeUploadFromHistory,
  clearUploadHistory,
} from '../src/lib/history';
import { UploadResultData } from '../src/lib/types';

describe('Upload History Manager', () => {
  let mockStore: Record<string, string> = {};

  beforeEach(() => {
    mockStore = {};
    const mockLocalStorage = {
      getItem: (key: string) => mockStore[key] || null,
      setItem: (key: string, val: string) => {
        mockStore[key] = val;
      },
      removeItem: (key: string) => {
        delete mockStore[key];
      },
      clear: () => {
        mockStore = {};
      },
    };

    Object.defineProperty(globalThis, 'window', {
      value: globalThis,
      writable: true,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });
  });

  it('returns empty array when history is empty', () => {
    expect(getUploadHistory()).toEqual([]);
  });

  it('adds an uploaded image to history', () => {
    const mockUpload: UploadResultData = {
      name: 'banner.png',
      storedName: '2610-abcd1234.png',
      path: 'uploads/2026/10/2610-abcd1234.png',
      size: 1024 * 500,
      mimeType: 'image/png',
      sha: 'sha-1234',
      directUrl: 'https://raw.github.com/...',
      customDomainUrl: 'https://img.mojahidx.com/i/2610-abcd1234.png',
      proxyUrl: '/i/2610-abcd1234.png',
      uploadedAt: '2026-10-09T12:00:00Z',
    };

    const history = addUploadToHistory(mockUpload);
    expect(history).toHaveLength(1);
    expect(history[0].name).toBe('banner.png');
    expect(history[0].url).toBe('https://img.mojahidx.com/i/2610-abcd1234.png');
    expect(history[0].category).toBe('image');
  });

  it('adds an uploaded file (e.g. APK or EXE) to history', () => {
    const mockFile: UploadResultData = {
      name: 'setup.exe',
      storedName: '2610-eeee4444.exe',
      path: 'uploads/2026/10/2610-eeee4444.exe',
      size: 1024 * 1024 * 15,
      mimeType: 'application/x-msdownload',
      sha: 'sha-5678',
      directUrl: 'https://raw.github.com/...',
      customDomainUrl: 'https://img.mojahidx.com/i/2610-eeee4444.exe',
      proxyUrl: '/i/2610-eeee4444.exe',
      uploadedAt: '2026-10-09T13:00:00Z',
      category: 'file',
    };

    const history = addUploadToHistory(mockFile);
    expect(history).toHaveLength(1);
    expect(history[0].name).toBe('setup.exe');
    expect(history[0].category).toBe('file');
  });

  it('deduplicates existing entries with the same storedName', () => {
    const mockUpload: UploadResultData = {
      name: 'doc.pdf',
      storedName: '2610-99998888.pdf',
      path: 'uploads/2026/10/2610-99998888.pdf',
      size: 50000,
      mimeType: 'application/pdf',
      sha: 'sha-pdf-1',
      directUrl: 'https://raw.github.com/...',
      customDomainUrl: 'https://img.mojahidx.com/i/2610-99998888.pdf',
      proxyUrl: '/i/2610-99998888.pdf',
      uploadedAt: '2026-10-09T14:00:00Z',
      category: 'file',
    };

    addUploadToHistory(mockUpload);
    const updated = addUploadToHistory(mockUpload);
    expect(updated).toHaveLength(1);
  });

  it('removes item from history by id', () => {
    const mockUpload: UploadResultData = {
      name: 'item.png',
      storedName: '2610-11112222.png',
      path: 'uploads/2026/10/2610-11112222.png',
      size: 2000,
      mimeType: 'image/png',
      sha: 'sha-unique-id',
      directUrl: 'https://raw.github.com/...',
      customDomainUrl: 'https://img.mojahidx.com/i/2610-11112222.png',
      proxyUrl: '/i/2610-11112222.png',
      uploadedAt: '2026-10-09T15:00:00Z',
    };

    addUploadToHistory(mockUpload);
    const afterRemoval = removeUploadFromHistory('sha-unique-id');
    expect(afterRemoval).toHaveLength(0);
  });

  it('clears all items from history', () => {
    const mockUpload: UploadResultData = {
      name: 'test.zip',
      storedName: '2610-33334444.zip',
      path: 'uploads/2026/10/2610-33334444.zip',
      size: 8000,
      mimeType: 'application/zip',
      sha: 'sha-zip-id',
      directUrl: 'https://raw.github.com/...',
      customDomainUrl: 'https://img.mojahidx.com/i/2610-33334444.zip',
      proxyUrl: '/i/2610-33334444.zip',
      uploadedAt: '2026-10-09T16:00:00Z',
    };

    addUploadToHistory(mockUpload);
    clearUploadHistory();
    expect(getUploadHistory()).toEqual([]);
  });
});
