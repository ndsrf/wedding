-- Add wedding_day_invitation_template_id to Wedding model for independent day-of-wedding invitation template override
ALTER TABLE "weddings" ADD COLUMN IF NOT EXISTS "wedding_day_invitation_template_id" TEXT;

-- Add foreign key constraint
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='weddings_wedding_day_invitation_template_id_fkey') THEN
        ALTER TABLE "weddings" ADD CONSTRAINT "weddings_wedding_day_invitation_template_id_fkey" FOREIGN KEY ("wedding_day_invitation_template_id") REFERENCES "invitation_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Add index for the new column
CREATE INDEX IF NOT EXISTS "weddings_wedding_day_invitation_template_id_idx" ON "weddings"("wedding_day_invitation_template_id");
