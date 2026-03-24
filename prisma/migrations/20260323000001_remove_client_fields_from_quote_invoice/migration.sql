-- Migration: Remove copied client fields from quotes and invoices.
-- Client data is now read exclusively from the customers table via customer_id.
-- Rewritten to be fully deterministic and free of duplicate-record risk.

-- ─────────────────────────────────────────────────────────────────────────────
-- QUOTES
-- Create one customer per orphaned quote using a temp mapping table so each
-- quote is linked to exactly the customer that was created for it.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TEMP TABLE _quote_customer_map AS
SELECT
  q.id                     AS quote_id,
  gen_random_uuid()::text  AS new_customer_id,
  q.planner_id,
  q.couple_names,
  q.client_email,
  q.client_phone,
  q.client_address
FROM "quotes" q
WHERE q.customer_id IS NULL;

INSERT INTO "customers" (id, planner_id, name, email, phone, address, created_at, updated_at)
SELECT new_customer_id, planner_id, couple_names, client_email, client_phone, client_address, NOW(), NOW()
FROM _quote_customer_map;

-- 1-to-1 update: safe because each quote maps to exactly one new_customer_id
UPDATE "quotes" q
SET customer_id = m.new_customer_id
FROM _quote_customer_map m
WHERE q.id = m.quote_id;

-- ─────────────────────────────────────────────────────────────────────────────
-- INVOICES — pass 1: link to an existing customer by email (deterministic LIMIT 1)
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE "invoices" i
SET customer_id = (
  SELECT c.id
  FROM "customers" c
  WHERE c.planner_id = i.planner_id
    AND c.email IS NOT NULL
    AND c.email = i.client_email
  ORDER BY c.created_at DESC
  LIMIT 1
)
WHERE i.customer_id IS NULL
  AND i.client_email IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- INVOICES — pass 2: remaining orphaned invoices get their own new customer
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TEMP TABLE _invoice_customer_map AS
SELECT
  i.id                     AS invoice_id,
  gen_random_uuid()::text  AS new_customer_id,
  i.planner_id,
  i.client_name,
  i.client_email,
  i.client_id_number,
  i.client_address
FROM "invoices" i
WHERE i.customer_id IS NULL
  AND i.client_name IS NOT NULL;

INSERT INTO "customers" (id, planner_id, name, email, id_number, address, created_at, updated_at)
SELECT new_customer_id, planner_id, client_name, client_email, client_id_number, client_address, NOW(), NOW()
FROM _invoice_customer_map;

UPDATE "invoices" i
SET customer_id = m.new_customer_id
FROM _invoice_customer_map m
WHERE i.id = m.invoice_id;

-- Copy id_number from invoices into matching customer records where not already set
UPDATE "customers" c
SET id_number = i.client_id_number
FROM "invoices" i
WHERE i.customer_id = c.id
  AND i.client_id_number IS NOT NULL
  AND c.id_number IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- Drop the redundant columns
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE "quotes" DROP COLUMN IF EXISTS "client_email";
ALTER TABLE "quotes" DROP COLUMN IF EXISTS "client_phone";
ALTER TABLE "quotes" DROP COLUMN IF EXISTS "client_address";

ALTER TABLE "invoices" DROP COLUMN IF EXISTS "client_name";
ALTER TABLE "invoices" DROP COLUMN IF EXISTS "client_email";
ALTER TABLE "invoices" DROP COLUMN IF EXISTS "client_id_number";
ALTER TABLE "invoices" DROP COLUMN IF EXISTS "client_address";
