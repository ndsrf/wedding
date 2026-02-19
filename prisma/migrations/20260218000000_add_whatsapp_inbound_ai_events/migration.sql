-- Add MESSAGE_RECEIVED and AI_REPLY_SENT to EventType enum
-- These are used to track inbound WhatsApp messages from guests
-- and the AI-generated auto-replies sent back to them.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'MESSAGE_RECEIVED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'EventType')) THEN
        ALTER TYPE "EventType" ADD VALUE 'MESSAGE_RECEIVED';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'AI_REPLY_SENT' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'EventType')) THEN
        ALTER TYPE "EventType" ADD VALUE 'AI_REPLY_SENT';
    END IF;
END $$;
