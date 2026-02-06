-- Add MESSAGE_DELIVERED, MESSAGE_READ, MESSAGE_FAILED to EventType enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'MESSAGE_DELIVERED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'EventType')) THEN
        ALTER TYPE "EventType" ADD VALUE 'MESSAGE_DELIVERED';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'MESSAGE_READ' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'EventType')) THEN
        ALTER TYPE "EventType" ADD VALUE 'MESSAGE_READ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'MESSAGE_FAILED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'EventType')) THEN
        ALTER TYPE "EventType" ADD VALUE 'MESSAGE_FAILED';
    END IF;
END $$;
