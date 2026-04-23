-- CreateTable
CREATE TABLE "guest_labels" (
    "id" TEXT NOT NULL,
    "wedding_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guest_labels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_label_assignments" (
    "family_id" TEXT NOT NULL,
    "label_id" TEXT NOT NULL,

    CONSTRAINT "family_label_assignments_pkey" PRIMARY KEY ("family_id","label_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "guest_labels_wedding_id_name_key" ON "guest_labels"("wedding_id", "name");

-- CreateIndex
CREATE INDEX "guest_labels_wedding_id_idx" ON "guest_labels"("wedding_id");

-- CreateIndex
CREATE INDEX "family_label_assignments_family_id_idx" ON "family_label_assignments"("family_id");

-- CreateIndex
CREATE INDEX "family_label_assignments_label_id_idx" ON "family_label_assignments"("label_id");

-- AddForeignKey
ALTER TABLE "guest_labels" ADD CONSTRAINT "guest_labels_wedding_id_fkey" FOREIGN KEY ("wedding_id") REFERENCES "weddings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_label_assignments" ADD CONSTRAINT "family_label_assignments_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_label_assignments" ADD CONSTRAINT "family_label_assignments_label_id_fkey" FOREIGN KEY ("label_id") REFERENCES "guest_labels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
