import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { 
  checkEmailHealth, 
  checkStorageHealth, 
  checkRedisHealth 
} from '../health-check-service';

// Mock DB because checkDatabaseHealth uses it
vi.mock('@/lib/db', () => ({
  db: {
    execute: vi.fn(),
  },
}));

describe('Health Check Service Properties', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });


  it('should return "not_configured" when RESEND_API_KEY is missing', async () => {
    delete process.env.RESEND_API_KEY;
    const health = await checkEmailHealth();
    expect(health.status).toBe('not_configured');
    expect(health.degradedBehavior).toBeDefined();
  });

  it('should return "error" when RESEND_API_KEY is invalid', async () => {
    process.env.RESEND_API_KEY = 'invalid_key';
    const health = await checkEmailHealth();
    expect(health.status).toBe('error');
  });

  it('should return "connected" when RESEND_API_KEY is valid', async () => {
    process.env.RESEND_API_KEY = 're_123456';
    const health = await checkEmailHealth();
    expect(health.status).toBe('connected');
  });

  it('should return "not_configured" when Storage keys are missing', async () => {
    delete process.env.S3_ACCESS_KEY_ID;
    delete process.env.S3_SECRET_ACCESS_KEY;
    delete process.env.S3_BUCKET;
    const health = await checkStorageHealth();
    expect(health.status).toBe('not_configured');
  });

  it('should return "connected" when Storage keys are present', async () => {
    process.env.S3_ACCESS_KEY_ID = 'key';
    process.env.S3_SECRET_ACCESS_KEY = 'secret';
    process.env.S3_BUCKET = 'bucket';
    const health = await checkStorageHealth();
    expect(health.status).toBe('connected');
  });

  it('should return "not_configured" when REDIS_URL is missing', async () => {
    delete process.env.REDIS_URL;
    const health = await checkRedisHealth();
    expect(health.status).toBe('not_configured');
  });

  it('should return "connected" when REDIS_URL is valid', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379';
    const health = await checkRedisHealth();
    expect(health.status).toBe('connected');
  });
});
