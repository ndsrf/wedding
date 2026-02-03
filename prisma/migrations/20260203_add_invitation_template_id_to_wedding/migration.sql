-- Add invitation_template_id to Wedding model
ALTER TABLE "weddings" ADD COLUMN "invitation_template_id" TEXT;

-- Add foreign key constraint
ALTER TABLE "weddings" ADD CONSTRAINT "weddings_invitation_template_id_fkey" FOREIGN KEY ("invitation_template_id") REFERENCES "invitation_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
