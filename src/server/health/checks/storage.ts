import {
  PutObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getStorageClient, getBucketName } from '@/lib/storage'
import type { StorageBucket } from '@/lib/storage'
import type { CheckResult } from '../types'

async function probeOneBucket(type: StorageBucket): Promise<void> {
  const client = getStorageClient(type)
  const bucket = getBucketName(type)
  const probeKey = `_health-check/probe-${Date.now()}.txt`

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: probeKey,
        Body: 'health-check',
        ContentType: 'text/plain',
      })
    )
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: probeKey }))
  } finally {
    // Best-effort cleanup — don't suppress the original error
    try {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: probeKey }))
    } catch { /* ignore */ }
  }
}

export async function checkStorage(): Promise<CheckResult> {
  const start = performance.now()

  try {
    await Promise.all([
      probeOneBucket('attachments'),
      probeOneBucket('media'),
    ])

    const latencyMs = Math.round(performance.now() - start)
    return {
      status: 'ok',
      message: `Storage accessible (buckets: ${getBucketName('attachments')}, ${getBucketName('media')})`,
      latencyMs,
    }
  } catch (error) {
    const latencyMs = Math.round(performance.now() - start)
    const message = error instanceof Error ? error.message : 'Unknown storage error'
    return {
      status: 'error',
      message,
      latencyMs,
      hint: 'Check STORAGE_REGION, STORAGE_ATTACHMENTS_BUCKET / STORAGE_MEDIA_BUCKET, and the corresponding ACCESS_KEY_ID / SECRET_ACCESS_KEY vars. For AWS S3/Lightsail, do not set STORAGE_ENDPOINT.',
    }
  }
}
