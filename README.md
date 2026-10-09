# MojahidX Image Hosting

> **Production-ready, resilient image hosting web application powered by Next.js App Router, GitHub REST Contents API, and Vercel Edge caching.**

[![Next.js](https://img.shields.io/badge/Next.js-16.4-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Tested_with-Vitest-6e9f18?logo=vitest)](https://vitest.dev/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com/)

---

## 📑 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Security Architecture](#security-architecture)
3. [Image Repository Setup Guide](#image-repository-setup-guide)
4. [GitHub Fine-Grained Token Setup](#github-fine-grained-token-setup)
5. [Environment Variables](#environment-variables)
6. [Local Development](#local-development)
7. [Automated Testing](#automated-testing)
8. [Vercel Deployment & Custom Domain](#vercel-deployment--custom-domain)
9. [Direct URLs vs Image Proxy vs Vercel Rewrites](#direct-urls-vs-image-proxy-vs-vercel-rewrites)
10. [API Reference](#api-reference)

---

## Architecture Overview

MojahidX Image Hosting decouples image presentation from persistent storage by using a dedicated public GitHub repository as an immutable object store:

```
[ Client Browser ]
        │  (Multipart Form-Data)
        ▼
[ Next.js API: POST /api/upload ]
   ├─ 1. IP Sliding Window Rate Limiter
   ├─ 2. Magic-Byte Binary Signature Validation (PNG, JPEG, WebP, GIF)
   ├─ 3. Anti-XSS & Executable Rejection (SVG, HTML, MZ, ELF, scripts)
   ├─ 4. Cryptographic Unique Slug Generation (uploads/YYYY/MM/<id>-<name>.<ext>)
   ├─ 5. Base64 Binary Encoding
   └─ 6. GitHub REST Contents API (PUT /repos/{owner}/{repo}/contents/{path})
              │
              ▼  (HTTP 201 Created with Blob SHA)
      [ GitHub Image Repository: mojahidx-image-hosting ]
              │
              ├─────────────────────────────────────────┐
              ▼                                         ▼
   [ Direct Raw GitHub URL ]               [ Edge Cached Image Proxy ]
   raw.githubusercontent.com/...           img.mojahidx.com/uploads/...
                                           (Cache-Control: immutable, 1 year)
```

### Key Principles

- **Zero Token Exposure:** All GitHub API credentials reside solely in server-side environment variables. No token is ever emitted in client bundles, network payloads, error logs, or API responses.
- **Strict Verification:** Upload confirmation is returned to the user only after GitHub returns an HTTP 201 Created response containing the commit blob SHA.
- **Non-Colliding Immutable Paths:** Images are placed under `uploads/YYYY/MM/` with a 12-character cryptographic random hash and sanitized slug.

---

## Security Architecture

### 1. Magic Byte Signature Verification
MIME types declared in HTTP headers are easily spoofed. MojahidX inspects the raw binary bytes of every uploaded file:
- **PNG:** `0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A`
- **JPEG:** `0xFF 0xD8 0xFF`
- **GIF:** `0x47 0x49 0x46 0x38 0x37 0x61` (GIF87a) or `0x47 0x49 0x46 0x38 0x39 0x61` (GIF89a)
- **WebP:** `RIFF` (offset 0) and `WEBP` (offset 8)

### 2. SVG & Script Rejection (XSS Defense)
SVG files can carry executable JavaScript (`<script>`, `onload=`, entity expansions) and constitute a persistent stored Cross-Site Scripting (XSS) risk when served on web domains. MojahidX strictly rejects all SVGs, XML documents, and HTML files, whether declared via MIME type or hidden inside file payloads.

### 3. Binary Executable Rejection
Prohibits DOS/PE binaries (`MZ`), Linux ELF files (`\x7fELF`), Java bytecode (`0xCAFEBABE`), and Unix shebangs (`#!`).

### 4. Path Traversal Defense
Incoming filenames are stripped of directory separators (`/`, `\`, `..`), control characters, and non-printable characters. Route proxy handlers enforce strict regex matching (`^uploads/\d{4}/\d{2}/[a-zA-Z0-9_\-\.]+\.(png|jpg|jpeg|webp|gif)$`), making directory traversal impossible.

### 5. Rate Limiting
A built-in sliding window rate limiter protects server routes against spam and brute-force uploads, providing standard `Retry-After` and `X-RateLimit-*` headers.

---

## Image Repository Setup Guide

To store uploaded images, create a dedicated GitHub repository:

1. Log into your GitHub account at [github.com](https://github.com).
2. Click **New Repository** (or visit [github.com/new](https://github.com/new)).
3. Set **Repository name** to: `mojahidx-image-hosting`
4. Set visibility to **Public** (recommended for direct raw CDN access, or Private if using the authenticated edge proxy).
5. Check **Add a README file** to initialize the `main` branch.
6. Click **Create repository**.

---

## GitHub Fine-Grained Token Setup

Do **not** use classic Personal Access Tokens with broad account scopes. Use a modern **Fine-grained Personal Access Token**:

1. Go to **Settings** &rarr; **Developer Settings** &rarr; **Personal access tokens** &rarr; [Fine-grained tokens](https://github.com/settings/personal-access-tokens/new).
2. Set **Token name**: `MojahidX Image Hosting Upload Token`
3. Set **Expiration**: Choose your desired expiration (e.g. 90 days or 1 year with calendar renewal).
4. Under **Repository access**:
   - Select **Only select repositories**
   - In the dropdown, choose **`mojahidx-image-hosting`**
5. Under **Repository permissions**:
   - Find **Contents**
   - Change Access from *No access* to **Read and write**
6. Leave all Account permissions as *No access*.
7. Click **Generate token**.
8. Copy the token string (starts with `github_pat_...`). **Save this token securely; GitHub will not show it again.**

---

## Environment Variables

Copy `.env.example` to `.env.local` for local development:

```bash
cp .env.example .env.local
```

| Variable | Required | Default | Description |
| :--- | :---: | :---: | :--- |
| `GITHUB_OWNER` | **Yes** | — | Your GitHub username or organization (e.g. `heymojahid`). |
| `GITHUB_REPO` | **Yes** | `mojahidx-image-hosting` | The target image storage repository name. |
| `GITHUB_BRANCH` | No | `main` | Target git branch. |
| `GITHUB_TOKEN` | **Yes** | — | Fine-grained PAT with `Contents: Read and write`. |
| `PUBLIC_IMAGE_BASE_URL` | No | *(raw GitHub URL)* | Custom domain base URL (e.g. `https://img.mojahidx.com`). |
| `MAX_FILE_SIZE_MB` | No | `5` | Maximum upload size per image in MB. |
| `RATE_LIMIT_MAX_REQUESTS` | No | `25` | Maximum upload requests allowed per IP window. |
| `RATE_LIMIT_WINDOW_SECONDS` | No | `600` | Sliding rate limit window duration in seconds (10 min). |

---

## Local Development

Ensure you have **Node.js 20+** installed.

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local with your GITHUB_OWNER and GITHUB_TOKEN

# 3. Run development server
npm run dev

# 4. Open browser
# Visit http://localhost:3000
```

---

## Automated Testing

MojahidX includes unit and integration tests using Vitest:

```bash
# Run test suite
npm test
```

Test coverage includes:
- Binary magic bytes detection for PNG, JPEG, WebP, and GIF.
- SVG, XML, HTML, and executable binary rejection.
- Filename slug sanitization and directory traversal defense.
- Year/month non-colliding path generation (`uploads/YYYY/MM/...`).
- Raw GitHub URI encoding and custom domain URL building.
- Sliding window IP rate limiter behavior and resets.

---

## Vercel Deployment & Custom Domain

### Deploying the App to Vercel

1. Push your app repository to GitHub (e.g., `heymojahid/mojahid-img-hosting`).
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository.
3. In **Configure Project**, expand **Environment Variables** and add:
   - `GITHUB_OWNER`: your GitHub username
   - `GITHUB_REPO`: `mojahidx-image-hosting`
   - `GITHUB_BRANCH`: `main`
   - `GITHUB_TOKEN`: `github_pat_...`
   - `PUBLIC_IMAGE_BASE_URL`: `https://img.mojahidx.com` (once custom domain is ready)
4. Click **Deploy**.

### Setting Up Custom Domain (`img.mojahidx.com`)

1. In the Vercel Dashboard, go to your project &rarr; **Settings** &rarr; **Domains**.
2. Enter `img.mojahidx.com` and click **Add**.
3. In your DNS provider (Cloudflare, Namecheap, Route 53, GoDaddy, etc.):
   - Add a **CNAME** record:
     - **Type:** `CNAME`
     - **Name:** `img`
     - **Target / Value:** `cname.vercel-dns.com`
     - **TTL:** Auto or 3600
4. Vercel automatically provisions a free Let's Encrypt SSL/TLS certificate once the DNS record propagates.

---

## Direct URLs vs Image Proxy vs Vercel Rewrites

MojahidX implements two complementary image delivery pathways:

### Option A: Direct Raw GitHub CDN
- **Format:** `https://raw.githubusercontent.com/{owner}/{repo}/{branch}/uploads/YYYY/MM/{id}-{name}.{ext}`
- **Pros:** Zero load on your Vercel serverless function; hosted globally across Fastly/GitHub CDN.
- **Caveats:** GitHub raw returns `Cache-Control: max-age=300` (5 minutes) because branch tips are theoretically mutable.

### Option B: High-Performance Edge Streaming Proxy (`/uploads/*`)
- **Format:** `https://img.mojahidx.com/uploads/YYYY/MM/{id}-{name}.{ext}`
- **Why an image proxy route was implemented over a plain Vercel rewrite:**
  1. **Immutable 1-Year Caching:** Because MojahidX filenames use cryptographic unique hashes, the route sets `Cache-Control: public, max-age=31536000, s-maxage=31536000, immutable`. Vercel Edge nodes cache the image globally, drastically reducing latency for repeat requests.
  2. **CORS & Hotlinking Headers:** Injects `Access-Control-Allow-Origin: *` to enable embedding anywhere without CORS blocks.
  3. **Path Traversal Protection:** The proxy strictly parses and validates that every requested path strictly conforms to `uploads/YYYY/MM/...` before fetching upstream.
  4. **Support for Private Storage:** If you choose to keep `mojahidx-image-hosting` private, the proxy attaches the server-side `GITHUB_TOKEN` to stream images publicly without ever leaking the token to clients.
  5. **ETag & 304 Handling:** Revalidates with upstream and responds with `304 Not Modified` when appropriate.

---

## API Reference

### 1. Upload Image
`POST /api/upload`

**Headers:**
`Content-Type: multipart/form-data`

**Form Body:**
- `file`: Image binary (`PNG`, `JPEG`, `WebP`, or `GIF` &le; 5 MB)

**Response (HTTP 201 Created):**
```json
{
  "success": true,
  "file": {
    "name": "example-photo.png",
    "storedName": "4f9a12c8b0e1-example-photo.png",
    "path": "uploads/2026/10/4f9a12c8b0e1-example-photo.png",
    "size": 341250,
    "mimeType": "image/png",
    "sha": "9b12a83f9821415f33e085188fca9b14292185aa",
    "directUrl": "https://raw.githubusercontent.com/heymojahid/mojahidx-image-hosting/main/uploads/2026/10/4f9a12c8b0e1-example-photo.png",
    "customDomainUrl": "https://img.mojahidx.com/uploads/2026/10/4f9a12c8b0e1-example-photo.png",
    "proxyUrl": "/uploads/2026/10/4f9a12c8b0e1-example-photo.png",
    "uploadedAt": "2026-10-09T14:00:00.000Z"
  }
}
```

### 2. System Status Check
`GET /api/status`

**Response (HTTP 200 OK):**
```json
{
  "configured": true,
  "owner": "heymojahid",
  "repo": "mojahidx-image-hosting",
  "branch": "main",
  "customDomainEnabled": true,
  "publicBaseUrl": "https://img.mojahidx.com",
  "maxFileSizeMB": 5,
  "allowedFormats": ["PNG", "JPEG", "WebP", "GIF"]
}
```

### 3. Edge Image Proxy
`GET /uploads/:year/:month/:filename`

Streams image with:
```http
HTTP/1.1 200 OK
Content-Type: image/png
Cache-Control: public, max-age=31536000, s-maxage=31536000, immutable
Access-Control-Allow-Origin: *
X-Content-Type-Options: nosniff
```

---

## License

MIT &bull; Crafted with precision for high-performance developer workflows.
