# Storage Architecture

> **Read this before implementing any feature that touches file uploads, downloads, or serving.**

---

## Single-Bucket Model

The app uses a **single S3-compatible bucket** with logical key prefixes to separate content categories:

| Prefix | Type | Purpose | Access pattern |
|--------|------|---------|----------------|
| `attachments/` | `StorageCategory` | Issue attachments | **Always private** — served via presigned GET URLs |
| `media/` | `StorageCategory` | Avatars, team logos | **Private by default** — served via `/api/media/[...key]` proxy with cached presigned URLs; direct public URLs when `STORAGE_PUBLIC_ACCESS=true` |

A single set of credentials (`STORAGE_ACCESS_KEY_ID` / `STORAGE_SECRET_ACCESS_KEY`) controls the whole bucket. This is compatible with **AWS Lightsail**, which enforces Block Public Access by default.

---

## Supported Providers

The storage layer (`src/lib/storage.ts`) auto-detects the provider from whether `STORAGE_ENDPOINT` is set.

### Detection logic

```
STORAGE_ENDPOINT set?
  ├── YES → Custom endpoint mode (MinIO, R2, any S3-compatible)
  │         forcePathStyle: true
  │         endpoint: <value>
  └── NO  → Native AWS mode (AWS S3, Lightsail object storage)
            forcePathStyle: false
            endpoint: AWS SDK resolves automatically from region
```

### Provider cheat-sheet

| Provider | `STORAGE_ENDPOINT` | `STORAGE_PUBLIC_ACCESS` | Notes |
|----------|-------------------|------------------------|-------|
| **MinIO** (local dev) | `http://127.0.0.1:9000` | `true` | Bucket auto-created on startup |
| **MinIO** (Docker Compose) | `http://minio:9000` | `true` | Use `COMPOSE_PROFILES=storage` to bundle |
| **Cloudflare R2** | `https://<account>.r2.cloudflarestorage.com` | `true` (if public) | Set CORS; `STORAGE_PUBLIC_URL` can be a custom domain |
| **AWS S3** | *(not set)* | `false` (default) | Set `STORAGE_REGION`; Block Public Access on by default |
| **Lightsail object storage** | *(not set)* | `false` (default) | Set `STORAGE_REGION`; single key pair per bucket |
| **Other S3-compatible** | `https://...` | depends | Works if the provider supports the S3 API |

---

## Environment Variables

### Minimal configuration (private bucket — AWS S3, Lightsail)

```bash
# Provider type: omit STORAGE_ENDPOINT for AWS S3 / Lightsail
STORAGE_ENDPOINT=                         # empty or absent → native AWS mode
STORAGE_REGION=ap-southeast-1

STORAGE_ACCESS_KEY_ID=AKIA...
STORAGE_SECRET_ACCESS_KEY=...

STORAGE_BUCKET=ui-syncup-storage
# STORAGE_PUBLIC_ACCESS and STORAGE_PUBLIC_URL are NOT needed for private buckets
```

### Public bucket (MinIO, R2 with public policy)

```bash
STORAGE_ENDPOINT=https://<account>.r2.cloudflarestorage.com
STORAGE_REGION=auto

STORAGE_ACCESS_KEY_ID=...
STORAGE_SECRET_ACCESS_KEY=...

STORAGE_BUCKET=ui-syncup-storage
STORAGE_PUBLIC_ACCESS=true
STORAGE_PUBLIC_URL=https://pub-xxxx.r2.dev
```

### Bundled MinIO (Docker Compose)

When `COMPOSE_PROFILES=storage` is set, a MinIO container is started alongside the app:

```bash
COMPOSE_PROFILES=storage

STORAGE_ENDPOINT=http://minio:9000
STORAGE_REGION=us-east-1
STORAGE_ACCESS_KEY_ID=minioadmin
STORAGE_SECRET_ACCESS_KEY=change-me-min-8-chars

STORAGE_BUCKET=ui-syncup-storage
STORAGE_PUBLIC_ACCESS=true
STORAGE_PUBLIC_URL=http://localhost:9000/ui-syncup-storage

# MinIO admin bootstrap (must match credentials above)
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=change-me-min-8-chars
```

### Full variable reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `STORAGE_ENDPOINT` | No | *(native AWS)* | Set for MinIO, R2, or custom S3-compatible endpoints |
| `STORAGE_REGION` | Yes | `us-east-1` | AWS region or `auto` for R2 |
| `STORAGE_ACCESS_KEY_ID` | Yes | — | S3 access key ID |
| `STORAGE_SECRET_ACCESS_KEY` | Yes | — | S3 secret access key |
| `STORAGE_BUCKET` | Yes | — | Single bucket name |
| `STORAGE_PUBLIC_ACCESS` | No | `false` | Set `true` to serve media via direct public URLs instead of the media proxy |
| `STORAGE_PUBLIC_URL` | No | — | Base URL for public object access (required when `STORAGE_PUBLIC_ACCESS=true`) |

---

## Upload Flow

All uploads are **client-direct** — the browser uploads straight to the S3 provider, bypassing the app server. This avoids large request bodies going through Next.js.

```
Browser                  App Server               S3 Provider
  │                          │                         │
  │  POST /api/uploads/      │                         │
  │  presigned  ────────────▶│                         │
  │  (or /media)             │ generateUploadUrl()      │
  │                          │────────────────────────▶│
  │                          │◀── presigned PUT URL ───│
  │◀── { uploadUrl, key } ───│                         │
  │                          │                         │
  │  PUT <uploadUrl>  ───────│────────────────────────▶│
  │  (direct, no app server) │                     object stored
  │                          │                         │
  │  POST /api/issues/       │                         │
  │  {id}/attachments ──────▶│  createAttachment()     │
  │  { url: key, ... }       │  stores raw key in DB   │
  │◀── { attachment } ───────│                         │
```

> **The DB stores the raw storage key** (e.g. `attachments/issues/t1/p1/i1/uuid.png`), not a full URL. URLs are generated server-side on every read.

### File size limits

| Scope | Limit |
|-------|-------|
| Single attachment | 10 MB |
| Total per issue | 50 MB |
| Media (avatar / team logo) | 2 MB |

Allowed media content types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`.

---

## Download / Display Flow

### Attachments (always private)

Attachments are private on all providers. When the attachments list is fetched, the server calls `generateDownloadUrl(key)` for each attachment and returns the presigned URL in the response. The client never accesses S3 directly for attachment content.

```
Browser                  App Server               S3 Provider
  │                          │                         │
  │  GET /api/issues/        │                         │
  │  {id}/attachments ──────▶│                         │
  │                          │  generateDownloadUrl()  │
  │                          │────────────────────────▶│ (per attachment)
  │                          │◀── presigned GET URL ───│
  │◀── { attachments: [      │                         │
  │      { url,              │                         │
  │        downloadUrl,      │                         │
  │        ... }             │                         │
  │    ] } ─────────────────│                         │
  │                          │                         │
  │  GET <downloadUrl> ──────│────────────────────────▶│
  │◀── file bytes ──────────────────────────────────◀│
```

The `IssueAttachment` type exposes `downloadUrl` (presigned GET URL, valid 1 hour). `url` is the raw storage key stored in the DB.

### Media (avatars, logos)

Media is served via the **`/api/media/[...key]`** proxy route:

```
Browser                  App Server               S3 Provider
  │                          │                         │
  │  GET /api/media/         │                         │
  │  media/avatars/u1/x.jpg ▶│                         │
  │                          │                         │
  │                STORAGE_PUBLIC_ACCESS=true?          │
  │                  ├─ YES → 307 to STORAGE_PUBLIC_URL/key
  │                  └─ NO  → getMediaUrl(key)          │
  │                           (cached presigned URL)    │
  │                           ──────────────────────▶   │
  │                           ◀── presigned GET URL ──  │
  │◀── 307 redirect ─────────│                         │
  │  Cache-Control: max-age=79200                       │
  │                          │                         │
  │  GET <redirectTarget> ───│────────────────────────▶│
  │◀── image bytes ─────────────────────────────────◀│
```

- **Public bucket** (`STORAGE_PUBLIC_ACCESS=true`): proxy redirects to `STORAGE_PUBLIC_URL/key` — no S3 API call needed.
- **Private bucket** (default): proxy calls `getMediaUrl(key)`, which returns a presigned GET URL from an **in-memory server cache** (22h TTL). URLs are generated with a 24h expiry. No authentication required to hit the proxy — it only validates that the key starts with `media/`.

Clients always use `/api/media/<key>` as the display URL for avatars and team logos. This URL is stable — bookmarking it works even as underlying presigned URLs rotate.

---

## Core Storage API (`src/lib/storage.ts`)

```typescript
// Logical storage category (not a physical bucket)
type StorageCategory = 'attachments' | 'media'

// Build a full storage key from a category and relative path
buildKey(category: StorageCategory, relativePath: string): string

// Generate a presigned PUT URL for uploading (valid 1 hour)
generateUploadUrl(key: string, contentType: string): Promise<string>

// Generate a presigned GET URL for viewing/downloading (valid 1 hour by default)
generateDownloadUrl(key: string, expiresIn?: number): Promise<string>

// Construct a direct public URL for a key (only meaningful when STORAGE_PUBLIC_ACCESS=true)
getPublicUrl(key: string): string

// Get a cached presigned GET URL for a media key (22h server-side cache)
getMediaUrl(key: string): Promise<string>

// Invalidate the server-side cache entry for a media key (call on update/delete)
invalidateMediaUrl(key: string): void

// Delete an object from storage
deleteFile(key: string): Promise<void>

// Get the configured bucket name (from STORAGE_BUCKET env var)
getBucketName(): string

// Get the shared S3Client instance
getStorageClient(): S3Client
```

---

## API Endpoints

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| `POST` | `/api/uploads/presigned` | Get presigned PUT URL for an issue attachment | Session |
| `POST` | `/api/uploads/media` | Get presigned PUT URL for avatar/team logo | Session |
| `DELETE` | `/api/uploads/media` | Delete an avatar or team logo from storage | Session |
| `GET` | `/api/uploads/presigned/download` | Get presigned GET URL for a private object | Session |
| `GET` | `/api/media/[...key]` | Serve media via redirect (proxy) | None |

### POST /api/uploads/presigned

Request body:
```json
{ "fileName": "screenshot.png", "contentType": "image/png", "issueId": "<uuid>" }
```

Response:
```json
{ "uploadUrl": "https://...", "key": "attachments/issues/..." }
```

> No `publicUrl` in the response — callers store the raw `key` in the DB.

### POST /api/uploads/media

Request body:
```json
{ "fileName": "avatar.jpg", "contentType": "image/jpeg", "type": "avatar|team", "entityId": "<userId|teamId>" }
```

Response:
```json
{ "uploadUrl": "https://...", "key": "media/avatars/...", "maxFileSize": 2097152 }
```

### DELETE /api/uploads/media

Request body:
```json
{ "key": "media/avatars/...", "type": "avatar|team", "entityId": "<userId|teamId>" }
```

### GET /api/uploads/presigned/download

```
GET /api/uploads/presigned/download?key=<key>

Response: { url: "https://..." }
Cache-Control: private, max-age=3600
```

### GET /api/media/[...key]

```
GET /api/media/media/avatars/<userId>/<uuid>.jpg

Response: 307 Temporary Redirect
Location: <presigned-url or STORAGE_PUBLIC_URL path>
Cache-Control: public, max-age=79200, stale-while-revalidate=3600
```

Returns `400` if the key does not start with `media/`.

---

## Object Key Structure

```
# Issue attachments
attachments/issues/{teamId}/{projectId}/{issueId}/{uuid}.{ext}

# Avatars
media/avatars/{userId}/{uuid}.{ext}

# Team logos
media/teams/{teamId}/{uuid}.{ext}
```

The hierarchical structure enables:
- Batch-deleting all attachments for a project (`attachments/issues/{teamId}/{projectId}/`)
- Storage quota calculation per team or project
- Access control validation by checking the key prefix

---

## Attachment Record Fields

| Field | Type | Description |
|-------|------|-------------|
| `url` | `string` | Raw storage key stored in DB (e.g. `attachments/issues/...`) |
| `downloadUrl` | `string \| null` | Presigned GET URL (populated server-side, valid 1 hour) |
| `thumbnailUrl` | `string \| null` | Optional thumbnail key for image attachments |
| `width` | `number \| null` | Image width in pixels |
| `height` | `number \| null` | Image height in pixels |
| `reviewVariant` | `"as_is" \| "to_be" \| "reference"` | Review context tag (default: `as_is`) |
| `annotations` | `AttachmentAnnotation[]` | JSONB array of canvas annotations (max 50) |

---

## Bucket Initialisation

`ensureStorageBucket()` runs on app startup (via `src/instrumentation.ts`). It:

1. Calls `HeadBucket` to check if the bucket exists.
2. If the bucket is missing, attempts to create it — **this only works for MinIO and other self-hosted stores**. For AWS S3 and Lightsail, buckets must be created manually in the console.
3. If `STORAGE_PUBLIC_ACCESS=true`, attempts to set a public-read bucket policy (MinIO / R2 only). For AWS S3 / Lightsail, Block Public Access rejects this — leave `STORAGE_PUBLIC_ACCESS` unset and use the media proxy instead.

---

## Database Migration (existing deployments)

For deployments upgrading from the two-bucket model, run the Drizzle migration `drizzle/0002_storage_single_bucket_keys.sql`. It:

- Strips old full URL prefixes from `issue_attachments.url`, `issue_attachments.thumbnail_url`, `users.image`, and `teams.image`.
- Prepends the appropriate category prefix (`attachments/` or `media/`).
- Is **idempotent** — rows where the value does not start with `http` are skipped, so it is safe to re-run.

---

## Implementing a New Storage Feature

### Uploading a new file type

1. Add an API route under `src/app/api/uploads/` that:
   - Authenticates the user
   - Validates file type and size
   - Generates a key: `buildKey('attachments', 'issues/{teamId}/...')` or `buildKey('media', 'avatars/{userId}/...')`
   - Calls `generateUploadUrl(key, contentType)`
   - Returns `{ uploadUrl, key }`

2. On the client, upload directly via `PUT <uploadUrl>` with `Content-Type` header.

3. Store the raw `key` in the database.

### Displaying a private attachment

Use `generateDownloadUrl(key)` server-side and pass the presigned URL to the client. Do **not** use the stored `key` directly as an `<img src>` or download link — it will 403.

### Displaying media (avatars, logos)

Use `/api/media/${key}` as the `<img src>`. The proxy handles both public and private buckets transparently — no per-component logic needed.

Call `invalidateMediaUrl(key)` whenever a media object is replaced or deleted so the next request generates a fresh URL.

### CORS requirements

Presigned PUT upload URLs require the S3 provider to allow cross-origin PUT requests from your app's origin. Configure CORS on the bucket if uploads fail with CORS errors:

- **R2**: Dashboard → Bucket → Settings → CORS Policy
- **MinIO**: `mc admin config set local api cors_allow_origin="http://localhost:3000"`
- **AWS S3 / Lightsail**: Bucket → Permissions → CORS configuration

Minimum required CORS rule:
```json
[{
  "AllowedOrigins": ["https://yourdomain.com"],
  "AllowedMethods": ["PUT"],
  "AllowedHeaders": ["Content-Type"],
  "ExposeHeaders": ["ETag"]
}]
```

---

## Block Public Access and Lightsail

Lightsail object storage (and AWS S3) enables Block Public Access by default. This means:

- Bucket policies that grant `s3:GetObject` to `*` are rejected
- Direct object URLs return 403 for unauthenticated requests
- Presigned URLs (signed with valid credentials) still work regardless of Block Public Access

The single-bucket model is designed with this as the **default**. Do not set `STORAGE_PUBLIC_ACCESS=true` on Lightsail or AWS S3. The media proxy (`/api/media/[...key]`) handles serving avatars and logos via cached presigned URLs automatically.

> **Note for Lightsail**: Each Lightsail bucket has a **single access key pair** (unlike the old two-bucket setup). Supply it via `STORAGE_ACCESS_KEY_ID` and `STORAGE_SECRET_ACCESS_KEY`. Do **not** set `STORAGE_ENDPOINT` — the AWS SDK resolves the endpoint automatically from the region.
