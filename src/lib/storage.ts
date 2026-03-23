/**
 * Storage utilities for S3-compatible object storage
 * 
 * Supports two buckets:
 * - ui-syncup-attachments: Issue attachments (requires auth via presigned URLs)
 * - ui-syncup-media: Avatars, team logos (public read access)
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

export type StorageBucket = 'attachments' | 'media';

// ============================================================================
// CONFIGURATION
// ============================================================================

const getClientConfig = (type: StorageBucket) => {
  const prefix = type === 'attachments' ? 'STORAGE_ATTACHMENTS' : 'STORAGE_MEDIA';

  // Helper: check bucket-specific env var, then global, then fallback
  const getVar = (specificSuffix: string, globalVar: string, fallback?: string) => {
    return process.env[`${prefix}${specificSuffix}`] || process.env[globalVar] || fallback;
  };

  // Custom endpoint is only needed for MinIO / self-hosted S3-compatible stores.
  // For real AWS S3 and Lightsail object storage, leave undefined so the SDK
  // resolves the correct regional endpoint automatically.
  const endpoint = getVar('_ENDPOINT', 'STORAGE_ENDPOINT');

  return {
    endpoint, // undefined → SDK uses aws default; set → MinIO / custom
    region: getVar('_REGION', 'STORAGE_REGION', 'us-east-1'),
    // Support both ACCESS_KEY (docs) and ACCESS_KEY_ID (standard)
    accessKeyId: process.env[`${prefix}_ACCESS_KEY`] || process.env[`${prefix}_ACCESS_KEY_ID`] || process.env.STORAGE_ACCESS_KEY_ID || 'minioadmin',
    secretAccessKey: process.env[`${prefix}_SECRET_KEY`] || process.env[`${prefix}_SECRET_ACCESS_KEY`] || process.env.STORAGE_SECRET_ACCESS_KEY || 'minioadmin',
  };
};

/**
 * Bucket configuration with names and public URLs
 */
const BUCKET_CONFIG = {
  attachments: {
    name: process.env.STORAGE_ATTACHMENTS_BUCKET || 'ui-syncup-attachments',
    publicUrl: process.env.STORAGE_ATTACHMENTS_PUBLIC_URL || 'http://127.0.0.1:9000/ui-syncup-attachments',
  },
  media: {
    name: process.env.STORAGE_MEDIA_BUCKET || 'ui-syncup-media',
    publicUrl: process.env.STORAGE_MEDIA_PUBLIC_URL || 'http://127.0.0.1:9000/ui-syncup-media',
  },
} as const;

// ============================================================================
// S3 CLIENTS
// ============================================================================

function createClient(type: StorageBucket) {
  const config = getClientConfig(type);

  // forcePathStyle is required for MinIO and other self-hosted S3-compatible stores
  // (e.g. http://127.0.0.1:9000/bucket/key).  Real AWS S3 and Lightsail use
  // virtual-hosted-style URLs (bucket.s3.region.amazonaws.com) so it must be false,
  // otherwise presigned URLs are generated with the wrong format.
  const isCustomEndpoint = !!config.endpoint;

  return new S3Client({
    region: config.region,
    ...(isCustomEndpoint ? { endpoint: config.endpoint } : {}),
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: isCustomEndpoint,
  });
}

const attachmentsClient = createClient('attachments');
const mediaClient = createClient('media');

/**
 * Get the appropriate S3 client for the bucket type
 */
function getClient(bucket: StorageBucket): S3Client {
  return bucket === 'attachments' ? attachmentsClient : mediaClient;
}

// Export default client (attachments) for backward compatibility
export const storageClient = attachmentsClient;

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Generate a presigned URL for uploading a file
 * 
 * @param bucket - Target bucket ('attachments' or 'media')
 * @param key - Object key (path within bucket)
 * @param contentType - MIME type of the file
 * @returns Presigned upload URL (valid for 1 hour)
 */
export async function generateUploadUrl(
  bucket: StorageBucket,
  key: string,
  contentType: string
): Promise<string> {
  const client = getClient(bucket);
  const command = new PutObjectCommand({
    Bucket: BUCKET_CONFIG[bucket].name,
    Key: key,
    ContentType: contentType,
  });
  
  return getSignedUrl(client, command, { expiresIn: 3600 });
}

/**
 * Generate a presigned URL for downloading / viewing a file
 *
 * Use this to serve private objects (attachments bucket, or media bucket when
 * Block Public Access is enabled).  The URL is valid for `expiresIn` seconds.
 *
 * @param bucket - Source bucket ('attachments' or 'media')
 * @param key - Object key (path within bucket)
 * @param expiresIn - Seconds until the URL expires (default 1 hour)
 * @returns Presigned download URL
 */
export async function generateDownloadUrl(
  bucket: StorageBucket,
  key: string,
  expiresIn = 3600
): Promise<string> {
  const client = getClient(bucket);
  const command = new GetObjectCommand({
    Bucket: BUCKET_CONFIG[bucket].name,
    Key: key,
  });
  return getSignedUrl(client, command, { expiresIn });
}

/**
 * Delete a file from storage
 * 
 * @param bucket - Target bucket ('attachments' or 'media')
 * @param key - Object key (path within bucket)
 */
export async function deleteFile(
  bucket: StorageBucket,
  key: string
): Promise<void> {
  const client = getClient(bucket);
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_CONFIG[bucket].name,
    Key: key,
  });

  await client.send(command);
}

/**
 * Get the public URL for an object
 * 
 * @param bucket - Target bucket ('attachments' or 'media')
 * @param key - Object key (path within bucket)
 * @returns Public URL for the object
 */
export function getPublicUrl(bucket: StorageBucket, key: string): string {
  const baseUrl = BUCKET_CONFIG[bucket].publicUrl.replace(/\/$/, '');
  const cleanKey = key.replace(/^\//, '');
  return `${baseUrl}/${cleanKey}`;
}

/**
 * Get bucket name for a given bucket type
 *
 * @param bucket - Bucket type
 * @returns Actual bucket name
 */
export function getBucketName(bucket: StorageBucket): string {
  return BUCKET_CONFIG[bucket].name;
}

/**
 * Extract the object key from a stored public URL
 *
 * Reverses `getPublicUrl`.  Returns null if the URL does not match the
 * configured public URL prefix for the given bucket.
 *
 * @param bucket - Bucket type
 * @param publicUrl - Full public URL as stored in the database
 * @returns S3 object key, or null if the URL is not from this bucket
 */
export function getKeyFromUrl(bucket: StorageBucket, publicUrl: string): string | null {
  const baseUrl = BUCKET_CONFIG[bucket].publicUrl.replace(/\/$/, '');
  if (!publicUrl.startsWith(baseUrl + '/')) return null;
  return publicUrl.slice(baseUrl.length + 1); // strip "baseUrl/"
}

// ============================================================================
// BUCKET INITIALISATION
// ============================================================================

/**
 * Ensure both storage buckets exist, creating them if they don't.
 * Safe to call on every startup — uses HeadBucket to skip creation when
 * the bucket already exists.
 *
 * Also sets a public-read policy on the media bucket so objects are
 * accessible without presigned URLs (mirrors what `minio-init` does in Docker).
 */
export async function ensureStorageBuckets(): Promise<void> {
  const buckets: Array<{ type: StorageBucket; publicRead: boolean }> = [
    { type: 'attachments', publicRead: false },
    { type: 'media', publicRead: true },
  ];

  await Promise.all(
    buckets.map(async ({ type, publicRead }) => {
      const client = getClient(type);
      const name = BUCKET_CONFIG[type].name;

      try {
        await client.send(new HeadBucketCommand({ Bucket: name }));
        // Bucket already exists — nothing to do
      } catch (err: unknown) {
        const code = (err as { name?: string; Code?: string })?.name ?? (err as { Code?: string })?.Code;
        const isNotFound = code === 'NoSuchBucket' || code === 'NotFound' || (err as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode === 404;

        if (!isNotFound) {
          // Auth error or network error — surface it rather than silently swallowing
          console.error(`[storage] Cannot reach bucket "${name}":`, err);
          return;
        }

        // Bucket does not exist — create it (only works for MinIO / self-hosted;
        // Lightsail and AWS S3 buckets must be created in the console first).
        try {
          await client.send(new CreateBucketCommand({ Bucket: name }));
          console.info(`[storage] Created bucket "${name}"`);
        } catch (createErr: unknown) {
          console.warn(`[storage] Could not create bucket "${name}" (may already exist or require console creation):`, (createErr as Error)?.message ?? createErr);
          return;
        }

        if (publicRead) {
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
          } catch (policyErr: unknown) {
            // Block Public Access (account- or bucket-level) will reject this.
            // The app falls back to presigned GET URLs for media, so this is non-fatal.
            console.warn(`[storage] Could not set public-read policy on "${name}" — Block Public Access may be enabled. Media will be served via presigned URLs instead.`);
          }
        }
      }
    })
  );
}
