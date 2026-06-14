-- Migrate existing String? columns to Json? (jsonb) on weddings table
-- Pattern: rename old → add new jsonb → migrate data → drop old

-- transportation_question_text
ALTER TABLE weddings RENAME COLUMN transportation_question_text TO transportation_question_text_old;
ALTER TABLE weddings ADD COLUMN transportation_question_text jsonb;
UPDATE weddings SET transportation_question_text = jsonb_build_object('en', transportation_question_text_old) WHERE transportation_question_text_old IS NOT NULL;
ALTER TABLE weddings DROP COLUMN transportation_question_text_old;

-- extra_question_1_text
ALTER TABLE weddings RENAME COLUMN extra_question_1_text TO extra_question_1_text_old;
ALTER TABLE weddings ADD COLUMN extra_question_1_text jsonb;
UPDATE weddings SET extra_question_1_text = jsonb_build_object('en', extra_question_1_text_old) WHERE extra_question_1_text_old IS NOT NULL;
ALTER TABLE weddings DROP COLUMN extra_question_1_text_old;

-- extra_question_2_text
ALTER TABLE weddings RENAME COLUMN extra_question_2_text TO extra_question_2_text_old;
ALTER TABLE weddings ADD COLUMN extra_question_2_text jsonb;
UPDATE weddings SET extra_question_2_text = jsonb_build_object('en', extra_question_2_text_old) WHERE extra_question_2_text_old IS NOT NULL;
ALTER TABLE weddings DROP COLUMN extra_question_2_text_old;

-- extra_question_3_text
ALTER TABLE weddings RENAME COLUMN extra_question_3_text TO extra_question_3_text_old;
ALTER TABLE weddings ADD COLUMN extra_question_3_text jsonb;
UPDATE weddings SET extra_question_3_text = jsonb_build_object('en', extra_question_3_text_old) WHERE extra_question_3_text_old IS NOT NULL;
ALTER TABLE weddings DROP COLUMN extra_question_3_text_old;

-- extra_info_1_label
ALTER TABLE weddings RENAME COLUMN extra_info_1_label TO extra_info_1_label_old;
ALTER TABLE weddings ADD COLUMN extra_info_1_label jsonb;
UPDATE weddings SET extra_info_1_label = jsonb_build_object('en', extra_info_1_label_old) WHERE extra_info_1_label_old IS NOT NULL;
ALTER TABLE weddings DROP COLUMN extra_info_1_label_old;

-- extra_info_2_label
ALTER TABLE weddings RENAME COLUMN extra_info_2_label TO extra_info_2_label_old;
ALTER TABLE weddings ADD COLUMN extra_info_2_label jsonb;
UPDATE weddings SET extra_info_2_label = jsonb_build_object('en', extra_info_2_label_old) WHERE extra_info_2_label_old IS NOT NULL;
ALTER TABLE weddings DROP COLUMN extra_info_2_label_old;

-- extra_info_3_label
ALTER TABLE weddings RENAME COLUMN extra_info_3_label TO extra_info_3_label_old;
ALTER TABLE weddings ADD COLUMN extra_info_3_label jsonb;
UPDATE weddings SET extra_info_3_label = jsonb_build_object('en', extra_info_3_label_old) WHERE extra_info_3_label_old IS NOT NULL;
ALTER TABLE weddings DROP COLUMN extra_info_3_label_old;

-- New per-family dropdown question on weddings
ALTER TABLE weddings ADD COLUMN IF NOT EXISTS family_dropdown_question_1_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE weddings ADD COLUMN IF NOT EXISTS family_dropdown_question_1_label jsonb;
ALTER TABLE weddings ADD COLUMN IF NOT EXISTS family_dropdown_question_1_options jsonb;

-- New per-guest Yes/No questions on weddings
ALTER TABLE weddings ADD COLUMN IF NOT EXISTS guest_yn_question_1_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE weddings ADD COLUMN IF NOT EXISTS guest_yn_question_1_text jsonb;
ALTER TABLE weddings ADD COLUMN IF NOT EXISTS guest_yn_question_2_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE weddings ADD COLUMN IF NOT EXISTS guest_yn_question_2_text jsonb;
ALTER TABLE weddings ADD COLUMN IF NOT EXISTS guest_yn_question_3_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE weddings ADD COLUMN IF NOT EXISTS guest_yn_question_3_text jsonb;

-- New per-guest Dropdown questions on weddings
ALTER TABLE weddings ADD COLUMN IF NOT EXISTS guest_dropdown_question_1_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE weddings ADD COLUMN IF NOT EXISTS guest_dropdown_question_1_label jsonb;
ALTER TABLE weddings ADD COLUMN IF NOT EXISTS guest_dropdown_question_1_options jsonb;
ALTER TABLE weddings ADD COLUMN IF NOT EXISTS guest_dropdown_question_2_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE weddings ADD COLUMN IF NOT EXISTS guest_dropdown_question_2_label jsonb;
ALTER TABLE weddings ADD COLUMN IF NOT EXISTS guest_dropdown_question_2_options jsonb;
ALTER TABLE weddings ADD COLUMN IF NOT EXISTS guest_dropdown_question_3_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE weddings ADD COLUMN IF NOT EXISTS guest_dropdown_question_3_label jsonb;
ALTER TABLE weddings ADD COLUMN IF NOT EXISTS guest_dropdown_question_3_options jsonb;

-- New per-guest Text input questions on weddings
ALTER TABLE weddings ADD COLUMN IF NOT EXISTS guest_text_question_1_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE weddings ADD COLUMN IF NOT EXISTS guest_text_question_1_label jsonb;
ALTER TABLE weddings ADD COLUMN IF NOT EXISTS guest_text_question_2_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE weddings ADD COLUMN IF NOT EXISTS guest_text_question_2_label jsonb;
ALTER TABLE weddings ADD COLUMN IF NOT EXISTS guest_text_question_3_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE weddings ADD COLUMN IF NOT EXISTS guest_text_question_3_label jsonb;

-- New family dropdown answer on families
ALTER TABLE families ADD COLUMN IF NOT EXISTS family_dropdown_question_1_answer text;

-- New per-guest question answers on family_members
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS guest_yn_question_1_answer boolean;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS guest_yn_question_2_answer boolean;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS guest_yn_question_3_answer boolean;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS guest_dropdown_question_1_answer text;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS guest_dropdown_question_2_answer text;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS guest_dropdown_question_3_answer text;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS guest_text_question_1_answer text;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS guest_text_question_2_answer text;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS guest_text_question_3_answer text;
