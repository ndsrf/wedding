-- AlterEnum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CONFIRMATION' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'TemplateType')) THEN
        ALTER TYPE "TemplateType" ADD VALUE 'CONFIRMATION';
    END IF;
END $$;
