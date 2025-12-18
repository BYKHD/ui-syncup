-- better-auth verification storage table
-- Note: id is TEXT because better-auth generates alphanumeric string IDs, not UUIDs
CREATE TABLE IF NOT EXISTS "better_auth_verifications" (
    "id" text PRIMARY KEY,
    "identifier" varchar(255) NOT NULL UNIQUE,
    "value" text NOT NULL,
    "expires_at" timestamptz NOT NULL,
    "created_at" timestamptz NOT NULL DEFAULT NOW(),
    "updated_at" timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "better_auth_verifications_identifier_idx"
    ON "better_auth_verifications" ("identifier");

