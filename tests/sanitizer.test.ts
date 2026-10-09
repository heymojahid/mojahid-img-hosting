import { describe, it, expect } from 'vitest';
import {
  generateUploadPath,
  isValidUploadPath,
  sanitizeFilenameSlug,
} from '../src/lib/sanitizer';

describe('Filename and Path Sanitizer', () => {
  it('sanitizes messy filenames into clean slugs', () => {
    expect(sanitizeFilenameSlug('My Photo 2026! @#$.png')).toBe('my-photo-2026');
    expect(sanitizeFilenameSlug('hello---world____test.jpg')).toBe('hello-world-test');
    expect(sanitizeFilenameSlug('../../../etc/passwd')).toBe('passwd');
    expect(sanitizeFilenameSlug('   ')).toBe('image'); // fallback when empty
  });

  it('generates non-colliding path under uploads/YYYY/MM/', () => {
    const fixedDate = new Date('2026-10-15T12:00:00Z');
    const result = generateUploadPath('awesome avatar.png', 'image/png', fixedDate);

    expect(result.path).toMatch(/^uploads\/2026\/10\/[a-f0-9]{12}-awesome-avatar\.png$/);
    expect(result.storedName).toMatch(/^[a-f0-9]{12}-awesome-avatar\.png$/);
    expect(result.extension).toBe('.png');
  });

  it('assigns canonical extension based on detected mime rather than dangerous user input', () => {
    const fixedDate = new Date('2026-05-01T00:00:00Z');
    // User named file dangerous.exe, but detected mime is image/jpeg
    const result = generateUploadPath('dangerous.exe', 'image/jpeg', fixedDate);

    expect(result.extension).toBe('.jpg');
    expect(result.storedName.endsWith('.jpg')).toBe(true);
  });

  it('correctly validates legitimate upload paths', () => {
    expect(isValidUploadPath('uploads/2026/10/a1b2c3d4e5f6-banner.png')).toBe(true);
    expect(isValidUploadPath('uploads/2025/01/999999999999-avatar.jpg')).toBe(true);
    expect(isValidUploadPath('uploads/2026/12/33ff1122aacc-image.webp')).toBe(true);
  });

  it('rejects path traversal and unauthorized paths', () => {
    expect(isValidUploadPath('uploads/../../etc/passwd')).toBe(false);
    expect(isValidUploadPath('../uploads/2026/10/file.png')).toBe(false);
    expect(isValidUploadPath('uploads/2026/10/../../../secret.env')).toBe(false);
    expect(isValidUploadPath('uploads/2026/10/file.exe')).toBe(false);
    expect(isValidUploadPath('uploads/2026/10/file.php')).toBe(false);
    expect(isValidUploadPath('/uploads/2026/10/file.png')).toBe(false);
    expect(isValidUploadPath('uploads/2026/1/file.png')).toBe(false); // single digit month
  });
});
