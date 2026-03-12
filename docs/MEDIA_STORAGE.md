# Media Storage Implementation Guide

This document defines how media files are stored, accessed, and managed across
local, development, and production environments.

The system uses **S3-compatible object storage** with environment-based providers:

- **Local** → MinIO
- **Dev / Prod** → Cloudflare R2

---

## 1. Storage Strategy Overview

### Providers
| Environment | Provider          | Protocol |
|------------|-------------------|----------|
| Local      | MinIO             | S3 API   |
| Dev        | Cloudflare R2     | S3 API   |
| Prod       | Cloudflare R2     | S3 API   |

### Two-Bucket Architecture

We use **two separate buckets** to optimize for different access patterns, lifecycle policies, and security boundaries:

| Bucket | Purpose | Access Pattern | Retention |
|--------|---------|----------------|-----------|
| `ui-syncup-attachments` | Issue/annotation attachments | **Hot** - Frequent reads/writes | Tied to issue lifecycle |
| `ui-syncup-media` | Avatars, team logos | **Cold/Warm** - Infrequent updates | Long-lived |

### Why Two Buckets?

1. **Lifecycle & Retention** - Attachments may be deleted with issues (GDPR), while avatars persist
2. **Access Control** - Attachments need project-level RBAC; avatars are user/team-scoped
3. **Performance** - Different caching strategies per bucket
4. **Quotas** - Easy to track storage usage separately for quota enforcement

---

## 2. Bucket & Prefix Structure

### `ui-syncup-attachments` (Hot Storage)
```
ui-syncup-attachments/
├─ issues/{teamId}/{projectId}/{issueId}/   # Issue attachments
├─ annotations/{teamId}/{annotationId}/     # Annotation screenshots
├─ exports/                                 # Generated exports
└─ temp/                                    # Short-lived uploads (auto-cleanup)
```

### `ui-syncup-media` (Cold/Warm Storage)
```
ui-syncup-media/
├─ avatars/{userId}/           # User profile images
├─ teams/{teamId}/             # Team logos
└─ previews/                   # Generated thumbnails
```

---

## 3. Environment Configuration

### 3.1 Local Development (MinIO)

**Docker Setup** (see `docker-compose.minio.yml`)
```bash
docker compose -f docker-compose.minio.yml up -d
```

This creates both buckets automatically:
- `ui-syncup-attachments`
- `ui-syncup-media`

**Environment Variables**
```env
# Attachments Bucket
STORAGE_ATTACHMENTS_ENDPOINT=http://localhost:9000
STORAGE_ATTACHMENTS_BUCKET=ui-syncup-attachments
STORAGE_ATTACHMENTS_ACCESS_KEY=minioadmin
STORAGE_ATTACHMENTS_SECRET_KEY=minioadmin
STORAGE_ATTACHMENTS_PUBLIC_URL=http://localhost:9000/ui-syncup-attachments

# Media Bucket
STORAGE_MEDIA_ENDPOINT=http://localhost:9000
STORAGE_MEDIA_BUCKET=ui-syncup-media
STORAGE_MEDIA_ACCESS_KEY=minioadmin
STORAGE_MEDIA_SECRET_KEY=minioadmin
STORAGE_MEDIA_PUBLIC_URL=http://localhost:9000/ui-syncup-media

# Shared
STORAGE_REGION=us-east-1
```

---

### 3.2 Dev / Production (Cloudflare R2)

**Environment Variables**
```env
# Attachments Bucket
STORAGE_ATTACHMENTS_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
STORAGE_ATTACHMENTS_BUCKET=ui-syncup-attachments
STORAGE_ATTACHMENTS_ACCESS_KEY=<R2_ACCESS_KEY>
STORAGE_ATTACHMENTS_SECRET_KEY=<R2_SECRET_KEY>
STORAGE_ATTACHMENTS_PUBLIC_URL=https://<cdn-domain>/attachments

# Media Bucket
STORAGE_MEDIA_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
STORAGE_MEDIA_BUCKET=ui-syncup-media
STORAGE_MEDIA_ACCESS_KEY=<R2_ACCESS_KEY>
STORAGE_MEDIA_SECRET_KEY=<R2_SECRET_KEY>
STORAGE_MEDIA_PUBLIC_URL=https://<cdn-domain>/media

# Shared
STORAGE_REGION=auto
```

---

## 4. Media Types & Access Rules

### Attachments Bucket

| Prefix | Access | Caching | Notes |
|--------|--------|---------|-------|
| `issues/` | Private (signed URLs) | Short TTL | Project RBAC enforced |
| `annotations/` | Private (signed URLs) | Short TTL | Annotation owner only |
| `exports/` | Private (signed URLs) | No cache | One-time downloads |
| `temp/` | Private | Auto-delete after 24h | Pending uploads |

### Media Bucket

| Prefix | Access | Caching | Notes |
|--------|--------|---------|-------|
| `avatars/` | Public read | Aggressive | `Cache-Control: public, max-age=31536000, immutable` |
| `teams/` | Public read | Aggressive | Same as avatars |
| `previews/` | Public read | Long TTL | Generated thumbnails |

---

## 5. Upload Rules

- Generate object keys server-side
- Never trust client filenames
- Include tenant/user isolation in paths

**Key Generation Examples**
```
# Attachments
issues/{teamId}/{projectId}/{issueId}/{uuid}.png
annotations/{teamId}/{annotationId}/{uuid}.png

# Media
avatars/{userId}/{uuid}.webp
teams/{teamId}/{uuid}.webp
```

---

## 6. Storage Abstraction

All storage access MUST go through the abstraction layer:

```ts
// Attachments bucket
attachmentStorage.upload(key, file)
attachmentStorage.getSignedUrl(key, expiresIn)
attachmentStorage.delete(key)

// Media bucket
mediaStorage.upload(key, file)
mediaStorage.getPublicUrl(key)
mediaStorage.delete(key)
```

---

## 7. Security

| Bucket | Write Access | Read Access | Auth |
|--------|--------------|-------------|------|
| `ui-syncup-attachments` | Server only | Signed URLs | Project RBAC |
| `ui-syncup-media` | Server only | Public | None (CDN cached) |

**Additional Rules**
- Validate MIME type server-side
- Enforce file size limits per quota
- Sanitize filenames before storage

---

## 8. Lifecycle Policies

### Attachments
- `temp/` - Auto-delete after 24 hours
- `issues/` - Delete when issue is permanently deleted
- `exports/` - Auto-delete after 7 days

### Media
- `avatars/` - Delete when user deletes account
- `teams/` - Delete when team is deleted
- `previews/` - Regenerate on source change

---

## 9. Summary

| Aspect | Attachments Bucket | Media Bucket |
|--------|-------------------|--------------|
| Name | `ui-syncup-attachments` | `ui-syncup-media` |
| Access | Private (signed URLs) | Public read |
| Pattern | Hot (frequent R/W) | Cold/Warm |
| Caching | Short TTL | Aggressive |
| Lifecycle | Tied to content | Long-lived |
