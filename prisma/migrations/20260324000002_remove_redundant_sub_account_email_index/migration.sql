-- Remove redundant index on planner_sub_accounts.email.
-- The column already carries a UNIQUE constraint, which is backed by a unique
-- index that also serves fast lookups. The extra plain index is unnecessary.

DROP INDEX IF EXISTS "planner_sub_accounts_email_idx";
