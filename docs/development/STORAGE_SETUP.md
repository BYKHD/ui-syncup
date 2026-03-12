# Storage Setup Guide

Object storage for file uploads using MinIO locally and Cloudflare R2 in production.

## Buckets

| Bucket | Purpose | Access |
|--------|---------|--------|
| `ui-syncup-attachments` | Issue attachments | Requires auth (presigned URLs) |
| `ui-syncup-media` | Avatars, team logos | Public read |

## Quick Start

```bash
# Start MinIO with auto-created buckets
bun run minio:start

# Verify buckets exist
open http://localhost:9001
# Login: minioadmin / minioadmin
```

## Environment Variables

### Local Development (MinIO)

Add to `.env.local`:

```bash
# Shared S3 connection settings
STORAGE_ENDPOINT=http://127.0.0.1:9000
STORAGE_REGION=us-east-1
STORAGE_ACCESS_KEY_ID=minioadmin
STORAGE_SECRET_ACCESS_KEY=minioadmin

# Attachments bucket
STORAGE_ATTACHMENTS_BUCKET=ui-syncup-attachments
STORAGE_ATTACHMENTS_PUBLIC_URL=http://127.0.0.1:9000/ui-syncup-attachments

# Media bucket
STORAGE_MEDIA_BUCKET=ui-syncup-media
STORAGE_MEDIA_PUBLIC_URL=http://127.0.0.1:9000/ui-syncup-media
```

### Production (Cloudflare R2)

```bash
STORAGE_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
STORAGE_REGION=auto
STORAGE_ACCESS_KEY_ID=<r2-access-key>
STORAGE_SECRET_ACCESS_KEY=<r2-secret-key>

STORAGE_ATTACHMENTS_BUCKET=ui-syncup-attachments
STORAGE_ATTACHMENTS_PUBLIC_URL=https://attachments.yourdomain.com

STORAGE_MEDIA_BUCKET=ui-syncup-media
STORAGE_MEDIA_PUBLIC_URL=https://media.yourdomain.com
```

## API Endpoints

### Issue Attachments

```typescript
// POST /api/uploads/presigned
// Request body:
{
  fileName: "screenshot.png",
  contentType: "image/png",
  issueId: "uuid-here"
}

// Response:
{
  uploadUrl: "https://...",  // PUT to this URL
  publicUrl: "https://...",  // Final public URL
  key: "issueId/attachments/uuid-filename"
}
```

### Media Uploads (Avatars, Team Images)

```typescript
// POST /api/uploads/media
// Request body:
{
  fileName: "avatar.jpg",
  contentType: "image/jpeg",
  type: "avatar" | "team",
  entityId: "user-or-team-uuid"
}

// Response:
{
  uploadUrl: "https://...",
  publicUrl: "https://...",
  key: "avatars/userId/uuid.jpg",
  maxFileSize: 2097152  // 2MB
}
```

## Using the Storage API

```typescript
import { generateUploadUrl, getPublicUrl } from '@/lib/storage';

// Generate upload URL for attachments
const uploadUrl = await generateUploadUrl('attachments', key, contentType);

// Generate upload URL for media
const uploadUrl = await generateUploadUrl('media', key, contentType);

// Get public URL
const url = getPublicUrl('attachments', key);
const avatarUrl = getPublicUrl('media', key);
```

## npm Scripts

```bash
bun run minio:start   # Start MinIO
bun run minio:stop    # Stop MinIO  
bun run minio:status  # Check status
```

## Docker Compose

The `docker-compose.minio.yml` includes:
- **minio**: S3-compatible storage server
- **minio-init**: Auto-creates buckets on startup

## Troubleshooting

### Buckets not created

```bash
# Restart MinIO to trigger init
bun run minio:stop && bun run minio:start

# Or manually via MinIO client
mc alias set local http://localhost:9000 minioadmin minioadmin
mc mb local/ui-syncup-attachments
mc mb local/ui-syncup-media
mc anonymous set download local/ui-syncup-media
```

### Reset storage completely

```bash
bun run minio:stop
docker volume rm ui-syncup_minio_data
bun run minio:start
```

### Check MinIO health

```bash
curl http://localhost:9000/minio/health/live
```

## File Size Limits

| Type | Max Size |
|------|----------|
| Issue attachment | 10 MB |
| Total per issue | 50 MB |
| Avatar/team image | 2 MB |

## Allowed Media Types

- `image/jpeg`
- `image/png`
- `image/webp`
- `image/gif`

## Cloudflare R2 CORS Configuration

To allow browser-side uploads (presigned URLs) and access from your application, you must configure CORS on your R2 buckets.

Go to **R2 Dashboard** -> **Settings** -> **CORS Policy** and add:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://ui-syncup.com",
      "https://*.ui-syncup.com"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "HEAD",
      "POST"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3000
  }
]
```

> **Note**: Replace `https://ui-syncup.com` with your actual production domain. `AllowedHeaders` must include `Content-Type` or `*` to allow the upload.
