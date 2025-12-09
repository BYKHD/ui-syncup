import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const BUCKET_NAME = process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'issues';
const ENDPOINT = process.env.STORAGE_ENDPOINT || 'http://127.0.0.1:9000'; // MinIO default
const REGION = process.env.STORAGE_REGION || 'us-east-1';
const ACCESS_KEY = process.env.STORAGE_ACCESS_KEY_ID || 'minioadmin';
const SECRET_KEY = process.env.STORAGE_SECRET_ACCESS_KEY || 'minioadmin';
const PUBLIC_URL_BASE = process.env.STORAGE_PUBLIC_URL || 'http://127.0.0.1:9000/issues';

export const storageClient = new S3Client({
  region: REGION,
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_KEY,
  },
  forcePathStyle: true, // Required for Supabase local storage
});

export async function generateUploadUrl(key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });
  
  // Expiration in seconds
  return getSignedUrl(storageClient, command, { expiresIn: 3600 });
}

export function getPublicUrl(key: string): string {
  // Ensure no double slashes if base ends with / and key starts with /
  const baseUrl = PUBLIC_URL_BASE.replace(/\/$/, '');
  const cleanKey = key.replace(/^\//, '');
  return `${baseUrl}/${cleanKey}`;
}
