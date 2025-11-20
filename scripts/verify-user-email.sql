-- Force verify email for a user (development only)
-- Usage: npx supabase db psql < scripts/verify-user-email.sql

-- Option 1: Verify by email
UPDATE users 
SET email_verified = true, updated_at = NOW() 
WHERE email = 'your-email@example.com';

-- Option 2: Verify the most recent user
-- UPDATE users 
-- SET email_verified = true, updated_at = NOW() 
-- WHERE id = (SELECT id FROM users ORDER BY created_at DESC LIMIT 1);

-- Option 3: Verify ALL users (useful for testing)
-- UPDATE users 
-- SET email_verified = true, updated_at = NOW();

-- Check verification status
SELECT id, email, email_verified, created_at 
FROM users 
ORDER BY created_at DESC 
LIMIT 5;
