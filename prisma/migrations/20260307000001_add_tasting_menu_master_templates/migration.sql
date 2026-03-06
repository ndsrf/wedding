-- Seed TASTING_MENU master templates (5 languages × 3 channels = 15 templates)
-- These serve as defaults when planners create tasting menu message templates.

-- SPANISH (ES)
INSERT INTO master_message_templates (id, type, language, channel, subject, body, created_at, updated_at) VALUES
(uuid_generate_v4(), 'TASTING_MENU', 'ES', 'EMAIL',
  'Tu enlace para la degustación de {{coupleNames}}',
  'Hola {{participantName}},

Te invitamos a calificar los platos del menú de degustación para la boda de {{coupleNames}}.

Accede a tu enlace personal para valorar cada plato (del 1 al 5) y añadir tus comentarios:

{{tastingLink}}

¡Tu opinión es muy importante para nosotros!

Con cariño,
{{coupleNames}}', NOW(), NOW()),

(uuid_generate_v4(), 'TASTING_MENU', 'ES', 'WHATSAPP',
  'Degustación',
  '¡Hola {{participantName}}! 🍽️

Te invitamos a valorar el menú de degustación para la boda de {{coupleNames}}.

Accede a tu enlace personal para calificar cada plato:
{{tastingLink}}

¡Gracias por tu opinión!', NOW(), NOW()),

(uuid_generate_v4(), 'TASTING_MENU', 'ES', 'SMS',
  'Degustación',
  'Hola {{participantName}}! Valora el menú de degustación de {{coupleNames}}: {{tastingLink}}', NOW(), NOW()),

-- ENGLISH (EN)
(uuid_generate_v4(), 'TASTING_MENU', 'EN', 'EMAIL',
  'Your tasting menu link for {{coupleNames}}''s wedding',
  'Hi {{participantName}},

You are invited to rate the dishes at the tasting menu for {{coupleNames}}''s wedding.

Access your personal link to score each dish (1–5) and add your notes:

{{tastingLink}}

Your feedback means a lot to us!

With love,
{{coupleNames}}', NOW(), NOW()),

(uuid_generate_v4(), 'TASTING_MENU', 'EN', 'WHATSAPP',
  'Tasting Menu',
  'Hi {{participantName}}! 🍽️

You''re invited to rate the tasting menu for {{coupleNames}}''s wedding.

Access your personal link to score each dish:
{{tastingLink}}

Thank you for your feedback!', NOW(), NOW()),

(uuid_generate_v4(), 'TASTING_MENU', 'EN', 'SMS',
  'Tasting Menu',
  'Hi {{participantName}}! Rate the tasting menu for {{coupleNames}}: {{tastingLink}}', NOW(), NOW()),

-- FRENCH (FR)
(uuid_generate_v4(), 'TASTING_MENU', 'FR', 'EMAIL',
  'Votre lien pour la dégustation de {{coupleNames}}',
  'Bonjour {{participantName}},

Vous êtes invité(e) à noter les plats du menu de dégustation pour le mariage de {{coupleNames}}.

Accédez à votre lien personnel pour évaluer chaque plat (de 1 à 5) et ajouter vos commentaires :

{{tastingLink}}

Votre avis compte beaucoup pour nous !

Avec affection,
{{coupleNames}}', NOW(), NOW()),

(uuid_generate_v4(), 'TASTING_MENU', 'FR', 'WHATSAPP',
  'Dégustation',
  'Bonjour {{participantName}} ! 🍽️

Vous êtes invité(e) à noter le menu de dégustation pour le mariage de {{coupleNames}}.

Accédez à votre lien personnel :
{{tastingLink}}

Merci pour vos retours !', NOW(), NOW()),

(uuid_generate_v4(), 'TASTING_MENU', 'FR', 'SMS',
  'Dégustation',
  'Bonjour {{participantName}} ! Notez le menu de dégustation de {{coupleNames}} : {{tastingLink}}', NOW(), NOW()),

-- ITALIAN (IT)
(uuid_generate_v4(), 'TASTING_MENU', 'IT', 'EMAIL',
  'Il tuo link per la degustazione di {{coupleNames}}',
  'Ciao {{participantName}},

Sei invitato/a a valutare i piatti del menu di degustazione per il matrimonio di {{coupleNames}}.

Accedi al tuo link personale per valutare ogni piatto (da 1 a 5) e aggiungere i tuoi commenti:

{{tastingLink}}

Il tuo parere è molto importante per noi!

Con affetto,
{{coupleNames}}', NOW(), NOW()),

(uuid_generate_v4(), 'TASTING_MENU', 'IT', 'WHATSAPP',
  'Degustazione',
  'Ciao {{participantName}}! 🍽️

Sei invitato/a a valutare il menu di degustazione per il matrimonio di {{coupleNames}}.

Accedi al tuo link personale:
{{tastingLink}}

Grazie per il tuo feedback!', NOW(), NOW()),

(uuid_generate_v4(), 'TASTING_MENU', 'IT', 'SMS',
  'Degustazione',
  'Ciao {{participantName}}! Valuta il menu di degustazione di {{coupleNames}}: {{tastingLink}}', NOW(), NOW()),

-- GERMAN (DE)
(uuid_generate_v4(), 'TASTING_MENU', 'DE', 'EMAIL',
  'Dein Link für das Tasting-Menü von {{coupleNames}}',
  'Hallo {{participantName}},

Du bist eingeladen, die Gerichte des Tasting-Menüs für die Hochzeit von {{coupleNames}} zu bewerten.

Greife auf deinen persönlichen Link zu, um jedes Gericht zu bewerten (1–5) und Notizen hinzuzufügen:

{{tastingLink}}

Deine Meinung ist uns sehr wichtig!

Mit Liebe,
{{coupleNames}}', NOW(), NOW()),

(uuid_generate_v4(), 'TASTING_MENU', 'DE', 'WHATSAPP',
  'Tasting-Menü',
  'Hallo {{participantName}}! 🍽️

Du bist eingeladen, das Tasting-Menü für die Hochzeit von {{coupleNames}} zu bewerten.

Greife auf deinen persönlichen Link zu:
{{tastingLink}}

Vielen Dank für dein Feedback!', NOW(), NOW()),

(uuid_generate_v4(), 'TASTING_MENU', 'DE', 'SMS',
  'Tasting-Menü',
  'Hallo {{participantName}}! Bewerte das Tasting-Menü von {{coupleNames}}: {{tastingLink}}', NOW(), NOW())

ON CONFLICT (type, language, channel) DO NOTHING;
