/**
 * Storage utilities for S3-compatible object storage
 * 
 * Supports two buckets:
 * - ui-syncup-attachments: Issue attachments (requires auth via presigned URLs)
 * - ui-syncup-media: Avatars, team logos (public read access)
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// ============================================================================
// TYPES
// ============================================================================

export type StorageBucket = 'attachments' | 'media';

// ============================================================================
// CONFIGURATION
// ============================================================================

const ENDPOINT = process.env.STORAGE_ENDPOINT || 'http://127.0.0.1:9000';
const REGION = process.env.STORAGE_REGION || 'us-east-1';
const ACCESS_KEY = process.env.STORAGE_ACCESS_KEY_ID || 'minioadmin';
const SECRET_KEY = process.env.STORAGE_SECRET_ACCESS_KEY || 'minioadmin';

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
// S3 CLIENT
// ============================================================================

export const storageClient = new S3Client({
  region: REGION,
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_KEY,
  },
  forcePathStyle: true, // Required for MinIO and Supabase local storage
});

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
  const command = new PutObjectCommand({
    Bucket: BUCKET_CONFIG[bucket].name,
    Key: key,
    ContentType: contentType,
  });
  
  return getSignedUrl(storageClient, command, { expiresIn: 3600 });
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
