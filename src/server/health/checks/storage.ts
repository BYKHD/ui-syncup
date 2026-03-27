import {
  PutObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getStorageClient, getBucketName } from '@/lib/storage'
import type { CheckResult } from '../types'

export async function checkStorage(): Promise<CheckResult> {
  const start = performance.now()

  const client = getStorageClient()
  const bucket = getBucketName()
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

    const latencyMs = Math.round(performance.now() - start)
    return {
      status: 'ok',
      message: `Storage accessible (bucket: ${bucket})`,
      latencyMs,
    }
  } catch (error) {
    const latencyMs = Math.round(performance.now() - start)
    const message = error instanceof Error ? error.message : 'Unknown storage error'
    return {
      status: 'error',
      message,
      latencyMs,
      hint: 'Check STORAGE_REGION, STORAGE_BUCKET, STORAGE_ACCESS_KEY_ID, and STORAGE_SECRET_ACCESS_KEY. For AWS S3 / Lightsail, do not set STORAGE_ENDPOINT.',
    }
  } finally {
    // Best-effort cleanup — don't suppress the original error
    try {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: probeKey }))
    } catch { /* ignore */ }
  }
}
