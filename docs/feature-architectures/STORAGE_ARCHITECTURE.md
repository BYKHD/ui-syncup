# Storage Architecture

> **Read this before implementing any feature that touches file uploads, downloads, or serving.**

---

## Two-Bucket Model

The app uses two logically separate S3-compatible buckets with intentionally different access patterns:

| Bucket | Env var | Purpose | Access pattern |
|--------|---------|---------|----------------|
| `attachments` | `STORAGE_ATTACHMENTS_BUCKET` | Issue attachments | **Always private** — served via presigned GET URLs |
| `media` | `STORAGE_MEDIA_BUCKET` | Avatars, team logos | **Public read** when provider allows; presigned GET URLs when Block Public Access is enabled |

These can be different S3 providers with independent credentials — each bucket has its own `ACCESS_KEY_ID` and `SECRET_ACCESS_KEY` env vars.

---

## Supported Providers

The storage layer (`src/lib/storage.ts`) auto-detects which provider to use based on whether `STORAGE_ENDPOINT` is set.

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

| Provider | `STORAGE_ENDPOINT` | `forcePathStyle` | Notes |
|----------|-------------------|-----------------|-------|
| **MinIO** (local dev) | `http://127.0.0.1:9000` | `true` (auto) | Bucket auto-created on startup |
| **MinIO** (Docker Compose) | `http://minio:9000` | `true` (auto) | Use `COMPOSE_PROFILES=storage` to bundle |
| **Cloudflare R2** | `https://<account>.r2.cloudflarestorage.com` | `true` (auto) | Set CORS; public URL can be a separate custom domain |
| **AWS S3** | *(not set)* | `false` (auto) | Set `STORAGE_REGION` |
| **Lightsail object storage** | *(not set)* | `false` (auto) | Set `STORAGE_REGION`; Block Public Access is ON by default |
| **Other S3-compatible** | `https://...` | `true` (auto) | Works if the provider supports the S3 API |

---

## Environment Variables

### Minimal configuration (same credentials for both buckets)

```bash
# Provider type: omit STORAGE_ENDPOINT for AWS S3 / Lightsail
# Set STORAGE_ENDPOINT for MinIO, R2, or any custom S3-compatible endpoint
STORAGE_ENDPOINT=                         # empty or absent → native AWS mode
STORAGE_REGION=ap-southeast-1            # required for AWS / Lightsail

STORAGE_ACCESS_KEY_ID=...
STORAGE_SECRET_ACCESS_KEY=...

STORAGE_ATTACHMENTS_BUCKET=ui-syncup-attachments
STORAGE_ATTACHMENTS_PUBLIC_URL=https://my-attachments.s3.ap-southeast-1.amazonaws.com

STORAGE_MEDIA_BUCKET=ui-syncup-media
STORAGE_MEDIA_PUBLIC_URL=https://my-media.s3.ap-southeast-1.amazonaws.com
```

### Per-bucket credentials (Lightsail: each bucket has its own key)

```bash
# No shared STORAGE_ENDPOINT or STORAGE_ACCESS_KEY_ID needed when per-bucket vars are set

STORAGE_REGION=ap-southeast-1            # shared fallback region

STORAGE_ATTACHMENTS_BUCKET=ui-syncup-attachments
STORAGE_ATTACHMENTS_PUBLIC_URL=https://my-attachments.s3.ap-southeast-1.amazonaws.com
STORAGE_ATTACHMENTS_ACCESS_KEY_ID=AKIA...
STORAGE_ATTACHMENTS_SECRET_ACCESS_KEY=...

# Optional per-bucket region override:
# STORAGE_ATTACHMENTS_REGION=ap-southeast-1

STORAGE_MEDIA_BUCKET=ui-syncup-media
STORAGE_MEDIA_PUBLIC_URL=https://my-media.s3.ap-southeast-1.amazonaws.com
STORAGE_MEDIA_ACCESS_KEY_ID=AKIA...
STORAGE_MEDIA_SECRET_ACCESS_KEY=...
```

### Bundled MinIO (Docker Compose)

When `COMPOSE_PROFILES=storage` is set, a MinIO container is started alongside the app. The MinIO admin credentials must match the storage credentials:

```bash
COMPOSE_PROFILES=storage

STORAGE_ENDPOINT=http://minio:9000
STORAGE_REGION=us-east-1
STORAGE_ACCESS_KEY_ID=minioadmin
STORAGE_SECRET_ACCESS_KEY=minioadmin

STORAGE_ATTACHMENTS_BUCKET=ui-syncup-attachments
STORAGE_ATTACHMENTS_PUBLIC_URL=http://localhost:9000/ui-syncup-attachments

STORAGE_MEDIA_BUCKET=ui-syncup-media
STORAGE_MEDIA_PUBLIC_URL=http://localhost:9000/ui-syncup-media

# MinIO admin bootstrap (must match credentials above)
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=change-me-min-8-chars
```

### Variable resolution order (per bucket)

```
STORAGE_ATTACHMENTS_ENDPOINT     →  STORAGE_ENDPOINT         →  (undefined)
STORAGE_ATTACHMENTS_REGION       →  STORAGE_REGION           →  'us-east-1'
STORAGE_ATTACHMENTS_ACCESS_KEY_ID (or _ACCESS_KEY)
                                 →  STORAGE_ACCESS_KEY_ID    →  'minioadmin'
STORAGE_ATTACHMENTS_SECRET_ACCESS_KEY (or _SECRET_KEY)
                                 →  STORAGE_SECRET_ACCESS_KEY →  'minioadmin'
```

Replace `ATTACHMENTS` with `MEDIA` for the media bucket.

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
  │◀── { uploadUrl,          │                         │
  │      publicUrl, key } ───│                         │
  │                          │                         │
  │  PUT <uploadUrl>  ───────│────────────────────────▶│
  │  (direct, no app server) │                     object stored
  │                          │                         │
  │  POST /api/issues/       │                         │
  │  {id}/attachments ──────▶│  createAttachment()     │
  │  { url: publicUrl, ... } │  stores publicUrl in DB │
  │◀── { attachment } ───────│                         │
```

The `publicUrl` stored in the DB is constructed from `STORAGE_ATTACHMENTS_PUBLIC_URL + "/" + key`. It is a direct S3 URL — it is **not** the presigned URL.

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

Attachments are private on all providers. When the attachments list is fetched, the server generates a **presigned GET URL** for each attachment before returning the response. The client never makes a direct URL request to S3 for attachment content.

```
Browser                  App Server               S3 Provider
  │                          │                         │
  │  GET /api/issues/        │                         │
  │  {id}/attachments ──────▶│                         │
  │                          │  getAttachmentsByIssue()│
  │                          │  generateDownloadUrl()  │
  │                          │────────────────────────▶│ (per attachment)
  │                          │◀── presigned GET URL ───│
  │◀── { attachments: [      │                         │
  │      { url,              │                         │
  │        downloadUrl,      │                         │
  │        ... }             │                         │
  │    ] } ─────────────────│                         │
  │                          │                         │
  │  GET <downloadUrl> ──────│────────────────────────▶│ (browser fetches directly)
  │◀── file bytes ───────────│────────────────────────◀│
```

The `IssueAttachment` type has both `url` (the stored public URL) and `downloadUrl` (the presigned GET URL, valid for 1 hour). Rendering components use `downloadUrl ?? url` so they fall back gracefully if presigned URL generation fails.

### Media (avatars, logos)

When the media bucket is **public** (MinIO in dev, R2 with public policy), avatars and team logos are served via their stored `publicUrl` directly — no presigned URL needed.

When the media bucket has **Block Public Access enabled** (Lightsail / AWS S3 default), use the presigned download endpoint:

```
GET /api/uploads/presigned/download?key=<key>&bucket=media
→ { url: "<presigned-get-url>" }
```

This endpoint requires an authenticated session. Presigned URLs expire after 1 hour.

---

## Core Storage API (`src/lib/storage.ts`)

```typescript
// Generate a presigned PUT URL for uploading (valid 1 hour)
generateUploadUrl(bucket: StorageBucket, key: string, contentType: string): Promise<string>

// Generate a presigned GET URL for viewing/downloading (valid 1 hour by default)
generateDownloadUrl(bucket: StorageBucket, key: string, expiresIn?: number): Promise<string>

// Construct the stored public URL for a key (used after upload, stored in DB)
getPublicUrl(bucket: StorageBucket, key: string): string

// Reverse getPublicUrl: extract the S3 key from a stored public URL
// Returns null if the URL doesn't match the bucket's configured public URL prefix
getKeyFromUrl(bucket: StorageBucket, publicUrl: string): string | null

// Delete an object
deleteFile(bucket: StorageBucket, key: string): Promise<void>

// Get the actual bucket name for a logical bucket type
getBucketName(bucket: StorageBucket): string

// Get the configured S3Client for a bucket type
getStorageClient(bucket: StorageBucket): S3Client
```

### Attachment service helpers (`src/server/issues/attachment-service.ts`)

```typescript
// Build the canonical S3 key for an attachment
// Path: issues/{teamId}/{projectId}/{issueId}/{attachmentId}-{sanitizedFilename}
generateR2Path(teamId, projectId, issueId, attachmentId, fileName): string

// Returns true if the MIME type is an image
isImageType(fileType: string): boolean
```

---

## API Endpoints

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| `POST` | `/api/uploads/presigned` | Get presigned PUT URL for an issue attachment | Session |
| `POST` | `/api/uploads/media` | Get presigned PUT URL for avatar/team logo | Session |
| `DELETE` | `/api/uploads/media` | Delete an avatar or team logo from storage | Session |
| `GET` | `/api/uploads/presigned/download` | Get presigned GET URL for any private object | Session |

### POST /api/uploads/presigned

Request body:
```json
{ "fileName": "screenshot.png", "contentType": "image/png", "issueId": "<uuid>" }
```

Response:
```json
{ "uploadUrl": "https://...", "publicUrl": "https://...", "key": "issues/..." }
```

### POST /api/uploads/media

Request body:
```json
{ "fileName": "avatar.jpg", "contentType": "image/jpeg", "type": "avatar|team", "entityId": "<userId|teamId>" }
```

Response:
```json
{ "uploadUrl": "https://...", "publicUrl": "https://...", "key": "avatars/...", "maxFileSize": 2097152 }
```

### DELETE /api/uploads/media

Request body:
```json
{ "key": "avatars/...", "type": "avatar|team", "entityId": "<userId|teamId>" }
```

### Presigned download endpoint

```
GET /api/uploads/presigned/download?key=<key>&bucket=<attachments|media>

Response: { url: "https://..." }
Cache-Control: private, max-age=3600
```

---

## Object Key Structure

```
# Issue attachments (generated by presigned upload endpoint)
issues/{teamId}/{projectId}/{issueId}/{uuid}.{ext}

# Issue attachments (generated by generateR2Path helper)
issues/{teamId}/{projectId}/{issueId}/{attachmentId}-{sanitizedFilename}

# Avatars
avatars/{userId}/{uuid}.{ext}

# Team logos
teams/{teamId}/{uuid}.{ext}
```

The hierarchical structure enables:
- Batch-deleting all attachments for a project (`issues/{teamId}/{projectId}/`)
- Storage quota calculation per team or project
- Access control validation by checking key prefix

---

## Attachment Record Fields

The `IssueAttachment` type includes the following fields beyond the core file metadata:

| Field | Type | Description |
|-------|------|-------------|
| `url` | `string` | Public URL stored in DB (not presigned) |
| `downloadUrl` | `string \| null` | Presigned GET URL (populated server-side, valid 1 hour) |
| `thumbnailUrl` | `string \| null` | Optional thumbnail for image attachments |
| `width` | `number \| null` | Image width in pixels |
| `height` | `number \| null` | Image height in pixels |
| `reviewVariant` | `"as_is" \| "to_be" \| "reference"` | Review context tag (default: `as_is`) |
| `annotations` | `AttachmentAnnotation[]` | JSONB array of canvas annotations (max 50) |

---

## Bucket Initialisation

`ensureStorageBuckets()` runs on app startup (via `src/instrumentation.ts`). It:

1. Calls `HeadBucket` to check if each bucket exists
2. If the bucket is missing, attempts to create it — **this only works for MinIO and other self-hosted stores**. For AWS S3 and Lightsail, buckets must be created manually in the console.
3. For the media bucket, attempts to set a public-read bucket policy. If Block Public Access is enabled, this is silently skipped and a warning is logged — the app falls back to presigned GET URLs.

---

## Implementing a New Storage Feature

### Uploading a new file type

1. Add an API route under `src/app/api/uploads/` that:
   - Authenticates the user
   - Validates file type and size
   - Generates a key using the appropriate path structure
   - Calls `generateUploadUrl(bucket, key, contentType)`
   - Calls `getPublicUrl(bucket, key)` to derive the stored URL
   - Returns `{ uploadUrl, publicUrl, key }`

2. On the client, upload directly via `PUT <uploadUrl>` with `Content-Type` header.

3. Store `publicUrl` in the database.

### Displaying a private file

Use `generateDownloadUrl(bucket, key)` server-side and pass the presigned URL to the client. Do **not** pass the raw `publicUrl` from the DB as an `<img src>` or link for private objects — it will 403.

If you need the key from a stored `publicUrl`:
```typescript
const key = getKeyFromUrl('attachments', attachment.url);
if (key) {
  const downloadUrl = await generateDownloadUrl('attachments', key);
}
```

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
- Direct `https://bucket.s3.region.amazonaws.com/key` URLs return 403 for unauthenticated requests
- Presigned URLs (signed with valid credentials) still work regardless of Block Public Access

The **attachments bucket** is always private — this is correct and expected. No action needed.

The **media bucket** needs extra consideration depending on your deployment:

| Scenario | What to do |
|----------|-----------|
| MinIO (dev) | Bucket auto-created with public-read policy. Direct URLs work. |
| R2 (production) | Configure public-read policy in R2 dashboard. Direct URLs work. |
| Lightsail / AWS S3 | Block Public Access is ON. Use presigned GET URLs via `/api/uploads/presigned/download?bucket=media&key=...` to serve avatars/logos. |

> **Note for Lightsail**: Each Lightsail bucket has its own access key pair. Supply them via `STORAGE_ATTACHMENTS_ACCESS_KEY_ID` / `STORAGE_MEDIA_ACCESS_KEY_ID` etc. Do not set `STORAGE_ENDPOINT` — the AWS SDK resolves the endpoint automatically from the region.
