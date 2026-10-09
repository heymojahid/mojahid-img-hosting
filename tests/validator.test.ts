import { describe, it, expect } from 'vitest';
import { detectFileSignature, validateImageFile } from '../src/lib/validator';
import { MAGIC_NUMBERS, PROHIBITED_SIGNATURES } from '../src/lib/constants';

describe('File Validator', () => {
  // Helper to construct byte buffers
  const makeBuffer = (header: readonly number[], extraBytes: number = 32): Uint8Array => {
    const buf = new Uint8Array(header.length + extraBytes);
    buf.set(header);
    return buf;
  };

  it('detects valid PNG magic bytes', () => {
    const pngBuf = makeBuffer(MAGIC_NUMBERS.PNG);
    expect(detectFileSignature(pngBuf)).toBe('image/png');
  });

  it('detects valid JPEG magic bytes', () => {
    const jpgBuf = makeBuffer(MAGIC_NUMBERS.JPEG);
    expect(detectFileSignature(jpgBuf)).toBe('image/jpeg');
  });

  it('detects valid GIF87a and GIF89a magic bytes', () => {
    const gif87 = makeBuffer(MAGIC_NUMBERS.GIF87A);
    expect(detectFileSignature(gif87)).toBe('image/gif');

    const gif89 = makeBuffer(MAGIC_NUMBERS.GIF89A);
    expect(detectFileSignature(gif89)).toBe('image/gif');
  });

  it('detects valid WebP magic bytes with RIFF and WEBP markers', () => {
    const webpBuf = new Uint8Array(16);
    webpBuf.set(MAGIC_NUMBERS.WEBP_RIFF, 0); // RIFF at 0
    webpBuf.set([0x00, 0x10, 0x00, 0x00], 4); // file size
    webpBuf.set(MAGIC_NUMBERS.WEBP_TAG, 8); // WEBP at 8
    expect(detectFileSignature(webpBuf)).toBe('image/webp');
  });

  it('rejects executable binary signatures (PE MZ, ELF)', () => {
    const exeBuf = makeBuffer(PROHIBITED_SIGNATURES.DOS_MZ);
    expect(detectFileSignature(exeBuf)).toBeNull();

    const elfBuf = makeBuffer(PROHIBITED_SIGNATURES.ELF);
    expect(detectFileSignature(elfBuf)).toBeNull();
  });

  it('rejects SVG files containing <svg or XML headers', () => {
    const svgText = '<svg xmlns="http://www.w3.org/2000/svg"><circle r="10"/></svg>';
    const svgBuf = new TextEncoder().encode(svgText);
    expect(detectFileSignature(svgBuf)).toBeNull();

    const validation = validateImageFile(svgBuf, 'image/svg+xml');
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('SVG files are not permitted');
  });

  it('rejects SVG disguised as image/png', () => {
    const svgText = '<?xml version="1.0"?><svg viewBox="0 0 100 100"><script>alert(1)</script></svg>';
    const svgBuf = new TextEncoder().encode(svgText);
    const validation = validateImageFile(svgBuf, 'image/png');
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('Invalid file signature');
  });

  it('rejects HTML disguised as an image', () => {
    const htmlText = '<!DOCTYPE html><html><body><h1>Exploit</h1></body></html>';
    const htmlBuf = new TextEncoder().encode(htmlText);
    const validation = validateImageFile(htmlBuf, 'image/jpeg');
    expect(validation.valid).toBe(false);
  });

  it('rejects files exceeding the size limit', () => {
    const pngBuf = makeBuffer(MAGIC_NUMBERS.PNG, 100);
    const maxLimit = 50; // 50 bytes limit for test
    const validation = validateImageFile(pngBuf, 'image/png', maxLimit);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('exceeds the maximum allowed limit');
  });

  it('rejects MIME type mismatches (e.g. PNG bytes with declared JPEG mime)', () => {
    const pngBuf = makeBuffer(MAGIC_NUMBERS.PNG);
    const validation = validateImageFile(pngBuf, 'image/jpeg');
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('MIME type mismatch');
  });

  it('successfully validates legitimate PNG buffer', () => {
    const pngBuf = makeBuffer(MAGIC_NUMBERS.PNG);
    const validation = validateImageFile(pngBuf, 'image/png');
    expect(validation.valid).toBe(true);
    expect(validation.detectedMimeType).toBe('image/png');
  });
});
