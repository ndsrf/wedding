-- Add planner message templates table
CREATE TABLE "planner_message_templates" (
    "id" TEXT NOT NULL,
    "planner_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "image_url" TEXT,
    "content_template_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "planner_message_templates_pkey" PRIMARY KEY ("id")
);

-- Add master message templates table
CREATE TABLE "master_message_templates" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_message_templates_pkey" PRIMARY KEY ("id")
);

-- Create unique indexes
CREATE UNIQUE INDEX "planner_message_templates_planner_id_type_language_channel_key" ON "planner_message_templates"("planner_id", "type", "language", "channel");
CREATE INDEX "planner_message_templates_planner_id_idx" ON "planner_message_templates"("planner_id");
CREATE INDEX "planner_message_templates_type_idx" ON "planner_message_templates"("type");

CREATE UNIQUE INDEX "master_message_templates_type_language_channel_key" ON "master_message_templates"("type", "language", "channel");
CREATE INDEX "master_message_templates_type_idx" ON "master_message_templates"("type");

-- Add foreign key constraint
ALTER TABLE "planner_message_templates" ADD CONSTRAINT "planner_message_templates_planner_id_fkey" FOREIGN KEY ("planner_id") REFERENCES "wedding_planners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed master templates (60 templates: 5 languages × 4 types × 3 channels)
-- This is the single source of truth that gets copied to planners

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- SPANISH (ES) Templates
INSERT INTO master_message_templates (id, type, language, channel, subject, body, created_at, updated_at) VALUES
-- SAVE_THE_DATE
(uuid_generate_v4(), 'SAVE_THE_DATE', 'ES', 'EMAIL', '¡Reserva la fecha! Nos casamos', 'Estimada familia {{familyName}},

¡Estamos emocionados de anunciar que nos casamos!

**{{coupleNames}}**

📅 **Fecha:** {{weddingDate}}
📍 **Ubicación:** {{location}}

Reserva esta fecha en tu calendario. Pronto recibirás la invitación formal con todos los detalles.

¡Esperamos celebrar contigo!

Con cariño,
{{coupleNames}}', NOW(), NOW()),
(uuid_generate_v4(), 'SAVE_THE_DATE', 'ES', 'WHATSAPP', '¡Reserva la fecha!', '¡Hola {{familyName}}!

Nos emociona anunciarte que nos casamos.

{{coupleNames}}

📅 {{weddingDate}}
📍 {{location}}

¡Reserva la fecha! Pronto más detalles.

¡Nos vemos allí!', NOW(), NOW()),
(uuid_generate_v4(), 'SAVE_THE_DATE', 'ES', 'SMS', 'Reserva la fecha', '¡Hola {{familyName}}! Nos casamos el {{weddingDate}}. ¡Reserva la fecha! Más detalles pronto.', NOW(), NOW()),

-- INVITATION
(uuid_generate_v4(), 'INVITATION', 'ES', 'EMAIL', '¡Estamos emocionados de compartir nuestro gran día!', 'Estimada familia {{familyName}},

Nos complace invitarles a celebrar nuestro matrimonio:

**{{coupleNames}}**

📅 **Fecha:** {{weddingDate}}
⏰ **Hora:** {{weddingTime}}
📍 **Ubicación:** {{location}}

Para confirmar su asistencia, por favor haga clic en el siguiente enlace antes del {{rsvpCutoffDate}}:

[Confirmar asistencia]( {{magicLink}} )

Si tiene alguna pregunta, no dude en contactarnos.

Con cariño,
{{coupleNames}}', NOW(), NOW()),
(uuid_generate_v4(), 'INVITATION', 'ES', 'WHATSAPP', 'Invitación a nuestra boda', '¡Hola {{familyName}}!

Nos emociona invitarlos a celebrar nuestro matrimonio.

{{coupleNames}}

📅 {{weddingDate}}
⏰ {{weddingTime}}
📍 {{location}}

Confirma tu asistencia aquí: {{magicLink}}

Plazo: {{rsvpCutoffDate}}

¡Esperamos verte allí!', NOW(), NOW()),
(uuid_generate_v4(), 'INVITATION', 'ES', 'SMS', 'Invitación', 'Hola {{familyName}}, te invitamos a nuestra boda el {{weddingDate}} en {{location}}. Confirma aquí: {{magicLink}}', NOW(), NOW()),

-- REMINDER
(uuid_generate_v4(), 'REMINDER', 'ES', 'EMAIL', 'Recuerdo: ¡No olvides confirmar tu asistencia!', 'Estimada familia {{familyName}},

Este es un recordatorio amable para que confirme su asistencia a nuestra boda:

**{{coupleNames}}**

📅 **Fecha:** {{weddingDate}}
⏰ **Hora:** {{weddingTime}}
📍 **Ubicación:** {{location}}

Por favor, confirme antes de {{rsvpCutoffDate}}:

[Confirmar asistencia]( {{magicLink}} )

Agradecemos su respuesta.

Con cariño,
{{coupleNames}}', NOW(), NOW()),
(uuid_generate_v4(), 'REMINDER', 'ES', 'WHATSAPP', 'Recordatorio: Confirma tu asistencia', 'Hola {{familyName}}, te recordamos que confirmes tu asistencia a nuestra boda el {{weddingDate}}. Plazo: {{rsvpCutoffDate}}. Link: {{magicLink}}', NOW(), NOW()),
(uuid_generate_v4(), 'REMINDER', 'ES', 'SMS', 'Recordatorio', 'Recordatorio: Confirma tu asistencia antes de {{rsvpCutoffDate}}. {{magicLink}}', NOW(), NOW()),

-- CONFIRMATION
(uuid_generate_v4(), 'CONFIRMATION', 'ES', 'EMAIL', '¡Confirmación recibida! Nos vemos pronto', 'Estimada familia {{familyName}},

¡Gracias por confirmar su asistencia a nuestra boda!

Estamos muy emocionados de celebrar este día especial con ustedes.

**{{coupleNames}}**

📅 **Fecha:** {{weddingDate}}
⏰ **Hora:** {{weddingTime}}
📍 **Ubicación:** {{location}}

Nos vemos pronto.

Con cariño,
{{coupleNames}}', NOW(), NOW()),
(uuid_generate_v4(), 'CONFIRMATION', 'ES', 'WHATSAPP', '¡Confirmación recibida!', '¡Gracias {{familyName}} por confirmar tu asistencia! Nos emociona verte en nuestra boda el {{weddingDate}} en {{location}}. ¡Nos vemos pronto!', NOW(), NOW()),
(uuid_generate_v4(), 'CONFIRMATION', 'ES', 'SMS', 'Confirmación', '¡Gracias {{familyName}}! Tu asistencia ha sido confirmada para el {{weddingDate}}. ¡Nos vemos allí!', NOW(), NOW());

-- ENGLISH (EN) Templates
INSERT INTO master_message_templates (id, type, language, channel, subject, body, created_at, updated_at) VALUES
-- SAVE_THE_DATE
(uuid_generate_v4(), 'SAVE_THE_DATE', 'EN', 'EMAIL', 'Save the Date! We''re getting married', 'Dear {{familyName}},

We''re excited to announce that we''re getting married!

**{{coupleNames}}**

📅 **Date:** {{weddingDate}}
📍 **Location:** {{location}}

Please save this date on your calendar. You''ll receive the formal invitation with all the details soon.

We can''t wait to celebrate with you!

With love,
{{coupleNames}}', NOW(), NOW()),
(uuid_generate_v4(), 'SAVE_THE_DATE', 'EN', 'WHATSAPP', 'Save the Date!', 'Hi {{familyName}}!

We''re excited to announce we''re getting married!

{{coupleNames}}

📅 {{weddingDate}}
📍 {{location}}

Save the date! More details coming soon.

See you there!', NOW(), NOW()),
(uuid_generate_v4(), 'SAVE_THE_DATE', 'EN', 'SMS', 'Save the Date', 'Hi {{familyName}}! We''re getting married on {{weddingDate}}. Save the date! More details soon.', NOW(), NOW()),

-- INVITATION
(uuid_generate_v4(), 'INVITATION', 'EN', 'EMAIL', 'You''re invited to celebrate our wedding!', 'Dear {{familyName}},

We are delighted to invite you to celebrate our marriage:

**{{coupleNames}}**

📅 **Date:** {{weddingDate}}
⏰ **Time:** {{weddingTime}}
📍 **Location:** {{location}}

Please confirm your attendance by {{rsvpCutoffDate}}:

[Confirm Attendance]( {{magicLink}} )

If you have any questions, please don''t hesitate to contact us.

With love,
{{coupleNames}}', NOW(), NOW()),
(uuid_generate_v4(), 'INVITATION', 'EN', 'WHATSAPP', 'Wedding Invitation', 'Hi {{familyName}}!

We''re excited to invite you to celebrate our wedding!

{{coupleNames}}

📅 {{weddingDate}}
⏰ {{weddingTime}}
📍 {{location}}

Please confirm your attendance here: {{magicLink}}

RSVP by: {{rsvpCutoffDate}}

See you there!', NOW(), NOW()),
(uuid_generate_v4(), 'INVITATION', 'EN', 'SMS', 'Invitation', 'Hi {{familyName}}, you''re invited to our wedding on {{weddingDate}} at {{location}}. RSVP here: {{magicLink}}', NOW(), NOW()),

-- REMINDER
(uuid_generate_v4(), 'REMINDER', 'EN', 'EMAIL', 'Reminder: Please confirm your attendance', 'Dear {{familyName}},

This is a friendly reminder to confirm your attendance at our wedding:

**{{coupleNames}}**

📅 **Date:** {{weddingDate}}
⏰ **Time:** {{weddingTime}}
📍 **Location:** {{location}}

Please confirm by {{rsvpCutoffDate}}:

[Confirm Attendance]( {{magicLink}} )

We look forward to celebrating with you!

With love,
{{coupleNames}}', NOW(), NOW()),
(uuid_generate_v4(), 'REMINDER', 'EN', 'WHATSAPP', 'Reminder: Confirm your attendance', 'Hi {{familyName}}, just a reminder to confirm your attendance for our wedding on {{weddingDate}}. Please RSVP by {{rsvpCutoffDate}}: {{magicLink}}', NOW(), NOW()),
(uuid_generate_v4(), 'REMINDER', 'EN', 'SMS', 'Reminder', 'Reminder: Please confirm by {{rsvpCutoffDate}}. {{magicLink}}', NOW(), NOW()),

-- CONFIRMATION
(uuid_generate_v4(), 'CONFIRMATION', 'EN', 'EMAIL', 'RSVP Confirmed! See you soon', 'Dear {{familyName}},

Thank you for confirming your attendance at our wedding!

We are so excited to celebrate this special day with you.

**{{coupleNames}}**

📅 **Date:** {{weddingDate}}
⏰ **Time:** {{weddingTime}}
📍 **Location:** {{location}}

See you soon!

With love,
{{coupleNames}}', NOW(), NOW()),
(uuid_generate_v4(), 'CONFIRMATION', 'EN', 'WHATSAPP', 'RSVP Confirmed!', 'Thank you {{familyName}} for confirming your attendance! We''re so excited to see you at our wedding on {{weddingDate}} at {{location}}. See you soon!', NOW(), NOW()),
(uuid_generate_v4(), 'CONFIRMATION', 'EN', 'SMS', 'Confirmed', 'Thank you {{familyName}}! Your attendance is confirmed for {{weddingDate}}. See you there!', NOW(), NOW());

-- FRENCH (FR) Templates
INSERT INTO master_message_templates (id, type, language, channel, subject, body, created_at, updated_at) VALUES
-- SAVE_THE_DATE
(uuid_generate_v4(), 'SAVE_THE_DATE', 'FR', 'EMAIL', 'Réservez la date! Nous nous marions', 'Chère famille {{familyName}},

Nous sommes ravis d''annoncer que nous nous marions!

**{{coupleNames}}**

📅 **Date:** {{weddingDate}}
📍 **Lieu:** {{location}}

Réservez cette date dans votre agenda. Vous recevrez bientôt l''invitation formelle avec tous les détails.

Nous avons hâte de célébrer avec vous!

Avec amour,
{{coupleNames}}', NOW(), NOW()),
(uuid_generate_v4(), 'SAVE_THE_DATE', 'FR', 'WHATSAPP', 'Réservez la date!', 'Bonjour {{familyName}}!

Nous sommes heureux d''annoncer que nous nous marions!

{{coupleNames}}

📅 {{weddingDate}}
📍 {{location}}

Réservez la date! Plus de détails bientôt.

À bientôt!', NOW(), NOW()),
(uuid_generate_v4(), 'SAVE_THE_DATE', 'FR', 'SMS', 'Réservez la date', 'Bonjour {{familyName}}! Nous nous marions le {{weddingDate}}. Réservez la date! Plus de détails bientôt.', NOW(), NOW()),

-- INVITATION
(uuid_generate_v4(), 'INVITATION', 'FR', 'EMAIL', 'Vous êtes invités à célébrer notre mariage!', 'Chère famille {{familyName}},

Nous sommes ravis de vous inviter à célébrer notre mariage:

**{{coupleNames}}**

📅 **Date:** {{weddingDate}}
⏰ **Heure:** {{weddingTime}}
📍 **Lieu:** {{location}}

Veuillez confirmer votre présence avant le {{rsvpCutoffDate}}:

[Confirmer votre présence]( {{magicLink}} )

Si vous avez des questions, n''hésitez pas à nous contacter.

Avec amour,
{{coupleNames}}', NOW(), NOW()),
(uuid_generate_v4(), 'INVITATION', 'FR', 'WHATSAPP', 'Invitation à notre mariage', 'Bonjour {{familyName}}!

Nous sommes heureux de vous inviter à célébrer notre mariage!

{{coupleNames}}

📅 {{weddingDate}}
⏰ {{weddingTime}}
📍 {{location}}

Confirmez votre présence ici: {{magicLink}}

À confirmer avant: {{rsvpCutoffDate}}

À bientôt!', NOW(), NOW()),
(uuid_generate_v4(), 'INVITATION', 'FR', 'SMS', 'Invitation', 'Bonjour {{familyName}}, vous êtes invité à notre mariage le {{weddingDate}} à {{location}}. Confirmez ici: {{magicLink}}', NOW(), NOW()),

-- REMINDER
(uuid_generate_v4(), 'REMINDER', 'FR', 'EMAIL', 'Rappel: Veuillez confirmer votre présence', 'Chère famille {{familyName}},

Ceci est un aimable rappel pour confirmer votre présence à notre mariage:

**{{coupleNames}}**

📅 **Date:** {{weddingDate}}
⏰ **Heure:** {{weddingTime}}
📍 **Lieu:** {{location}}

Veuillez confirmer avant le {{rsvpCutoffDate}}:

[Confirmer votre présence]( {{magicLink}} )

Nous sommes heureux de célébrer avec vous!

Avec amour,
{{coupleNames}}', NOW(), NOW()),
(uuid_generate_v4(), 'REMINDER', 'FR', 'WHATSAPP', 'Rappel: Confirmez votre présence', 'Bonjour {{familyName}}, nous vous rappelons de confirmer votre présence à notre mariage le {{weddingDate}}. À confirmer avant: {{rsvpCutoffDate}}: {{magicLink}}', NOW(), NOW()),
(uuid_generate_v4(), 'REMINDER', 'FR', 'SMS', 'Rappel', 'Rappel: Veuillez confirmer avant {{rsvpCutoffDate}}. {{magicLink}}', NOW(), NOW()),

-- CONFIRMATION
(uuid_generate_v4(), 'CONFIRMATION', 'FR', 'EMAIL', 'Confirmation reçue! À bientôt', 'Chère famille {{familyName}},

Merci d''avoir confirmé votre présence à notre mariage!

Nous sommes ravis de célébrer ce jour spécial avec vous.

**{{coupleNames}}**

📅 **Date:** {{weddingDate}}
⏰ **Heure:** {{weddingTime}}
📍 **Lieu:** {{location}}

À bientôt!

Avec amour,
{{coupleNames}}', NOW(), NOW()),
(uuid_generate_v4(), 'CONFIRMATION', 'FR', 'WHATSAPP', 'Confirmation reçue!', 'Merci {{familyName}} d''avoir confirmé votre présence! Nous sommes ravis de vous voir à notre mariage le {{weddingDate}} à {{location}}. À bientôt!', NOW(), NOW()),
(uuid_generate_v4(), 'CONFIRMATION', 'FR', 'SMS', 'Confirmé', 'Merci {{familyName}}! Votre présence est confirmée pour le {{weddingDate}}. À bientôt!', NOW(), NOW());

-- ITALIAN (IT) Templates
INSERT INTO master_message_templates (id, type, language, channel, subject, body, created_at, updated_at) VALUES
-- SAVE_THE_DATE
(uuid_generate_v4(), 'SAVE_THE_DATE', 'IT', 'EMAIL', 'Segnate la data! Ci sposiamo', 'Caro famiglia {{familyName}},

Siamo felicissimi di annunciare che ci sposiamo!

**{{coupleNames}}**

📅 **Data:** {{weddingDate}}
📍 **Luogo:** {{location}}

Segnate questa data nel vostro calendario. Riceverete presto l''invito formale con tutti i dettagli.

Non vediamo l''ora di festeggiare con voi!

Con amore,
{{coupleNames}}', NOW(), NOW()),
(uuid_generate_v4(), 'SAVE_THE_DATE', 'IT', 'WHATSAPP', 'Segnate la data!', 'Ciao {{familyName}}!

Siamo felici di annunciare che ci sposiamo!

{{coupleNames}}

📅 {{weddingDate}}
📍 {{location}}

Segnate la data! Altri dettagli a breve.

A presto!', NOW(), NOW()),
(uuid_generate_v4(), 'SAVE_THE_DATE', 'IT', 'SMS', 'Segnate la data', 'Ciao {{familyName}}! Ci sposiamo il {{weddingDate}}. Segnate la data! Altri dettagli a breve.', NOW(), NOW()),

-- INVITATION
(uuid_generate_v4(), 'INVITATION', 'IT', 'EMAIL', 'Siete invitati a celebrare il nostro matrimonio!', 'Caro famiglia {{familyName}},

Siamo felicissimi di invitarvi a celebrare il nostro matrimonio:

**{{coupleNames}}**

📅 **Data:** {{weddingDate}}
⏰ **Ora:** {{weddingTime}}
📍 **Luogo:** {{location}}

Vi prego di confermare la vostra presenza entro il {{rsvpCutoffDate}}:

[Conferma partecipazione]( {{magicLink}} )

Se avete domande, non esitate a contattarci.

Con amore,
{{coupleNames}}', NOW(), NOW()),
(uuid_generate_v4(), 'INVITATION', 'IT', 'WHATSAPP', 'Invito al nostro matrimonio', 'Ciao {{familyName}}!

Siamo felici di invitarvi a celebrare il nostro matrimonio!

{{coupleNames}}

📅 {{weddingDate}}
⏰ {{weddingTime}}
📍 {{location}}

Confermate la vostra partecipazione qui: {{magicLink}}

Da confermare entro: {{rsvpCutoffDate}}

A presto!', NOW(), NOW()),
(uuid_generate_v4(), 'INVITATION', 'IT', 'SMS', 'Invito', 'Ciao {{familyName}}, siete invitati al nostro matrimonio il {{weddingDate}} a {{location}}. Confermate qui: {{magicLink}}', NOW(), NOW()),

-- REMINDER
(uuid_generate_v4(), 'REMINDER', 'IT', 'EMAIL', 'Promemoria: Confermate la vostra partecipazione', 'Caro famiglia {{familyName}},

Questo è un gentile promemoria per confermare la vostra partecipazione al nostro matrimonio:

**{{coupleNames}}**

📅 **Data:** {{weddingDate}}
⏰ **Ora:** {{weddingTime}}
📍 **Luogo:** {{location}}

Vi prego di confermare entro il {{rsvpCutoffDate}}:

[Conferma partecipazione]( {{magicLink}} )

Siamo felici di celebrare con voi!

Con amore,
{{coupleNames}}', NOW(), NOW()),
(uuid_generate_v4(), 'REMINDER', 'IT', 'WHATSAPP', 'Promemoria: Confermate la vostra partecipazione', 'Ciao {{familyName}}, vi ricordiamo di confermare la vostra partecipazione al nostro matrimonio il {{weddingDate}}. Da confermare entro: {{rsvpCutoffDate}}: {{magicLink}}', NOW(), NOW()),
(uuid_generate_v4(), 'REMINDER', 'IT', 'SMS', 'Promemoria', 'Promemoria: Confermate entro {{rsvpCutoffDate}}. {{magicLink}}', NOW(), NOW()),

-- CONFIRMATION
(uuid_generate_v4(), 'CONFIRMATION', 'IT', 'EMAIL', 'Conferma ricevuta! A presto', 'Caro famiglia {{familyName}},

Grazie per aver confermato la vostra partecipazione al nostro matrimonio!

Siamo molto felici di celebrare questo giorno speciale con voi.

**{{coupleNames}}**

📅 **Data:** {{weddingDate}}
⏰ **Ora:** {{weddingTime}}
📍 **Luogo:** {{location}}

A presto!

Con amore,
{{coupleNames}}', NOW(), NOW()),
(uuid_generate_v4(), 'CONFIRMATION', 'IT', 'WHATSAPP', 'Conferma ricevuta!', 'Grazie {{familyName}} per aver confermato la vostra partecipazione! Siamo felicissimi di vedervi al nostro matrimonio il {{weddingDate}} a {{location}}. A presto!', NOW(), NOW()),
(uuid_generate_v4(), 'CONFIRMATION', 'IT', 'SMS', 'Confermato', 'Grazie {{familyName}}! La vostra partecipazione è confermata per il {{weddingDate}}. A presto!', NOW(), NOW());

-- GERMAN (DE) Templates
INSERT INTO master_message_templates (id, type, language, channel, subject, body, created_at, updated_at) VALUES
-- SAVE_THE_DATE
(uuid_generate_v4(), 'SAVE_THE_DATE', 'DE', 'EMAIL', 'Reserviert euch den Termin! Wir heiraten', 'Liebe Familie {{familyName}},

Wir freuen uns, euch mitzuteilen, dass wir heiraten!

**{{coupleNames}}**

📅 **Datum:** {{weddingDate}}
📍 **Ort:** {{location}}

Bitte reserviert euch diesen Termin. Die formelle Einladung mit allen Details folgt bald.

Wir freuen uns darauf, mit euch zu feiern!

Mit Liebe,
{{coupleNames}}', NOW(), NOW()),
(uuid_generate_v4(), 'SAVE_THE_DATE', 'DE', 'WHATSAPP', 'Reserviert den Termin!', 'Hallo {{familyName}}!

Wir freuen uns, euch mitzuteilen, dass wir heiraten!

{{coupleNames}}

📅 {{weddingDate}}
📍 {{location}}

Reserviert den Termin! Mehr Details folgen bald.

Bis bald!', NOW(), NOW()),
(uuid_generate_v4(), 'SAVE_THE_DATE', 'DE', 'SMS', 'Reserviert den Termin', 'Hallo {{familyName}}! Wir heiraten am {{weddingDate}}. Reserviert den Termin! Mehr Details bald.', NOW(), NOW()),

-- INVITATION
(uuid_generate_v4(), 'INVITATION', 'DE', 'EMAIL', 'Ihr seid zu unserer Hochzeit eingeladen!', 'Liebe Familie {{familyName}},

Wir freuen uns, euch zu unserer Hochzeit einzuladen:

**{{coupleNames}}**

📅 **Datum:** {{weddingDate}}
⏰ **Uhrzeit:** {{weddingTime}}
📍 **Ort:** {{location}}

Bitte bestätigt eure Teilnahme bis zum {{rsvpCutoffDate}}:

[Teilnahme bestätigen]( {{magicLink}} )

Falls ihr Fragen habt, zögert nicht, uns zu kontaktieren.

Mit Liebe,
{{coupleNames}}', NOW(), NOW()),
(uuid_generate_v4(), 'INVITATION', 'DE', 'WHATSAPP', 'Einladung zu unserer Hochzeit', 'Hallo {{familyName}}!

Wir freuen uns, euch zu unserer Hochzeit einzuladen!

{{coupleNames}}

📅 {{weddingDate}}
⏰ {{weddingTime}}
📍 {{location}}

Bitte bestätigt hier: {{magicLink}}

Bestätigung bis: {{rsvpCutoffDate}}

Bis bald!', NOW(), NOW()),
(uuid_generate_v4(), 'INVITATION', 'DE', 'SMS', 'Einladung', 'Hallo {{familyName}}, ihr seid zu unserer Hochzeit am {{weddingDate}} in {{location}} eingeladen. Bestätigt hier: {{magicLink}}', NOW(), NOW()),

-- REMINDER
(uuid_generate_v4(), 'REMINDER', 'DE', 'EMAIL', 'Erinnerung: Bitte bestätigt eure Teilnahme', 'Liebe Familie {{familyName}},

Dies ist eine freundliche Erinnerung, eure Teilnahme an unserer Hochzeit zu bestätigen:

**{{coupleNames}}**

📅 **Datum:** {{weddingDate}}
⏰ **Uhrzeit:** {{weddingTime}}
📍 **Ort:** {{location}}

Bitte bestätigt bis zum {{rsvpCutoffDate}}:

[Teilnahme bestätigen]( {{magicLink}} )

Wir freuen uns, mit euch zu feiern!

Mit Liebe,
{{coupleNames}}', NOW(), NOW()),
(uuid_generate_v4(), 'REMINDER', 'DE', 'WHATSAPP', 'Erinnerung: Bestätigt eure Teilnahme', 'Hallo {{familyName}}, dies ist eine Erinnerung, eure Teilnahme an unserer Hochzeit am {{weddingDate}} zu bestätigen. Bestätigung bis: {{rsvpCutoffDate}}: {{magicLink}}', NOW(), NOW()),
(uuid_generate_v4(), 'REMINDER', 'DE', 'SMS', 'Erinnerung', 'Erinnerung: Bestätigt bis {{rsvpCutoffDate}}. {{magicLink}}', NOW(), NOW()),

-- CONFIRMATION
(uuid_generate_v4(), 'CONFIRMATION', 'DE', 'EMAIL', 'Bestätigung erhalten! Bis bald', 'Liebe Familie {{familyName}},

Vielen Dank für die Bestätigung eurer Teilnahme an unserer Hochzeit!

Wir freuen uns sehr darauf, diesen besonderen Tag mit euch zu feiern.

**{{coupleNames}}**

📅 **Datum:** {{weddingDate}}
⏰ **Uhrzeit:** {{weddingTime}}
📍 **Ort:** {{location}}

Bis bald!

Mit Liebe,
{{coupleNames}}', NOW(), NOW()),
(uuid_generate_v4(), 'CONFIRMATION', 'DE', 'WHATSAPP', 'Bestätigung erhalten!', 'Danke {{familyName}} für die Bestätigung! Wir freuen uns sehr, euch bei unserer Hochzeit am {{weddingDate}} in {{location}} zu sehen. Bis bald!', NOW(), NOW()),
(uuid_generate_v4(), 'CONFIRMATION', 'DE', 'SMS', 'Bestätigt', 'Danke {{familyName}}! Eure Teilnahme ist für den {{weddingDate}} bestätigt. Bis bald!', NOW(), NOW());

-- Seed planner templates for all existing planners from master templates
DO $$
DECLARE
    planner_record RECORD;
    master_template RECORD;
BEGIN
    -- Loop through all planners
    FOR planner_record IN SELECT id FROM wedding_planners LOOP
        -- Check if this planner already has templates
        IF NOT EXISTS (SELECT 1 FROM planner_message_templates WHERE planner_id = planner_record.id) THEN
            -- Copy all master templates to this planner
            FOR master_template IN SELECT * FROM master_message_templates LOOP
                INSERT INTO planner_message_templates (
                    id, planner_id, type, language, channel, subject, body, created_at, updated_at
                ) VALUES (
                    uuid_generate_v4(),
                    planner_record.id,
                    master_template.type,
                    master_template.language,
                    master_template.channel,
                    master_template.subject,
                    master_template.body,
                    NOW(),
                    NOW()
                );
            END LOOP;
            RAISE NOTICE 'Seeded 60 planner templates for planner: %', planner_record.id;
        ELSE
            RAISE NOTICE 'Planner % already has templates, skipping...', planner_record.id;
        END IF;
    END LOOP;
END $$;
