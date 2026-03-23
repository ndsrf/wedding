-- Migration: Remove copied client fields from quotes and invoices.
-- Client data is now read exclusively from the customers table via customer_id.

-- Step 1: For quotes that have no customer_id but do have client data,
--         create a customer record so no data is lost.
INSERT INTO "customers" (id, planner_id, name, email, phone, address, created_at, updated_at)
SELECT
  gen_random_uuid()::text,
  q.planner_id,
  q.couple_names,
  q.client_email,
  q.client_phone,
  q.client_address,
  NOW(),
  NOW()
FROM "quotes" q
WHERE q.customer_id IS NULL
  AND (q.client_email IS NOT NULL OR q.client_phone IS NOT NULL OR q.client_address IS NOT NULL);

-- Step 2: Link those newly-created customers back to their quotes.
UPDATE "quotes" q
SET customer_id = c.id
FROM "customers" c
WHERE q.customer_id IS NULL
  AND c.planner_id = q.planner_id
  AND c.name = q.couple_names
  AND (
    (c.email IS NOT NULL AND c.email = q.client_email)
    OR (c.phone IS NOT NULL AND c.phone = q.client_phone)
    OR (q.client_email IS NULL AND q.client_phone IS NULL AND c.address = q.client_address)
  );

-- Step 3: For invoices that have no customer_id but do have client data,
--         create a customer record.
INSERT INTO "customers" (id, planner_id, name, email, address, created_at, updated_at)
SELECT
  gen_random_uuid()::text,
  i.planner_id,
  i.client_name,
  i.client_email,
  i.client_address,
  NOW(),
  NOW()
FROM "invoices" i
WHERE i.customer_id IS NULL
  AND i.client_name IS NOT NULL;

-- Step 4: Link newly-created customers back to their invoices.
UPDATE "invoices" i
SET customer_id = c.id
FROM "customers" c
WHERE i.customer_id IS NULL
  AND c.planner_id = i.planner_id
  AND c.name = i.client_name
  AND (c.email IS NULL OR c.email = i.client_email);

-- Step 5: Also copy id_number from invoices into matching customer records.
UPDATE "customers" c
SET id_number = i.client_id_number
FROM "invoices" i
WHERE i.customer_id = c.id
  AND i.client_id_number IS NOT NULL
  AND c.id_number IS NULL;

-- Step 6: Drop the redundant columns from quotes.
ALTER TABLE "quotes" DROP COLUMN IF EXISTS "client_email";
ALTER TABLE "quotes" DROP COLUMN IF EXISTS "client_phone";
ALTER TABLE "quotes" DROP COLUMN IF EXISTS "client_address";

-- Step 7: Drop the redundant columns from invoices.
ALTER TABLE "invoices" DROP COLUMN IF EXISTS "client_name";
ALTER TABLE "invoices" DROP COLUMN IF EXISTS "client_email";
ALTER TABLE "invoices" DROP COLUMN IF EXISTS "client_id_number";
ALTER TABLE "invoices" DROP COLUMN IF EXISTS "client_address";
