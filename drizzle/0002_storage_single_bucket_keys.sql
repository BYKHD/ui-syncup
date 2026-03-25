-- =============================================================================
-- Migration: single-bucket storage key normalisation
-- =============================================================================
-- Converts storage URLs stored in the database to raw storage keys.
--
-- Before: full public URLs, e.g.
--   http://127.0.0.1:9000/ui-syncup-attachments/issues/t/p/i/uuid.png
--   https://my-bucket.s3.ap-southeast-1.amazonaws.com/issues/t/p/i/uuid.png
--   https://my-bucket.ap-southeast-1.amazonaws.com/avatars/user/uuid.jpg
--
-- After: prefixed storage keys, e.g.
--   attachments/issues/t/p/i/uuid.png
--   media/avatars/user/uuid.jpg
--   media/teams/team/uuid.jpg
--
-- The migration uses known key-path patterns (issues/, avatars/, teams/) to
-- extract the meaningful path from any URL format (path-style or virtual-hosted)
-- and prepend the correct category prefix.
--
-- Rows that already contain a raw key (no 'http' prefix) are left untouched,
-- making this migration safe to re-run.
-- =============================================================================

-- issue_attachments.url
-- Pattern: the path always contains '/issues/' for attachment keys
UPDATE issue_attachments
SET url = 'attachments/issues/' || substring(url FROM '/issues/(.+)$')
WHERE url LIKE 'http%'
  AND url LIKE '%/issues/%';

-- issue_attachments.thumbnail_url (optional column — skip NULLs)
UPDATE issue_attachments
SET thumbnail_url = 'attachments/issues/' || substring(thumbnail_url FROM '/issues/(.+)$')
WHERE thumbnail_url IS NOT NULL
  AND thumbnail_url LIKE 'http%'
  AND thumbnail_url LIKE '%/issues/%';

-- users.image — avatar keys always contain '/avatars/'
UPDATE users
SET image = 'media/avatars/' || substring(image FROM '/avatars/(.+)$')
WHERE image IS NOT NULL
  AND image LIKE 'http%'
  AND image LIKE '%/avatars/%';

-- teams.image — team logo keys always contain '/teams/'
UPDATE teams
SET image = 'media/teams/' || substring(image FROM '/teams/(.+)$')
WHERE image IS NOT NULL
  AND image LIKE 'http%'
  AND image LIKE '%/teams/%';
