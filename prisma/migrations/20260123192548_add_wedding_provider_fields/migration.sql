-- AlterTable
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wedding_providers' AND column_name='name') THEN
        ALTER TABLE "wedding_providers" ADD COLUMN "name" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wedding_providers' AND column_name='contact_name') THEN
        ALTER TABLE "wedding_providers" ADD COLUMN "contact_name" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wedding_providers' AND column_name='email') THEN
        ALTER TABLE "wedding_providers" ADD COLUMN "email" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wedding_providers' AND column_name='phone') THEN
        ALTER TABLE "wedding_providers" ADD COLUMN "phone" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wedding_providers' AND column_name='website') THEN
        ALTER TABLE "wedding_providers" ADD COLUMN "website" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='wedding_providers' AND column_name='social_media') THEN
        ALTER TABLE "wedding_providers" ADD COLUMN "social_media" TEXT;
    END IF;
END $$;
