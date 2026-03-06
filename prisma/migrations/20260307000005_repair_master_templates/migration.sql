-- Repair migration: ensure all 60 original master templates exist.
-- The data from migration 20260212000000 may be missing on some DBs.
-- Uses ON CONFLICT DO NOTHING so existing rows are never overwritten.

-- SPANISH (ES) Templates
INSERT INTO master_message_templates (id, type, language, channel, subject, body, created_at, updated_at) VALUES
(gen_random_uuid(), 'SAVE_THE_DATE', 'ES', 'EMAIL', '¡Reserva la fecha! Nos casamos', 'Estimada familia {{familyName}},

¡Estamos emocionados de anunciar que nos casamos!

**{{coupleNames}}**

📅 **Fecha:** {{weddingDate}}
📍 **Ubicación:** {{location}}

Reserva esta fecha en tu calendario. Pronto recibirás la invitación formal con todos los detalles.

¡Esperamos celebrar contigo!

Con cariño,
{{coupleNames}}', NOW(), NOW()),
(gen_random_uuid(), 'SAVE_THE_DATE', 'ES', 'WHATSAPP', '¡Reserva la fecha!', '¡Hola {{familyName}}!

Nos emociona anunciarte que nos casamos.

{{coupleNames}}

📅 {{weddingDate}}
📍 {{location}}

¡Reserva la fecha! Pronto más detalles.

¡Nos vemos allí!', NOW(), NOW()),
(gen_random_uuid(), 'SAVE_THE_DATE', 'ES', 'SMS', 'Reserva la fecha', '¡Hola {{familyName}}! Nos casamos el {{weddingDate}}. ¡Reserva la fecha! Más detalles pronto.', NOW(), NOW()),
(gen_random_uuid(), 'INVITATION', 'ES', 'EMAIL', '¡Estamos emocionados de compartir nuestro gran día!', 'Estimada familia {{familyName}},

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
(gen_random_uuid(), 'INVITATION', 'ES', 'WHATSAPP', 'Invitación a nuestra boda', '¡Hola {{familyName}}!

Nos emociona invitarlos a celebrar nuestro matrimonio.

{{coupleNames}}

📅 {{weddingDate}}
⏰ {{weddingTime}}
📍 {{location}}

Confirma tu asistencia aquí: {{magicLink}}

Plazo: {{rsvpCutoffDate}}

¡Esperamos verte allí!', NOW(), NOW()),
(gen_random_uuid(), 'INVITATION', 'ES', 'SMS', 'Invitación', 'Hola {{familyName}}, te invitamos a nuestra boda el {{weddingDate}} en {{location}}. Confirma aquí: {{magicLink}}', NOW(), NOW()),
(gen_random_uuid(), 'REMINDER', 'ES', 'EMAIL', 'Recuerdo: ¡No olvides confirmar tu asistencia!', 'Estimada familia {{familyName}},

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
(gen_random_uuid(), 'REMINDER', 'ES', 'WHATSAPP', 'Recordatorio: Confirma tu asistencia', 'Hola {{familyName}}, te recordamos que confirmes tu asistencia a nuestra boda el {{weddingDate}}. Plazo: {{rsvpCutoffDate}}. Link: {{magicLink}}', NOW(), NOW()),
(gen_random_uuid(), 'REMINDER', 'ES', 'SMS', 'Recordatorio', 'Recordatorio: Confirma tu asistencia antes de {{rsvpCutoffDate}}. {{magicLink}}', NOW(), NOW()),
(gen_random_uuid(), 'CONFIRMATION', 'ES', 'EMAIL', '¡Confirmación recibida! Nos vemos pronto', 'Estimada familia {{familyName}},

¡Gracias por confirmar su asistencia a nuestra boda!

Estamos muy emocionados de celebrar este día especial con ustedes.

**{{coupleNames}}**

📅 **Fecha:** {{weddingDate}}
⏰ **Hora:** {{weddingTime}}
📍 **Ubicación:** {{location}}

Nos vemos pronto.

Con cariño,
{{coupleNames}}', NOW(), NOW()),
(gen_random_uuid(), 'CONFIRMATION', 'ES', 'WHATSAPP', '¡Confirmación recibida!', '¡Gracias {{familyName}} por confirmar tu asistencia! Nos emociona verte en nuestra boda el {{weddingDate}} en {{location}}. ¡Nos vemos pronto!', NOW(), NOW()),
(gen_random_uuid(), 'CONFIRMATION', 'ES', 'SMS', 'Confirmación', '¡Gracias {{familyName}}! Tu asistencia ha sido confirmada para el {{weddingDate}}. ¡Nos vemos allí!', NOW(), NOW())
ON CONFLICT (type, language, channel) DO NOTHING;

-- ENGLISH (EN) Templates
INSERT INTO master_message_templates (id, type, language, channel, subject, body, created_at, updated_at) VALUES
(gen_random_uuid(), 'SAVE_THE_DATE', 'EN', 'EMAIL', 'Save the Date! We''re getting married', 'Dear {{familyName}},

We''re excited to announce that we''re getting married!

**{{coupleNames}}**

📅 **Date:** {{weddingDate}}
📍 **Location:** {{location}}

Please save this date on your calendar. You''ll receive the formal invitation with all the details soon.

We can''t wait to celebrate with you!

With love,
{{coupleNames}}', NOW(), NOW()),
(gen_random_uuid(), 'SAVE_THE_DATE', 'EN', 'WHATSAPP', 'Save the Date!', 'Hi {{familyName}}!

We''re excited to announce we''re getting married!

{{coupleNames}}

📅 {{weddingDate}}
📍 {{location}}

Save the date! More details coming soon.

See you there!', NOW(), NOW()),
(gen_random_uuid(), 'SAVE_THE_DATE', 'EN', 'SMS', 'Save the Date', 'Hi {{familyName}}! We''re getting married on {{weddingDate}}. Save the date! More details soon.', NOW(), NOW()),
(gen_random_uuid(), 'INVITATION', 'EN', 'EMAIL', 'You''re invited to celebrate our wedding!', 'Dear {{familyName}},

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
(gen_random_uuid(), 'INVITATION', 'EN', 'WHATSAPP', 'Wedding Invitation', 'Hi {{familyName}}!

We''re excited to invite you to celebrate our wedding!

{{coupleNames}}

📅 {{weddingDate}}
⏰ {{weddingTime}}
📍 {{location}}

Please confirm your attendance here: {{magicLink}}

RSVP by: {{rsvpCutoffDate}}

See you there!', NOW(), NOW()),
(gen_random_uuid(), 'INVITATION', 'EN', 'SMS', 'Invitation', 'Hi {{familyName}}, you''re invited to our wedding on {{weddingDate}} at {{location}}. RSVP here: {{magicLink}}', NOW(), NOW()),
(gen_random_uuid(), 'REMINDER', 'EN', 'EMAIL', 'Reminder: Please confirm your attendance', 'Dear {{familyName}},

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
(gen_random_uuid(), 'REMINDER', 'EN', 'WHATSAPP', 'Reminder: Confirm your attendance', 'Hi {{familyName}}, just a reminder to confirm your attendance for our wedding on {{weddingDate}}. Please RSVP by {{rsvpCutoffDate}}: {{magicLink}}', NOW(), NOW()),
(gen_random_uuid(), 'REMINDER', 'EN', 'SMS', 'Reminder', 'Reminder: Please confirm by {{rsvpCutoffDate}}. {{magicLink}}', NOW(), NOW()),
(gen_random_uuid(), 'CONFIRMATION', 'EN', 'EMAIL', 'RSVP Confirmed! See you soon', 'Dear {{familyName}},

Thank you for confirming your attendance at our wedding!

We are so excited to celebrate this special day with you.

**{{coupleNames}}**

📅 **Date:** {{weddingDate}}
⏰ **Time:** {{weddingTime}}
📍 **Location:** {{location}}

See you soon!

With love,
{{coupleNames}}', NOW(), NOW()),
(gen_random_uuid(), 'CONFIRMATION', 'EN', 'WHATSAPP', 'RSVP Confirmed!', 'Thank you {{familyName}} for confirming your attendance! We''re so excited to see you at our wedding on {{weddingDate}} at {{location}}. See you soon!', NOW(), NOW()),
(gen_random_uuid(), 'CONFIRMATION', 'EN', 'SMS', 'Confirmed', 'Thank you {{familyName}}! Your attendance is confirmed for {{weddingDate}}. See you there!', NOW(), NOW())
ON CONFLICT (type, language, channel) DO NOTHING;

-- FRENCH (FR) Templates
INSERT INTO master_message_templates (id, type, language, channel, subject, body, created_at, updated_at) VALUES
(gen_random_uuid(), 'SAVE_THE_DATE', 'FR', 'EMAIL', 'Réservez la date! Nous nous marions', 'Chère famille {{familyName}},

Nous sommes ravis d''annoncer que nous nous marions!

**{{coupleNames}}**

📅 **Date:** {{weddingDate}}
📍 **Lieu:** {{location}}

Réservez cette date dans votre agenda. Vous recevrez bientôt l''invitation formelle avec tous les détails.

Nous avons hâte de célébrer avec vous!

Avec amour,
{{coupleNames}}', NOW(), NOW()),
(gen_random_uuid(), 'SAVE_THE_DATE', 'FR', 'WHATSAPP', 'Réservez la date!', 'Bonjour {{familyName}}!

Nous sommes heureux d''annoncer que nous nous marions!

{{coupleNames}}

📅 {{weddingDate}}
📍 {{location}}

Réservez la date! Plus de détails bientôt.

À bientôt!', NOW(), NOW()),
(gen_random_uuid(), 'SAVE_THE_DATE', 'FR', 'SMS', 'Réservez la date', 'Bonjour {{familyName}}! Nous nous marions le {{weddingDate}}. Réservez la date! Plus de détails bientôt.', NOW(), NOW()),
(gen_random_uuid(), 'INVITATION', 'FR', 'EMAIL', 'Vous êtes invités à célébrer notre mariage!', 'Chère famille {{familyName}},

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
(gen_random_uuid(), 'INVITATION', 'FR', 'WHATSAPP', 'Invitation à notre mariage', 'Bonjour {{familyName}}!

Nous sommes heureux de vous inviter à célébrer notre mariage!

{{coupleNames}}

📅 {{weddingDate}}
⏰ {{weddingTime}}
📍 {{location}}

Confirmez votre présence ici: {{magicLink}}

À confirmer avant: {{rsvpCutoffDate}}

À bientôt!', NOW(), NOW()),
(gen_random_uuid(), 'INVITATION', 'FR', 'SMS', 'Invitation', 'Bonjour {{familyName}}, vous êtes invité à notre mariage le {{weddingDate}} à {{location}}. Confirmez ici: {{magicLink}}', NOW(), NOW()),
(gen_random_uuid(), 'REMINDER', 'FR', 'EMAIL', 'Rappel: Veuillez confirmer votre présence', 'Chère famille {{familyName}},

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
(gen_random_uuid(), 'REMINDER', 'FR', 'WHATSAPP', 'Rappel: Confirmez votre présence', 'Bonjour {{familyName}}, nous vous rappelons de confirmer votre présence à notre mariage le {{weddingDate}}. À confirmer avant: {{rsvpCutoffDate}}: {{magicLink}}', NOW(), NOW()),
(gen_random_uuid(), 'REMINDER', 'FR', 'SMS', 'Rappel', 'Rappel: Veuillez confirmer avant {{rsvpCutoffDate}}. {{magicLink}}', NOW(), NOW()),
(gen_random_uuid(), 'CONFIRMATION', 'FR', 'EMAIL', 'Confirmation reçue! À bientôt', 'Chère famille {{familyName}},

Merci d''avoir confirmé votre présence à notre mariage!

Nous sommes ravis de célébrer ce jour spécial avec vous.

**{{coupleNames}}**

📅 **Date:** {{weddingDate}}
⏰ **Heure:** {{weddingTime}}
📍 **Lieu:** {{location}}

À bientôt!

Avec amour,
{{coupleNames}}', NOW(), NOW()),
(gen_random_uuid(), 'CONFIRMATION', 'FR', 'WHATSAPP', 'Confirmation reçue!', 'Merci {{familyName}} d''avoir confirmé votre présence! Nous sommes ravis de vous voir à notre mariage le {{weddingDate}} à {{location}}. À bientôt!', NOW(), NOW()),
(gen_random_uuid(), 'CONFIRMATION', 'FR', 'SMS', 'Confirmé', 'Merci {{familyName}}! Votre présence est confirmée pour le {{weddingDate}}. À bientôt!', NOW(), NOW())
ON CONFLICT (type, language, channel) DO NOTHING;

-- ITALIAN (IT) Templates
INSERT INTO master_message_templates (id, type, language, channel, subject, body, created_at, updated_at) VALUES
(gen_random_uuid(), 'SAVE_THE_DATE', 'IT', 'EMAIL', 'Segnate la data! Ci sposiamo', 'Caro famiglia {{familyName}},

Siamo felicissimi di annunciare che ci sposiamo!

**{{coupleNames}}**

📅 **Data:** {{weddingDate}}
📍 **Luogo:** {{location}}

Segnate questa data nel vostro calendario. Riceverete presto l''invito formale con tutti i dettagli.

Non vediamo l''ora di festeggiare con voi!

Con amore,
{{coupleNames}}', NOW(), NOW()),
(gen_random_uuid(), 'SAVE_THE_DATE', 'IT', 'WHATSAPP', 'Segnate la data!', 'Ciao {{familyName}}!

Siamo felici di annunciare che ci sposiamo!

{{coupleNames}}

📅 {{weddingDate}}
📍 {{location}}

Segnate la data! Altri dettagli a breve.

A presto!', NOW(), NOW()),
(gen_random_uuid(), 'SAVE_THE_DATE', 'IT', 'SMS', 'Segnate la data', 'Ciao {{familyName}}! Ci sposiamo il {{weddingDate}}. Segnate la data! Altri dettagli a breve.', NOW(), NOW()),
(gen_random_uuid(), 'INVITATION', 'IT', 'EMAIL', 'Siete invitati a celebrare il nostro matrimonio!', 'Caro famiglia {{familyName}},

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
(gen_random_uuid(), 'INVITATION', 'IT', 'WHATSAPP', 'Invito al nostro matrimonio', 'Ciao {{familyName}}!

Siamo felici di invitarvi a celebrare il nostro matrimonio!

{{coupleNames}}

📅 {{weddingDate}}
⏰ {{weddingTime}}
📍 {{location}}

Confermate la vostra partecipazione qui: {{magicLink}}

Da confermare entro: {{rsvpCutoffDate}}

A presto!', NOW(), NOW()),
(gen_random_uuid(), 'INVITATION', 'IT', 'SMS', 'Invito', 'Ciao {{familyName}}, siete invitati al nostro matrimonio il {{weddingDate}} a {{location}}. Confermate qui: {{magicLink}}', NOW(), NOW()),
(gen_random_uuid(), 'REMINDER', 'IT', 'EMAIL', 'Promemoria: Confermate la vostra partecipazione', 'Caro famiglia {{familyName}},

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
(gen_random_uuid(), 'REMINDER', 'IT', 'WHATSAPP', 'Promemoria: Confermate la vostra partecipazione', 'Ciao {{familyName}}, vi ricordiamo di confermare la vostra partecipazione al nostro matrimonio il {{weddingDate}}. Da confermare entro: {{rsvpCutoffDate}}: {{magicLink}}', NOW(), NOW()),
(gen_random_uuid(), 'REMINDER', 'IT', 'SMS', 'Promemoria', 'Promemoria: Confermate entro {{rsvpCutoffDate}}. {{magicLink}}', NOW(), NOW()),
(gen_random_uuid(), 'CONFIRMATION', 'IT', 'EMAIL', 'Conferma ricevuta! A presto', 'Caro famiglia {{familyName}},

Grazie per aver confermato la vostra partecipazione al nostro matrimonio!

Siamo molto felici di celebrare questo giorno speciale con voi.

**{{coupleNames}}**

📅 **Data:** {{weddingDate}}
⏰ **Ora:** {{weddingTime}}
📍 **Luogo:** {{location}}

A presto!

Con amore,
{{coupleNames}}', NOW(), NOW()),
(gen_random_uuid(), 'CONFIRMATION', 'IT', 'WHATSAPP', 'Conferma ricevuta!', 'Grazie {{familyName}} per aver confermato la vostra partecipazione! Siamo felicissimi di vedervi al nostro matrimonio il {{weddingDate}} a {{location}}. A presto!', NOW(), NOW()),
(gen_random_uuid(), 'CONFIRMATION', 'IT', 'SMS', 'Confermato', 'Grazie {{familyName}}! La vostra partecipazione è confermata per il {{weddingDate}}. A presto!', NOW(), NOW())
ON CONFLICT (type, language, channel) DO NOTHING;

-- GERMAN (DE) Templates
INSERT INTO master_message_templates (id, type, language, channel, subject, body, created_at, updated_at) VALUES
(gen_random_uuid(), 'SAVE_THE_DATE', 'DE', 'EMAIL', 'Reserviert euch den Termin! Wir heiraten', 'Liebe Familie {{familyName}},

Wir freuen uns, euch mitzuteilen, dass wir heiraten!

**{{coupleNames}}**

📅 **Datum:** {{weddingDate}}
📍 **Ort:** {{location}}

Bitte reserviert euch diesen Termin. Die formelle Einladung mit allen Details folgt bald.

Wir freuen uns darauf, mit euch zu feiern!

Mit Liebe,
{{coupleNames}}', NOW(), NOW()),
(gen_random_uuid(), 'SAVE_THE_DATE', 'DE', 'WHATSAPP', 'Reserviert den Termin!', 'Hallo {{familyName}}!

Wir freuen uns, euch mitzuteilen, dass wir heiraten!

{{coupleNames}}

📅 {{weddingDate}}
📍 {{location}}

Reserviert den Termin! Mehr Details folgen bald.

Bis bald!', NOW(), NOW()),
(gen_random_uuid(), 'SAVE_THE_DATE', 'DE', 'SMS', 'Reserviert den Termin', 'Hallo {{familyName}}! Wir heiraten am {{weddingDate}}. Reserviert den Termin! Mehr Details bald.', NOW(), NOW()),
(gen_random_uuid(), 'INVITATION', 'DE', 'EMAIL', 'Ihr seid zu unserer Hochzeit eingeladen!', 'Liebe Familie {{familyName}},

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
(gen_random_uuid(), 'INVITATION', 'DE', 'WHATSAPP', 'Einladung zu unserer Hochzeit', 'Hallo {{familyName}}!

Wir freuen uns, euch zu unserer Hochzeit einzuladen!

{{coupleNames}}

📅 {{weddingDate}}
⏰ {{weddingTime}}
📍 {{location}}

Bitte bestätigt hier: {{magicLink}}

Bestätigung bis: {{rsvpCutoffDate}}

Bis bald!', NOW(), NOW()),
(gen_random_uuid(), 'INVITATION', 'DE', 'SMS', 'Einladung', 'Hallo {{familyName}}, ihr seid zu unserer Hochzeit am {{weddingDate}} in {{location}} eingeladen. Bestätigt hier: {{magicLink}}', NOW(), NOW()),
(gen_random_uuid(), 'REMINDER', 'DE', 'EMAIL', 'Erinnerung: Bitte bestätigt eure Teilnahme', 'Liebe Familie {{familyName}},

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
(gen_random_uuid(), 'REMINDER', 'DE', 'WHATSAPP', 'Erinnerung: Bestätigt eure Teilnahme', 'Hallo {{familyName}}, dies ist eine Erinnerung, eure Teilnahme an unserer Hochzeit am {{weddingDate}} zu bestätigen. Bestätigung bis: {{rsvpCutoffDate}}: {{magicLink}}', NOW(), NOW()),
(gen_random_uuid(), 'REMINDER', 'DE', 'SMS', 'Erinnerung', 'Erinnerung: Bestätigt bis {{rsvpCutoffDate}}. {{magicLink}}', NOW(), NOW()),
(gen_random_uuid(), 'CONFIRMATION', 'DE', 'EMAIL', 'Bestätigung erhalten! Bis bald', 'Liebe Familie {{familyName}},

Vielen Dank für die Bestätigung eurer Teilnahme an unserer Hochzeit!

Wir freuen uns sehr darauf, diesen besonderen Tag mit euch zu feiern.

**{{coupleNames}}**

📅 **Datum:** {{weddingDate}}
⏰ **Uhrzeit:** {{weddingTime}}
📍 **Ort:** {{location}}

Bis bald!

Mit Liebe,
{{coupleNames}}', NOW(), NOW()),
(gen_random_uuid(), 'CONFIRMATION', 'DE', 'WHATSAPP', 'Bestätigung erhalten!', 'Danke {{familyName}} für die Bestätigung! Wir freuen uns sehr, euch bei unserer Hochzeit am {{weddingDate}} in {{location}} zu sehen. Bis bald!', NOW(), NOW()),
(gen_random_uuid(), 'CONFIRMATION', 'DE', 'SMS', 'Bestätigt', 'Danke {{familyName}}! Eure Teilnahme ist für den {{weddingDate}} bestätigt. Bis bald!', NOW(), NOW())
ON CONFLICT (type, language, channel) DO NOTHING;

-- Propagate any missing templates to planners (all types, not just TASTING_MENU).
DO $$
DECLARE
    planner_record RECORD;
    master_template RECORD;
BEGIN
    FOR planner_record IN SELECT id FROM wedding_planners LOOP
        FOR master_template IN SELECT * FROM master_message_templates LOOP
            INSERT INTO planner_message_templates (
                id, planner_id, type, language, channel, subject, body, created_at, updated_at
            )
            VALUES (
                gen_random_uuid(),
                planner_record.id,
                master_template.type,
                master_template.language,
                master_template.channel,
                master_template.subject,
                master_template.body,
                NOW(),
                NOW()
            )
            ON CONFLICT (planner_id, type, language, channel) DO NOTHING;
        END LOOP;
        RAISE NOTICE 'Planner %: ensured all master templates exist', planner_record.id;
    END LOOP;
END $$;

-- Propagate any missing templates to weddings (copies from their planner's templates).
DO $$
DECLARE
    wedding_record RECORD;
    planner_template RECORD;
BEGIN
    FOR wedding_record IN SELECT id, planner_id FROM weddings LOOP
        FOR planner_template IN
            SELECT * FROM planner_message_templates
            WHERE planner_id = wedding_record.planner_id
        LOOP
            INSERT INTO message_templates (
                id, wedding_id, type, language, channel, subject, body,
                image_url, content_template_id, created_at, updated_at
            )
            VALUES (
                gen_random_uuid(),
                wedding_record.id,
                planner_template.type,
                planner_template.language,
                planner_template.channel,
                planner_template.subject,
                planner_template.body,
                planner_template.image_url,
                planner_template.content_template_id,
                NOW(),
                NOW()
            )
            ON CONFLICT (wedding_id, type, language, channel) DO NOTHING;
        END LOOP;
        RAISE NOTICE 'Wedding %: ensured all templates exist', wedding_record.id;
    END LOOP;
END $$;
