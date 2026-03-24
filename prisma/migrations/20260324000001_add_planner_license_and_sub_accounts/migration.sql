-- Add PlannerLicense table: stores per-company license limits.
-- Defaults: max 10 weddings, max 2 sub-planner accounts.

CREATE TABLE "planner_licenses" (
    "id"               TEXT NOT NULL,
    "planner_id"       TEXT NOT NULL,
    "max_weddings"     INTEGER NOT NULL DEFAULT 10,
    "max_sub_planners" INTEGER NOT NULL DEFAULT 2,
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planner_licenses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "planner_licenses_planner_id_key" ON "planner_licenses"("planner_id");

ALTER TABLE "planner_licenses"
    ADD CONSTRAINT "planner_licenses_planner_id_fkey"
    FOREIGN KEY ("planner_id")
    REFERENCES "wedding_planners"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Add PlannerSubAccount table: extra login accounts linked to a planner company.

CREATE TABLE "planner_sub_accounts" (
    "id"                  TEXT NOT NULL,
    "company_planner_id"  TEXT NOT NULL,
    "email"               TEXT NOT NULL,
    "name"                TEXT NOT NULL,
    "google_id"           TEXT,
    "auth_provider"       TEXT NOT NULL DEFAULT 'GOOGLE',
    "last_login_provider" TEXT,
    "preferred_language"  TEXT NOT NULL DEFAULT 'EN',
    "enabled"             BOOLEAN NOT NULL DEFAULT true,
    "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by"          TEXT NOT NULL,
    "last_login_at"       TIMESTAMP(3),

    CONSTRAINT "planner_sub_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "planner_sub_accounts_email_key" ON "planner_sub_accounts"("email");
CREATE UNIQUE INDEX "planner_sub_accounts_google_id_key" ON "planner_sub_accounts"("google_id");
CREATE INDEX "planner_sub_accounts_company_planner_id_idx" ON "planner_sub_accounts"("company_planner_id");
CREATE INDEX "planner_sub_accounts_email_idx" ON "planner_sub_accounts"("email");

ALTER TABLE "planner_sub_accounts"
    ADD CONSTRAINT "planner_sub_accounts_company_planner_id_fkey"
    FOREIGN KEY ("company_planner_id")
    REFERENCES "wedding_planners"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Add license_deleted flag to weddings.
-- Set to true when a wedding is soft-deleted due to a license limit downgrade.
-- Such weddings cannot be restored by the planner.

ALTER TABLE "weddings" ADD COLUMN "license_deleted" BOOLEAN NOT NULL DEFAULT false;
