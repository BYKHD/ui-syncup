---
title: Concept — Storage
type: concept
tags: [storage, s3, uploads, media]
last_updated: 2026-05-01
sources: [sources/feature-arch-storage, sources/steering-tech]
---

# Storage

Single S3-compatible bucket with logical key prefixes. Auto-detects provider from `STORAGE_ENDPOINT`.

## Prefixes

| Prefix | Purpose | Access |
|---|---|---|
| `attachments/` | Issue attachments | Always private; presigned GET URLs |
| `media/` | Avatars, team logos | Private by default via `/api/media/[...key]` proxy with cached presigned URLs; direct public URLs when `STORAGE_PUBLIC_ACCESS=true` |

## Provider detection

`STORAGE_ENDPOINT` set → custom-endpoint mode (`forcePathStyle: true`) — works with **MinIO**, **Cloudflare R2**, generic S3-compatible.
`STORAGE_ENDPOINT` unset → native AWS mode — works with **AWS S3** and **AWS Lightsail object storage** (auto-resolved from `STORAGE_REGION`).

## Upload flow

Browser POSTs `multipart/form-data` to Next.js (`/api/uploads/attachment` or `/api/uploads/media`); the server uploads to S3 with `PutObjectCommand`. **No CORS configuration is required on the bucket** — uploads never go directly from the browser to S3.

## Serving

- Attachments: presigned GET URL on demand.
- Media: `/api/media/[...key]` proxy returns a redirect to a cached presigned URL or a direct public URL.

## Code locations

- `src/lib/storage.ts` — provider detection + S3 client.
- `/api/uploads/attachment`, `/api/uploads/media` — upload endpoints.
- `/api/media/[...key]` — media-serving proxy.

## Related

- Features: [[features/issues]] (attachments), [[features/team-settings]] (logos), [[features/user-settings]] (avatars)
- Concepts: [[concepts/deployment]], [[concepts/security]]
- Sources: [[sources/feature-arch-storage]]
