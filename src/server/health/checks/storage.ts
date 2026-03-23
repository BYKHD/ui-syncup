import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import type { CheckResult } from '../types'

function buildClient(): S3Client {
  return new S3Client({
    region: process.env.STORAGE_REGION ?? 'us-east-1',
    endpoint: process.env.STORAGE_ENDPOINT ?? 'http://127.0.0.1:9000',
    credentials: {
      accessKeyId:
        process.env.STORAGE_ACCESS_KEY_ID ??
        process.env.STORAGE_ATTACHMENTS_ACCESS_KEY ??
        'minioadmin',
      secretAccessKey:
        process.env.STORAGE_SECRET_ACCESS_KEY ??
        process.env.STORAGE_ATTACHMENTS_SECRET_KEY ??
        'minioadmin',
    },
    forcePathStyle: true,
  })
}

export async function checkStorage(): Promise<CheckResult> {
  const bucket = process.env.STORAGE_ATTACHMENTS_BUCKET ?? 'ui-syncup-attachments'
  const probeKey = `_health-check/probe-${Date.now()}.txt`
  const client = buildClient()
  const start = performance.now()

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
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: probeKey }))

    const latencyMs = Math.round(performance.now() - start)
    return {
      status: 'ok',
      message: `Storage accessible (bucket: ${bucket})`,
      latencyMs,
    }
  } catch (error) {
    // Best-effort cleanup
    try {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: probeKey }))
    } catch { /* ignore */ }

    const latencyMs = Math.round(performance.now() - start)
    const message = error instanceof Error ? error.message : 'Unknown storage error'
    return {
      status: 'error',
      message,
      latencyMs,
      hint: 'Check STORAGE_ENDPOINT, STORAGE_ACCESS_KEY_ID, STORAGE_SECRET_ACCESS_KEY, and STORAGE_ATTACHMENTS_BUCKET',
    }
  }
}
