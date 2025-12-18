-- better-auth verification storage table
-- Note: id is UUID because better-auth is configured with generateId: false
-- letting PostgreSQL generate UUIDs via gen_random_uuid()
CREATE TABLE IF NOT EXISTS "better_auth_verifications" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "identifier" varchar(255) NOT NULL UNIQUE,
    "value" text NOT NULL,
    "expires_at" timestamptz NOT NULL,
    "created_at" timestamptz NOT NULL DEFAULT NOW(),
    "updated_at" timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "better_auth_verifications_identifier_idx"
    ON "better_auth_verifications" ("identifier");


