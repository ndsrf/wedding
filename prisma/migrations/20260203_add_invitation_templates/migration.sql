-- CreateTable invitation_templates
CREATE TABLE "invitation_templates" (
    "id" TEXT NOT NULL,
    "wedding_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_system_template" BOOLEAN NOT NULL DEFAULT false,
    "based_on_preset" TEXT,
    "design" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invitation_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "invitation_templates_wedding_id_idx" ON "invitation_templates"("wedding_id");

-- AddForeignKey
ALTER TABLE "invitation_templates" ADD CONSTRAINT "invitation_templates_wedding_id_fkey" FOREIGN KEY ("wedding_id") REFERENCES "weddings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
