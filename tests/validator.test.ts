import { describe, it, expect } from 'vitest';
import { detectFileSignature, validateImageFile, validateGeneralFile } from '../src/lib/validator';
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

  // Tests for General File Upload (APK, AAB, PDF, PLP, ZIP)
  it('validates APK files properly', () => {
    const fakeApk = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00]); // zip/apk header
    const validation = validateGeneralFile(fakeApk, 'awesome-game.apk', 'application/vnd.android.package-archive');
    expect(validation.valid).toBe(true);
    expect(validation.extension).toBe('.apk');
  });

  it('validates AAB and PLP files properly', () => {
    const fakeBuffer = new Uint8Array(64);
    const aabValidation = validateGeneralFile(fakeBuffer, 'bundle.aab', 'application/octet-stream');
    expect(aabValidation.valid).toBe(true);
    expect(aabValidation.extension).toBe('.aab');

    const plpValidation = validateGeneralFile(fakeBuffer, 'project-design.plp', 'application/octet-stream');
    expect(plpValidation.valid).toBe(true);
    expect(plpValidation.extension).toBe('.plp');
  });

  it('validates PDF files properly', () => {
    const fakePdf = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF
    const validation = validateGeneralFile(fakePdf, 'invoice.pdf', 'application/pdf');
    expect(validation.valid).toBe(true);
    expect(validation.extension).toBe('.pdf');
  });

  it('validates EXE and MSI files properly', () => {
    const fakeBuffer = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]);
    const exeValidation = validateGeneralFile(fakeBuffer, 'setup.exe', 'application/x-msdownload');
    expect(exeValidation.valid).toBe(true);
    expect(exeValidation.extension).toBe('.exe');
    expect(exeValidation.detectedMimeType).toBe('application/x-msdownload');

    const msiValidation = validateGeneralFile(fakeBuffer, 'installer.msi', 'application/x-msi');
    expect(msiValidation.valid).toBe(true);
    expect(msiValidation.extension).toBe('.msi');
    expect(msiValidation.detectedMimeType).toBe('application/x-msi');
  });

  it('rejects dangerous scripts in general file validation', () => {
    const fakeBuffer = new Uint8Array(32);
    const phpValidation = validateGeneralFile(fakeBuffer, 'shell.php', 'text/x-php');
    expect(phpValidation.valid).toBe(false);
    expect(phpValidation.error).toContain('prohibited');

    const batValidation = validateGeneralFile(fakeBuffer, 'script.bat', 'application/x-bat');
    expect(batValidation.valid).toBe(false);
    expect(batValidation.error).toContain('prohibited');
  });
});
