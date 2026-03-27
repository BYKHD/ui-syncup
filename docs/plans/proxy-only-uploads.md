# Plan: Proxy-Only Uploads (Remove Direct-to-S3 Presigned Uploads)

## Context

Browser-to-S3 presigned URL uploads fail with `TypeError: Failed to fetch` when the S3 bucket lacks CORS configuration (e.g., AWS Lightsail with Block Public Access). The error occurs at `src/hooks/use-media-upload.ts:50` when the browser attempts a cross-origin `PUT` to the presigned S3 URL — the browser sends a CORS preflight `OPTIONS` request, S3 rejects it (no CORS policy), and the browser blocks the request entirely.

Instead of requiring bucket-level CORS config or adding a strategy env switch, we **replace the presigned upload flow with server-side proxy uploads**. Files go `browser → Next.js API → S3`, eliminating CORS entirely.

Presigned URLs remain for **downloads/serving only** — the `/api/media/[...key]` redirect route generates presigned GET URLs server-side (no CORS issue).

### Why proxy-only (not switchable via env)

- File sizes are small (media ≤2MB, attachments ≤10MB) — proxy overhead is negligible
- Self-hosted product — fewer config knobs = better DX, no CORS bucket setup needed
- One code path = half the bugs, simpler testing
- No new env var to document/support

---

## Current Architecture

### Upload flows (both broken by CORS)

**Media uploads (avatars, team logos) — two-step presigned:**
```
Browser → POST /api/uploads/media (JSON metadata) → { uploadUrl, key }
Browser → PUT uploadUrl (direct to S3) ← CORS BLOCKED
```
- Hook: `src/hooks/use-media-upload.ts` (fetch-based, no progress tracking)
- API: `src/app/api/uploads/media/route.ts` (POST returns presigned URL, DELETE removes file)
- Consumer: `src/features/team-settings/hooks/use-team-settings.ts`

**Attachment uploads (issue files) — three-step presigned:**
```
Browser → POST /api/uploads/presigned (JSON metadata) → { uploadUrl, key }
Browser → PUT uploadUrl (XHR direct to S3 with progress) ← CORS BLOCKED
Browser → POST /api/issues/{id}/attachments (create DB record with key)
```
- Function: `src/features/issues/api/upload-attachment.ts` (XHR for progress)
- API: `src/app/api/uploads/presigned/route.ts` (POST returns presigned URL)
- DB route: `src/app/api/issues/[issueId]/attachments/route.ts` (creates record)

### Download/serving flow (NOT affected — stays as-is)
```
Browser → GET /api/media/media/teams/{id}/{uuid}.jpg
Server  → getMediaUrl(key) [cached presigned GET URL]
Server  → 307 redirect to presigned URL
Browser → GET presigned URL from S3 (no CORS issue — simple GET redirect)
```
- Route: `src/app/api/media/[...key]/route.ts`
- Download: `src/app/api/uploads/presigned/download/route.ts`

### Storage layer — `src/lib/storage.ts`
- S3Client singleton with `forcePathStyle` based on custom endpoint
- `requestChecksumCalculation: 'when_required'` (browser compat)
- Key structure: `media/avatars/{userId}/{uuid}.ext`, `media/teams/{teamId}/{uuid}.ext`, `attachments/issues/{teamId}/{projectId}/{issueId}/{uuid}.ext`
- Functions: `generateUploadUrl()`, `generateDownloadUrl()`, `getMediaUrl()` (cached), `deleteFile()`, `buildKey()`, `getPublicUrl()`, `ensureStorageBucket()`
- Media URL cache: in-process Map, 24h presigned URL TTL, 22h cache TTL

### Env vars (storage-related, from `src/lib/env.ts` lines 78-106)
- `STORAGE_ENDPOINT` — custom S3-compatible endpoint (MinIO, R2). Empty for AWS S3/Lightsail
- `STORAGE_REGION` — e.g. `ap-southeast-1`, `auto` for R2
- `STORAGE_ACCESS_KEY_ID` / `STORAGE_SECRET_ACCESS_KEY`
- `STORAGE_BUCKET` — default `ui-syncup-storage`
- `STORAGE_PUBLIC_ACCESS` — `true`/`false`, enables direct public URLs
- `STORAGE_PUBLIC_URL` — base URL when public access is enabled

### Next.js config — `next.config.ts`
- `serverActions.bodySizeLimit: '10mb'` (affects Server Actions, not Route Handlers)
- Route Handlers have no explicit body limit in the current config

---

## New Architecture (after refactor)

### Media upload flow (single step)
```
Browser → POST /api/uploads/media (FormData: file + type + entityId)
Server  → validate → build key → uploadFile(key, buffer, contentType)
Server  → { key }
```

### Attachment upload flow (two steps)
```
Browser → POST /api/uploads/attachment (FormData: file + issueId) [XHR with progress]
Server  → validate → lookup issue → build key → uploadFile(key, buffer, contentType)
Server  → { key }
Browser → POST /api/issues/{id}/attachments (create DB record with key)
```

Progress tracking still works — XHR `upload.onprogress` tracks browser-to-server bytes, which is the slow leg.

---

## Changes

### 1. Add `uploadFile()` to storage lib

**File: `src/lib/storage.ts`**

Add one new export:

```ts
/** Server-side upload to S3. */
export async function uploadFile(key: string, body: Buffer, contentType: string): Promise<void> {
  await client.send(new PutObjectCommand({
    Bucket: getBucketName(),
    Key: key,
    Body: body,
    ContentType: contentType,
  }));
}
```

Remove `generateUploadUrl()` — it generates presigned PUT URLs, only used by the two upload routes being replaced. Verify no other consumers before deleting.

**Consumers of `generateUploadUrl()` to check:**
- `src/app/api/uploads/media/route.ts` (being refactored)
- `src/app/api/uploads/presigned/route.ts` (being deleted)
- `src/lib/__tests__/storage.test.ts` (update tests)

### 2. Refactor media upload endpoint

**File: `src/app/api/uploads/media/route.ts`**

**POST handler** — change from JSON body to FormData, upload server-side:

Current:
```ts
// Accepts JSON: { fileName, contentType, type, entityId }
// Returns: { uploadUrl, key, maxFileSize }
```

New:
```ts
// Accepts FormData: file (File), type (string), entityId (string)
// Server uploads to S3
// Returns: { key }
```

Implementation:
- `const formData = await request.formData()`
- Extract `file`, `type`, `entityId` from FormData
- Same validation as today (content type, media type, entityId)
- Add file size validation: `if (file.size > MAX_FILE_SIZE)` reject with 400
- Build key (same logic: `media/{avatars|teams}/{entityId}/{uuid}.{ext}`)
- `const buffer = Buffer.from(await file.arrayBuffer())`
- `await uploadFile(key, buffer, file.type)`
- Return `NextResponse.json({ key })`

**DELETE handler** — unchanged (already server-side).

### 3. New attachment upload endpoint

**File: `src/app/api/uploads/attachment/route.ts`** (new)

Replaces `src/app/api/uploads/presigned/route.ts` — combines key generation + S3 upload:

- **POST handler**
- Auth via `getSession()`
- Accept FormData: `file` (File), `issueId` (string)
- Validate required fields
- Look up issue for `teamId`/`projectId` (same DB query as current presigned route):
  ```ts
  const issue = await db.query.issues.findFirst({
    where: eq(issues.id, issueId),
    columns: { teamId: true, projectId: true },
  });
  ```
- Build key: `attachments/issues/{teamId}/{projectId}/{issueId}/{uuid}.{ext}`
- `const buffer = Buffer.from(await file.arrayBuffer())`
- `await uploadFile(key, buffer, file.type)`
- Return `NextResponse.json({ key })`

### 4. Delete old presigned upload route

**File: `src/app/api/uploads/presigned/route.ts`** — DELETE this file.

Its job (generate presigned PUT URL for attachments) is now handled by step 3.

**Keep: `src/app/api/uploads/presigned/download/route.ts`** — generates presigned GET URLs server-side for attachment downloads. No CORS issue.

### 5. Simplify media upload hook

**File: `src/hooks/use-media-upload.ts`**

Replace the two-step presigned flow with a single FormData POST:

```ts
const upload = async ({ file, type, entityId }: UploadMediaOptions): Promise<string | null> => {
  setIsUploading(true);
  setError(null);

  try {
    const body = new FormData();
    body.append('file', file);
    body.append('type', type);
    body.append('entityId', entityId);

    const res = await fetch('/api/uploads/media', { method: 'POST', body });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Upload failed');
    }

    const { key } = await res.json();
    return `/api/media/${key}`;
  } catch (err) {
    const e = err instanceof Error ? err : new Error('Unknown upload error');
    console.error('Media upload error:', e);
    setError(e);
    toast.error(e.message);
    return null;
  } finally {
    setIsUploading(false);
  }
};
```

`deleteImage()` — unchanged.

### 6. Simplify attachment upload

**File: `src/features/issues/api/upload-attachment.ts`**

Replace the three-step flow with two steps:

```ts
export async function uploadAttachment(params: UploadAttachmentParams): Promise<IssueAttachment> {
  const { issueId, file, reviewVariant = 'as_is', width, height, annotations, onProgress } = params;

  // 1. Upload file to server (server uploads to S3)
  const formData = new FormData();
  formData.append('file', file);
  formData.append('issueId', issueId);

  const { key } = await xhrUpload('/api/uploads/attachment', formData, onProgress);

  // 2. Create attachment record in DB (unchanged)
  const { attachment } = await apiClient<CreateAttachmentResponse>(
    `/api/issues/${issueId}/attachments`,
    {
      method: 'POST',
      body: {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        url: key,
        width,
        height,
        reviewVariant,
        annotations,
      },
    }
  );

  return attachment;
}
```

Add local `xhrUpload()` helper for progress tracking:

```ts
function xhrUpload(
  url: string,
  body: FormData,
  onProgress?: (progress: number) => void
): Promise<{ key: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);

    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress((event.loaded / event.total) * 100);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Upload failed due to network error'));
    xhr.send(body);
  });
}
```

Remove `PresignedResponse` type (no longer needed).

### 7. Update storage tests

**File: `src/lib/__tests__/storage.test.ts`**

- Remove tests for `generateUploadUrl()`
- Add tests for `uploadFile()` (mock `PutObjectCommand`)

---

## Files Summary

| File | Change |
|------|--------|
| `src/lib/storage.ts` | Add `uploadFile()`, remove `generateUploadUrl()` |
| `src/app/api/uploads/media/route.ts` | POST: JSON → FormData, server-side S3 upload |
| `src/app/api/uploads/attachment/route.ts` | **New** — FormData upload + S3, replaces presigned |
| `src/app/api/uploads/presigned/route.ts` | **Delete** |
| `src/hooks/use-media-upload.ts` | Single-step FormData POST |
| `src/features/issues/api/upload-attachment.ts` | XHR FormData to own API, add `xhrUpload()` helper |
| `src/lib/__tests__/storage.test.ts` | Update for removed/added functions |

## What Does NOT Change

- `src/app/api/uploads/presigned/download/route.ts` — server-side presigned GET URLs, no CORS
- `src/app/api/media/[...key]/route.ts` — media serving/redirect unaffected
- `src/app/api/issues/[issueId]/attachments/route.ts` — DB record creation unchanged
- `src/app/api/uploads/media/route.ts` DELETE handler — already server-side
- `src/features/team-settings/hooks/use-team-settings.ts` — calls same `upload()` / `deleteImage()` interface
- `src/components/ui/avatar-upload.tsx` — calls same `onChange(file)` interface
- `src/lib/env.ts` — no new env var
- `.env.example` — no new config
- Database schema — no changes
- `generateDownloadUrl()`, `getMediaUrl()`, `getPublicUrl()`, `deleteFile()`, `buildKey()` — all stay

## Verification

1. Start dev server with Lightsail/external S3 storage config (no CORS on bucket)
2. Upload a team logo → should succeed without "Failed to fetch" error
3. Verify file in S3 bucket at `media/teams/{teamId}/{uuid}.ext`
4. Verify team logo displays correctly (media serving route still works)
5. Upload an issue attachment → should succeed with progress bar
6. Verify file in S3 at `attachments/issues/{teamId}/{projectId}/{issueId}/{uuid}.ext`
7. Verify attachment download works via presigned download URL
8. Delete a team logo → verify file removed from S3
9. `pnpm typecheck` — no type errors
10. `pnpm test src/lib/__tests__/storage.test.ts` — tests pass with updated assertions
