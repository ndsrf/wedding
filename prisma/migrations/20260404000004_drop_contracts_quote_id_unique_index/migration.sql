-- The migration 20260320142321_add_customer_entity attempted to remove the unique
-- constraint on contracts.quote_id using DROP CONSTRAINT, but Prisma had created it
-- as a UNIQUE INDEX ("contracts_quote_id_key"), not a named table constraint.
-- DROP CONSTRAINT is a no-op for indexes, so the index survived and continues to
-- prevent creating more than one contract per quote.
-- This migration drops it correctly via DROP INDEX.

DROP INDEX IF EXISTS "contracts_quote_id_key";
