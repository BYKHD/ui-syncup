/**
 * Storage utilities for S3-compatible object storage
 *
 * Single-bucket design: all files live in one bucket, separated by key prefix.
 *
 *   attachments/issues/{teamId}/{projectId}/{issueId}/{uuid}.ext  → issue attachments
 *   media/avatars/{userId}/{uuid}.ext                             → user avatars
 *   media/teams/{teamId}/{uuid}.ext                               → team logos
 *
 * All objects are private by default (Block Public Access supported out of the box).
 * Media objects are served through /api/media/[...key] which redirects to a
 * server-cached presigned URL (22h cache, 24h URL TTL).
 *
 * Set STORAGE_PUBLIC_ACCESS=true + STORAGE_PUBLIC_URL=<base> to enable direct
 * public URLs instead of presigned URLs (useful for local MinIO dev or R2 with
 * a public custom domain).
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketPolicyCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Logical storage category — determines the key prefix within the single bucket.
 * Not a physical bucket name.
 */
export type StorageCategory = 'attachments' | 'media';

// ============================================================================
// CONFIGURATION
// ============================================================================

function getBucketName(): string {
  return process.env.STORAGE_BUCKET ?? 'ui-syncup-storage';
}

// ============================================================================
// S3 CLIENT (single instance)
// ============================================================================

function createClient(): S3Client {
  const endpoint = process.env.STORAGE_ENDPOINT;
  const isCustomEndpoint = !!endpoint;

  // forcePathStyle is required for MinIO and other self-hosted S3-compatible
  // stores (e.g. http://127.0.0.1:9000/bucket/key). AWS S3 and Lightsail use
  // virtual-hosted-style URLs so forcePathStyle must be false, otherwise
  // presigned URLs are generated in the wrong format.
  return new S3Client({
    region: process.env.STORAGE_REGION ?? 'us-east-1',
    ...(isCustomEndpoint ? { endpoint } : {}),
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY_ID ?? 'minioadmin',
      secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY ?? 'minioadmin',
    },
    forcePathStyle: isCustomEndpoint,
    // AWS SDK v3 >= 3.750 defaults to 'when_supported', which embeds a CRC32
    // checksum in presigned PUT URLs. Browsers cannot send the required
    // x-amz-checksum-crc32 header, causing S3 to reject uploads with 400.
    // 'when_required' disables automatic checksums for presigned URLs.
    requestChecksumCalculation: 'when_required',
    responseChecksumValidation: 'when_required',
  });
}

const client = createClient();

/**
 * Get the configured S3 client.
 * Use this instead of building your own client so configuration stays in sync.
 */
export function getStorageClient(): S3Client {
  return client;
}

export { getBucketName };

// ============================================================================
// KEY HELPERS
// ============================================================================

/**
 * Build a full storage key from a logical category and a relative path.
 *
 * @example
 * buildKey('attachments', 'issues/team1/proj1/issue1/uuid.png')
 * // → 'attachments/issues/team1/proj1/issue1/uuid.png'
 *
 * buildKey('media', 'avatars/user1/uuid.jpg')
 * // → 'media/avatars/user1/uuid.jpg'
 */
export function buildKey(category: StorageCategory, relativePath: string): string {
  return `${category}/${relativePath}`;
}

// ============================================================================
// PUBLIC URL (STORAGE_PUBLIC_ACCESS=true only)
// ============================================================================

/**
 * Get the direct public URL for a storage key.
 * Only valid when STORAGE_PUBLIC_ACCESS=true and STORAGE_PUBLIC_URL is set.
 *
 * @param key - Full storage key (e.g. 'media/avatars/user1/uuid.jpg')
 */
export function getPublicUrl(key: string): string {
  const base = (process.env.STORAGE_PUBLIC_URL ?? '').replace(/\/$/, '');
  const cleanKey = key.replace(/^\//, '');
  return `${base}/${cleanKey}`;
}

// ============================================================================
// PRESIGNED URLS
// ============================================================================

/**
 * Generate a presigned URL for uploading a file.
 *
 * @param key - Full storage key (use buildKey() to construct)
 * @param contentType - MIME type of the file
 * @returns Presigned PUT URL valid for 1 hour
 */
export async function generateUploadUrl(
  key: string,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client, command, { expiresIn: 3600 });
}

/**
 * Generate a presigned URL for downloading/viewing a private file.
 *
 * @param key - Full storage key
 * @param expiresIn - Seconds until URL expires (default: 1 hour)
 * @returns Presigned GET URL
 */
export async function generateDownloadUrl(
  key: string,
  expiresIn = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: getBucketName(),
    Key: key,
  });
  return getSignedUrl(client, command, { expiresIn });
}

// ============================================================================
// FILE OPERATIONS
// ============================================================================

/**
 * Delete a file from storage.
 *
 * @param key - Full storage key
 */
export async function deleteFile(key: string): Promise<void> {
  await client.send(
    new DeleteObjectCommand({
      Bucket: getBucketName(),
      Key: key,
    })
  );
}

// ============================================================================
// MEDIA URL CACHE
// ============================================================================

/**
 * Presigned URL cache for media objects (avatars, team logos).
 *
 * Media is displayed throughout the app (sidebars, issue lists, comments).
 * Without caching, every page load would generate N presigned URL API calls.
 * This cache stores a 24h presigned URL per key and refreshes 2h before expiry.
 *
 * Scope: per server instance (in-process Map).
 * Multi-instance deployments generate slightly more presigned URLs per instance
 * but remain fully correct — the cache is an optimisation, not a correctness
 * requirement.
 */
const MEDIA_PRESIGNED_TTL = 24 * 60 * 60;        // 24h URL validity (seconds)
const MEDIA_CACHE_TTL_MS  = 22 * 60 * 60 * 1000; // 22h cache lifetime (ms)

interface CacheEntry {
  url: string;
  expiresAt: number; // Date.now() + MEDIA_CACHE_TTL_MS
}

const mediaUrlCache = new Map<string, CacheEntry>();

/**
 * Get a presigned URL for a media object, served from cache when available.
 *
 * The URL is valid for 24h; the cache entry expires after 22h so the URL is
 * always refreshed at least 2h before it expires.
 *
 * @param key - Full storage key (must start with 'media/')
 * @returns Presigned GET URL
 */
export async function getMediaUrl(key: string): Promise<string> {
  const hit = mediaUrlCache.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.url;
  }

  const url = await generateDownloadUrl(key, MEDIA_PRESIGNED_TTL);
  mediaUrlCache.set(key, { url, expiresAt: Date.now() + MEDIA_CACHE_TTL_MS });
  return url;
}

/**
 * Invalidate the cached presigned URL for a media key.
 * Call this when a media object is updated or deleted so the next request
 * generates a fresh URL pointing to the new object.
 *
 * @param key - Full storage key
 */
export function invalidateMediaUrl(key: string): void {
  mediaUrlCache.delete(key);
}

// ============================================================================
// BUCKET INITIALISATION
// ============================================================================

/**
 * Ensure the storage bucket exists, creating it if it doesn't.
 * Safe to call on every startup — uses HeadBucket to skip creation when the
 * bucket already exists.
 *
 * Auto-creation only works for MinIO and self-hosted S3-compatible stores.
 * AWS S3 and Lightsail buckets must be created in the console first.
 *
 * When STORAGE_PUBLIC_ACCESS=true, sets a public-read policy after bucket
 * creation (intended for local MinIO dev). Block Public Access on AWS/Lightsail
 * will silently prevent this — that is the correct and intended behaviour.
 */
export async function ensureStorageBucket(): Promise<void> {
  const name = getBucketName();

  try {
    await client.send(new HeadBucketCommand({ Bucket: name }));
    // Bucket exists — nothing to do
  } catch (err: unknown) {
    const code =
      (err as { name?: string; Code?: string })?.name ??
      (err as { Code?: string })?.Code;
    const isNotFound =
      code === 'NoSuchBucket' ||
      code === 'NotFound' ||
      (err as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode === 404;

    if (!isNotFound) {
      console.error(`[storage] Cannot reach bucket "${name}":`, err);
      return;
    }

    // Bucket does not exist — create it (MinIO / self-hosted only)
    try {
      await client.send(new CreateBucketCommand({ Bucket: name }));
      console.info(`[storage] Created bucket "${name}"`);
    } catch (createErr: unknown) {
      console.warn(
        `[storage] Could not create bucket "${name}" (may require console creation):`,
        (createErr as Error)?.message ?? createErr
      );
      return;
    }

    if (process.env.STORAGE_PUBLIC_ACCESS === 'true') {
      const policy = JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${name}/*`],
          },
        ],
      });
      try {
        await client.send(new PutBucketPolicyCommand({ Bucket: name, Policy: policy }));
        console.info(`[storage] Set public-read policy on bucket "${name}"`);
      } catch {
        // Block Public Access enabled — non-fatal, app uses presigned URLs
        console.warn(
          `[storage] Could not set public-read policy on "${name}" — Block Public Access may be enabled.`
        );
      }
    }
  }
}
