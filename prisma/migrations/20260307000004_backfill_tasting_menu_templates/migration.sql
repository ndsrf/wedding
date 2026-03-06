-- Backfill TASTING_MENU templates for existing planners and weddings.
-- Migration 20260307000001 inserted TASTING_MENU into master_message_templates
-- but did not propagate them to already-existing planner or wedding templates.

-- Step 1: Seed TASTING_MENU templates into every planner that is missing them.
DO $$
DECLARE
    planner_record RECORD;
    master_template RECORD;
    inserted_count INT;
BEGIN
    FOR planner_record IN SELECT id FROM wedding_planners LOOP
        -- Only insert the missing TASTING_MENU rows (planner may have other types already)
        inserted_count := 0;
        FOR master_template IN
            SELECT * FROM master_message_templates WHERE type = 'TASTING_MENU'
        LOOP
            INSERT INTO planner_message_templates (
                id, planner_id, type, language, channel, subject, body, created_at, updated_at
            )
            VALUES (
                gen_random_uuid(),
                planner_record.id,
                master_template.type::"TemplateType",
                master_template.language::"Language",
                master_template.channel::"Channel",
                master_template.subject,
                master_template.body,
                NOW(),
                NOW()
            )
            ON CONFLICT (planner_id, type, language, channel) DO NOTHING;
            GET DIAGNOSTICS inserted_count = ROW_COUNT;
        END LOOP;
        RAISE NOTICE 'Planner %: seeded TASTING_MENU planner templates', planner_record.id;
    END LOOP;
END $$;

-- Step 2: Seed TASTING_MENU templates into every wedding that is missing them,
-- copying from the wedding's planner templates (which were just seeded above).
DO $$
DECLARE
    wedding_record RECORD;
    planner_template RECORD;
BEGIN
    FOR wedding_record IN SELECT id, planner_id FROM weddings LOOP
        FOR planner_template IN
            SELECT * FROM planner_message_templates
            WHERE planner_id = wedding_record.planner_id
              AND type = 'TASTING_MENU'
        LOOP
            INSERT INTO message_templates (
                id, wedding_id, type, language, channel, subject, body,
                image_url, content_template_id, created_at, updated_at
            )
            VALUES (
                gen_random_uuid(),
                wedding_record.id,
                planner_template.type::"TemplateType",
                planner_template.language::"Language",
                planner_template.channel::"Channel",
                planner_template.subject,
                planner_template.body,
                planner_template.image_url,
                planner_template.content_template_id,
                NOW(),
                NOW()
            )
            ON CONFLICT (wedding_id, type, language, channel) DO NOTHING;
        END LOOP;
        RAISE NOTICE 'Wedding %: seeded TASTING_MENU wedding templates', wedding_record.id;
    END LOOP;
END $$;
