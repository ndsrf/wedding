-- Add invitation_template_id to Wedding model
ALTER TABLE "weddings" ADD COLUMN IF NOT EXISTS "invitation_template_id" TEXT;

-- Add foreign key constraint
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='weddings_invitation_template_id_fkey') THEN
        ALTER TABLE "weddings" ADD CONSTRAINT "weddings_invitation_template_id_fkey" FOREIGN KEY ("invitation_template_id") REFERENCES "invitation_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
