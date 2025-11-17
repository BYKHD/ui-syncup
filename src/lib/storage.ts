import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  type PutObjectCommandInput,
  type GetObjectCommandInput,
  type DeleteObjectCommandInput,
  type HeadObjectCommandInput,
  type ListObjectsV2CommandInput,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { env } from "./env"

/**
 * Storage operation result types
 */
export interface UploadResult {
  key: string
  url: string
  bucket: string
  etag?: string
}

export interface DownloadResult {
  body: ReadableStream | Blob | null
  contentType?: string
  contentLength?: number
  lastModified?: Date
}

export interface ObjectMetadata {
  key: string
  size: number
  lastModified: Date
  etag: string
  contentType?: string
}

export interface ListResult {
  objects: ObjectMetadata[]
  isTruncated: boolean
  nextContinuationToken?: string
}

export interface DeleteResult {
  key: string
  deleted: boolean
}

/**
 * Storage client options
 */
export interface StorageClientOptions {
  accountId?: string
  accessKeyId?: string
  secretAccessKey?: string
  bucketName?: string
  publicUrl?: string
}

/**
 * Upload options
 */
export interface UploadOptions {
  key: string
  body: Buffer | Uint8Array | Blob | string | ReadableStream
  contentType?: string
  metadata?: Record<string, string>
  cacheControl?: string
}

/**
 * Download options
 */
export interface DownloadOptions {
  key: string
}

/**
 * Signed URL options
 */
export interface SignedUrlOptions {
  key: string
  expiresIn?: number // seconds, default 3600 (1 hour)
  operation?: "getObject" | "putObject"
}

/**
 * List options
 */
export interface ListOptions {
  prefix?: string
  maxKeys?: number
  continuationToken?: string
}

/**
 * Cloudflare R2 Storage Client
 * 
 * S3-compatible client for Cloudflare R2 object storage.
 * Supports upload, download, delete, list, and signed URL generation.
 * 
 * @example
 * ```ts
 * const storage = createStorageClient()
 * 
 * // Upload a file
 * const result = await storage.upload({
 *   key: 'images/avatar.jpg',
 *   body: buffer,
 *   contentType: 'image/jpeg'
 * })
 * 
 * // Download a file
 * const file = await storage.download({ key: 'images/avatar.jpg' })
 * 
 * // Generate signed URL
 * const url = await storage.getSignedUrl({ key: 'images/avatar.jpg' })
 * ```
 */
export class StorageClient {
  private client: S3Client
  private bucketName: string
  private publicUrl: string

  constructor(options?: StorageClientOptions) {
    const accountId = options?.accountId || env.R2_ACCOUNT_ID
    const accessKeyId = options?.accessKeyId || env.R2_ACCESS_KEY_ID
    const secretAccessKey = options?.secretAccessKey || env.R2_SECRET_ACCESS_KEY
    this.bucketName = options?.bucketName || env.R2_BUCKET_NAME
    this.publicUrl = options?.publicUrl || env.R2_PUBLIC_URL

    // Configure S3 client for Cloudflare R2
    this.client = new S3Client({
      region: "auto", // R2 uses 'auto' region
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })
  }

  /**
   * Upload a file to R2 storage
   */
  async upload(options: UploadOptions): Promise<UploadResult> {
    const { key, body, contentType, metadata, cacheControl } = options

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: body as PutObjectCommandInput["Body"],
      ContentType: contentType,
      Metadata: metadata,
      CacheControl: cacheControl,
    })

    const response = await this.client.send(command)

    return {
      key,
      url: this.getPublicUrl(key),
      bucket: this.bucketName,
      etag: response.ETag,
    }
  }

  /**
   * Download a file from R2 storage
   */
  async download(options: DownloadOptions): Promise<DownloadResult> {
    const { key } = options

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    })

    const response = await this.client.send(command)

    return {
      body: response.Body as ReadableStream | Blob | null,
      contentType: response.ContentType,
      contentLength: response.ContentLength,
      lastModified: response.LastModified,
    }
  }

  /**
   * Delete a file from R2 storage
   */
  async delete(key: string): Promise<DeleteResult> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    })

    await this.client.send(command)

    return {
      key,
      deleted: true,
    }
  }

  /**
   * Check if a file exists in R2 storage
   */
  async exists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })

      await this.client.send(command)
      return true
    } catch (error) {
      // HeadObject throws NotFound error if object doesn't exist
      return false
    }
  }

  /**
   * Get metadata for a file in R2 storage
   */
  async getMetadata(key: string): Promise<ObjectMetadata | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })

      const response = await this.client.send(command)

      return {
        key,
        size: response.ContentLength || 0,
        lastModified: response.LastModified || new Date(),
        etag: response.ETag || "",
        contentType: response.ContentType,
      }
    } catch (error) {
      return null
    }
  }

  /**
   * List files in R2 storage
   */
  async list(options?: ListOptions): Promise<ListResult> {
    const command = new ListObjectsV2Command({
      Bucket: this.bucketName,
      Prefix: options?.prefix,
      MaxKeys: options?.maxKeys,
      ContinuationToken: options?.continuationToken,
    })

    const response = await this.client.send(command)

    const objects: ObjectMetadata[] =
      response.Contents?.map((item) => ({
        key: item.Key || "",
        size: item.Size || 0,
        lastModified: item.LastModified || new Date(),
        etag: item.ETag || "",
      })) || []

    return {
      objects,
      isTruncated: response.IsTruncated || false,
      nextContinuationToken: response.NextContinuationToken,
    }
  }

  /**
   * Generate a signed URL for temporary access to a file
   */
  async getSignedUrl(options: SignedUrlOptions): Promise<string> {
    const { key, expiresIn = 3600, operation = "getObject" } = options

    const command =
      operation === "putObject"
        ? new PutObjectCommand({
            Bucket: this.bucketName,
            Key: key,
          })
        : new GetObjectCommand({
            Bucket: this.bucketName,
            Key: key,
          })

    return getSignedUrl(this.client, command, { expiresIn })
  }

  /**
   * Get the public URL for a file
   * Note: Only works if the bucket/object has public access configured
   */
  getPublicUrl(key: string): string {
    return `${this.publicUrl}/${key}`
  }

  /**
   * Delete multiple files from R2 storage
   */
  async deleteMany(keys: string[]): Promise<DeleteResult[]> {
    const results = await Promise.allSettled(
      keys.map((key) => this.delete(key))
    )

    return results.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value
      }
      return {
        key: keys[index],
        deleted: false,
      }
    })
  }

  /**
   * Copy a file within R2 storage
   */
  async copy(sourceKey: string, destinationKey: string): Promise<UploadResult> {
    // Download source file
    const source = await this.download({ key: sourceKey })
    
    if (!source.body) {
      throw new Error(`Source file not found: ${sourceKey}`)
    }

    // Upload to destination
    return this.upload({
      key: destinationKey,
      body: source.body as ReadableStream | Blob,
      contentType: source.contentType,
    })
  }
}

/**
 * Create a storage client instance
 * 
 * Factory function that creates a configured StorageClient instance
 * using environment variables.
 * 
 * @param options - Optional configuration to override environment variables
 * @returns Configured StorageClient instance
 * 
 * @example
 * ```ts
 * // Use default environment configuration
 * const storage = createStorageClient()
 * 
 * // Override with custom configuration
 * const customStorage = createStorageClient({
 *   bucketName: 'custom-bucket',
 *   publicUrl: 'https://custom.example.com'
 * })
 * ```
 */
export function createStorageClient(
  options?: StorageClientOptions
): StorageClient {
  return new StorageClient(options)
}

/**
 * Default storage client instance
 * Singleton instance using environment configuration
 */
export const storage = createStorageClient()
