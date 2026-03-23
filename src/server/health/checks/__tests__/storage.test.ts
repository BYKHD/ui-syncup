import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSend } = vi.hoisted(() => ({ mockSend: vi.fn() }))

vi.mock('@aws-sdk/client-s3', () => ({
  // Regular function (not arrow) so `new S3Client()` works.
  // Returning an object from a constructor uses that object instead of `this`.
  S3Client: function MockS3Client() {
    return { send: mockSend }
  },
  PutObjectCommand:    function(args: unknown) { return args },
  HeadObjectCommand:   function(args: unknown) { return args },
  DeleteObjectCommand: function(args: unknown) { return args },
  GetObjectCommand:    function(args: unknown) { return args },
  CreateBucketCommand: function(args: unknown) { return args },
  PutBucketPolicyCommand: function(args: unknown) { return args },
  HeadBucketCommand:   function(args: unknown) { return args },
}))

import { checkStorage } from '../storage'

describe('checkStorage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns ok when all S3 operations succeed', async () => {
    mockSend.mockResolvedValue({})

    const result = await checkStorage()

    expect(result.status).toBe('ok')
    expect(result.message).toContain('Storage accessible')
    expect(result.latencyMs).toBeGreaterThanOrEqual(0)
    // 2 buckets × 3 operations (PutObject, HeadObject, DeleteObject) = 6 calls
    expect(mockSend).toHaveBeenCalledTimes(6)
  })

  it('returns error when a PutObject fails', async () => {
    mockSend.mockRejectedValueOnce(new Error('Access Denied'))

    const result = await checkStorage()

    expect(result.status).toBe('error')
    expect(result.message).toContain('Access Denied')
    expect(result.hint).toContain('STORAGE_REGION')
  })
})
