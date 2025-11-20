import "@testing-library/jest-dom/vitest"
import { vi } from "vitest"

// Set up test environment variables
vi.stubEnv("NODE_ENV", "test")
vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000")
vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:3000/api")
vi.stubEnv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/ui_syncup_dev")
vi.stubEnv("SUPABASE_URL", "https://test.supabase.co")
vi.stubEnv("SUPABASE_ANON_KEY", "test-anon-key")
vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
vi.stubEnv("R2_ACCOUNT_ID", "test-account-id")
vi.stubEnv("R2_ACCESS_KEY_ID", "test-access-key")
vi.stubEnv("R2_SECRET_ACCESS_KEY", "test-secret-key")
vi.stubEnv("R2_BUCKET_NAME", "test-bucket")
vi.stubEnv("R2_PUBLIC_URL", "https://test.r2.dev")
vi.stubEnv("GOOGLE_CLIENT_ID", "test-client-id")
vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-client-secret")
vi.stubEnv("GOOGLE_REDIRECT_URI", "http://localhost:3000/api/auth/callback/google")
vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-key-with-at-least-32-characters")
vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000")
vi.stubEnv("RESEND_API_KEY", "re_test_key")
vi.stubEnv("RESEND_FROM_EMAIL", "test@example.com")
