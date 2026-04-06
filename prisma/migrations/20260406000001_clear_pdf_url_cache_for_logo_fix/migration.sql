-- One-time migration to clear cached PDF URLs so all existing quotes,
-- contracts and invoices are regenerated with the planner logo embedded.
-- This is safe: the PDF generation routes recreate and re-upload the PDF
-- to Vercel Blob on the next download click.

UPDATE "Quote"    SET pdf_url = NULL WHERE pdf_url IS NOT NULL;
UPDATE "Contract" SET pdf_url = NULL WHERE pdf_url IS NOT NULL;
UPDATE "Invoice"  SET pdf_url = NULL WHERE pdf_url IS NOT NULL;
