-- Drop the non-unique index created in the previous migration
DROP INDEX IF EXISTS "email_verification_codes_email_idx";

-- Replace with a unique constraint (also serves as the index)
ALTER TABLE "email_verification_codes" ADD CONSTRAINT "email_verification_codes_email_key" UNIQUE ("email");

-- Add last_sent_at for server-side rate limiting
ALTER TABLE "email_verification_codes" ADD COLUMN "last_sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
