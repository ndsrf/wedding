/**
 * Default message templates for all languages and template types
 * Supports placeholders: {{familyName}}, {{coupleNames}}, {{weddingDate}}, {{magicLink}}, etc.
 */

import { Language, TemplateType, Channel } from "@prisma/client";

export interface DefaultTemplate {
  subject: string;
  body: string;
}

export type TemplateDefaults = {
  [key in Language]: {
    [key in TemplateType]: {
      [key in Channel]: DefaultTemplate;
    };
  };
};

export const DEFAULT_TEMPLATES: TemplateDefaults = {
  ES: {
    SAVE_THE_DATE: {
      EMAIL: {
        subject: "¡Reserva la fecha! Nos casamos",
        body: `Estimada familia {{familyName}},

¡Estamos emocionados de anunciar que nos casamos!

**{{coupleNames}}**

📅 **Fecha:** {{weddingDate}}
📍 **Ubicación:** {{location}}

Reserva esta fecha en tu calendario. Pronto recibirás la invitación formal con todos los detalles.

¡Esperamos celebrar contigo!

Con cariño,
{{coupleNames}}`,
      },
      WHATSAPP: {
        subject: "¡Reserva la fecha!",
        body: `¡Hola {{familyName}}!

Nos emociona anunciarte que nos casamos.

{{coupleNames}}

📅 {{weddingDate}}
📍 {{location}}

¡Reserva la fecha! Pronto más detalles.

¡Nos vemos allí!`,
      },
      SMS: {
        subject: "Reserva la fecha",
        body: `¡Hola {{familyName}}! Nos casamos el {{weddingDate}}. ¡Reserva la fecha! Más detalles pronto.`,
      },
    },
    INVITATION: {
      EMAIL: {
        subject: "¡Estamos emocionados de compartir nuestro gran día!",
        body: `Estimada familia {{familyName}},

Nos complace invitarles a celebrar nuestro matrimonio:

**{{coupleNames}}**

📅 **Fecha:** {{weddingDate}}
⏰ **Hora:** {{weddingTime}}
📍 **Ubicación:** {{location}}

Para confirmar su asistencia, por favor haga clic en el siguiente enlace antes del {{rsvpCutoffDate}}:

[Confirmar asistencia]( {{magicLink}} )

Si tiene alguna pregunta, no dude en contactarnos.

Con cariño,
{{coupleNames}}`,
      },
      WHATSAPP: {
        subject: "Invitación a nuestra boda",
        body: `¡Hola {{familyName}}!

Nos emociona invitarlos a celebrar nuestro matrimonio.

{{coupleNames}}

📅 {{weddingDate}}
⏰ {{weddingTime}}
📍 {{location}}

Confirma tu asistencia aquí: {{magicLink}}

Plazo: {{rsvpCutoffDate}}

¡Esperamos verte allí!`,
      },
      SMS: {
        subject: "Invitación",
        body: `Hola {{familyName}}, te invitamos a nuestra boda el {{weddingDate}} en {{location}}. Confirma aquí: {{magicLink}}`,
      },
    },
    REMINDER: {
      EMAIL: {
        subject: "Recuerdo: ¡No olvides confirmar tu asistencia!",
        body: `Estimada familia {{familyName}},

Este es un recordatorio amable para que confirme su asistencia a nuestra boda:

**{{coupleNames}}**

📅 **Fecha:** {{weddingDate}}
⏰ **Hora:** {{weddingTime}}
📍 **Ubicación:** {{location}}

Por favor, confirme antes de {{rsvpCutoffDate}}:

[Confirmar asistencia]( {{magicLink}} )

Agradecemos su respuesta.

Con cariño,
{{coupleNames}}`,
      },
      WHATSAPP: {
        subject: "Recordatorio: Confirma tu asistencia",
        body: `Hola {{familyName}}, te recordamos que confirmes tu asistencia a nuestra boda el {{weddingDate}}. Plazo: {{rsvpCutoffDate}}. Link: {{magicLink}}`,
      },
      SMS: {
        subject: "Recordatorio",
        body: `Recordatorio: Confirma tu asistencia antes de {{rsvpCutoffDate}}. {{magicLink}}`,
      },
    },
    CONFIRMATION: {
      EMAIL: {
        subject: "¡Confirmación recibida! Nos vemos pronto",
        body: `Estimada familia {{familyName}},

¡Gracias por confirmar su asistencia a nuestra boda!

Estamos muy emocionados de celebrar este día especial con ustedes.

**{{coupleNames}}**

📅 **Fecha:** {{weddingDate}}
⏰ **Hora:** {{weddingTime}}
📍 **Ubicación:** {{location}}

Nos vemos pronto.

Con cariño,
{{coupleNames}}`,
      },
      WHATSAPP: {
        subject: "¡Confirmación recibida!",
        body: `¡Gracias {{familyName}} por confirmar tu asistencia! Nos emociona verte en nuestra boda el {{weddingDate}} en {{location}}. ¡Nos vemos pronto!`,
      },
      SMS: {
        subject: "Confirmación",
        body: `¡Gracias {{familyName}}! Tu asistencia ha sido confirmada para el {{weddingDate}}. ¡Nos vemos allí!`,
      },
    },
    TASTING_MENU: {
      EMAIL: {
        subject: "Invitación a la Degustación del Menú - {{coupleNames}}",
        body: `Estimado/a {{tastingParticipantName}},

¡Te invitamos a participar en la degustación del menú para la boda de {{coupleNames}}!

Por favor, visita el siguiente enlace para valorar cada plato y compartir tu opinión:

{{tastingLink}}

¡Esperamos tu feedback!

Con cariño,
{{coupleNames}}`,
      },
      WHATSAPP: {
        subject: "Invitación a la Degustación",
        body: `¡Hola {{tastingParticipantName}}! 🍽️ Te invitamos a la degustación del menú para la boda de {{coupleNames}}. Valora cada plato aquí: {{tastingLink}}`,
      },
      SMS: {
        subject: "Degustación",
        body: `¡Hola {{tastingParticipantName}}! Tu enlace para la degustación del menú de {{coupleNames}}: {{tastingLink}}`,
      },
    },
  },
  EN: {
    SAVE_THE_DATE: {
      EMAIL: {
        subject: "Save the Date! We're getting married",
        body: `Dear {{familyName}},

We're excited to announce that we're getting married!

**{{coupleNames}}**

📅 **Date:** {{weddingDate}}
📍 **Location:** {{location}}

Please save this date on your calendar. You'll receive the formal invitation with all the details soon.

We can't wait to celebrate with you!

With love,
{{coupleNames}}`,
      },
      WHATSAPP: {
        subject: "Save the Date!",
        body: `Hi {{familyName}}!

We're excited to announce we're getting married!

{{coupleNames}}

📅 {{weddingDate}}
📍 {{location}}

Save the date! More details coming soon.

See you there!`,
      },
      SMS: {
        subject: "Save the Date",
        body: `Hi {{familyName}}! We're getting married on {{weddingDate}}. Save the date! More details soon.`,
      },
    },
    INVITATION: {
      EMAIL: {
        subject: "You're invited to celebrate our wedding!",
        body: `Dear {{familyName}},

We are delighted to invite you to celebrate our marriage:

**{{coupleNames}}**

📅 **Date:** {{weddingDate}}
⏰ **Time:** {{weddingTime}}
📍 **Location:** {{location}}

Please confirm your attendance by {{rsvpCutoffDate}}:

[Confirm Attendance]( {{magicLink}} )

If you have any questions, please don't hesitate to contact us.

With love,
{{coupleNames}}`,
      },
      WHATSAPP: {
        subject: "Wedding Invitation",
        body: `Hi {{familyName}}!

We're excited to invite you to celebrate our wedding!

{{coupleNames}}

📅 {{weddingDate}}
⏰ {{weddingTime}}
📍 {{location}}

Please confirm your attendance here: {{magicLink}}

RSVP by: {{rsvpCutoffDate}}

See you there!`,
      },
      SMS: {
        subject: "Invitation",
        body: `Hi {{familyName}}, you're invited to our wedding on {{weddingDate}} at {{location}}. RSVP here: {{magicLink}}`,
      },
    },
    REMINDER: {
      EMAIL: {
        subject: "Reminder: Please confirm your attendance",
        body: `Dear {{familyName}},

This is a friendly reminder to confirm your attendance at our wedding:

**{{coupleNames}}**

📅 **Date:** {{weddingDate}}
⏰ **Time:** {{weddingTime}}
📍 **Location:** {{location}}

Please confirm by {{rsvpCutoffDate}}:

[Confirm Attendance]( {{magicLink}} )

We look forward to celebrating with you!

With love,
{{coupleNames}}`,
      },
      WHATSAPP: {
        subject: "Reminder: Confirm your attendance",
        body: `Hi {{familyName}}, just a reminder to confirm your attendance for our wedding on {{weddingDate}}. Please RSVP by {{rsvpCutoffDate}}: {{magicLink}}`,
      },
      SMS: {
        subject: "Reminder",
        body: `Reminder: Please confirm by {{rsvpCutoffDate}}. {{magicLink}}`,
      },
    },
    CONFIRMATION: {
      EMAIL: {
        subject: "RSVP Confirmed! See you soon",
        body: `Dear {{familyName}},

Thank you for confirming your attendance at our wedding!

We are so excited to celebrate this special day with you.

**{{coupleNames}}**

📅 **Date:** {{weddingDate}}
⏰ **Time:** {{weddingTime}}
📍 **Location:** {{location}}

See you soon!

With love,
{{coupleNames}}`,
      },
      WHATSAPP: {
        subject: "RSVP Confirmed!",
        body: `Thank you {{familyName}} for confirming your attendance! We're so excited to see you at our wedding on {{weddingDate}} at {{location}}. See you soon!`,
      },
      SMS: {
        subject: "Confirmed",
        body: `Thank you {{familyName}}! Your attendance is confirmed for {{weddingDate}}. See you there!`,
      },
    },
    TASTING_MENU: {
      EMAIL: {
        subject: "Invitation to Menu Tasting - {{coupleNames}}",
        body: `Dear {{tastingParticipantName}},

You are invited to participate in the menu tasting for {{coupleNames}}'s wedding!

Please visit the following link to rate each dish and share your thoughts:

{{tastingLink}}

We look forward to your feedback!

With love,
{{coupleNames}}`,
      },
      WHATSAPP: {
        subject: "Menu Tasting Invitation",
        body: `Hi {{tastingParticipantName}}! 🍽️ You're invited to the menu tasting for {{coupleNames}}'s wedding. Rate each dish here: {{tastingLink}}`,
      },
      SMS: {
        subject: "Menu Tasting",
        body: `Hi {{tastingParticipantName}}! Your tasting menu link for {{coupleNames}}'s wedding: {{tastingLink}}`,
      },
    },
  },
  FR: {
    SAVE_THE_DATE: {
      EMAIL: {
        subject: "Réservez la date! Nous nous marions",
        body: `Chère famille {{familyName}},

Nous sommes ravis d'annoncer que nous nous marions!

**{{coupleNames}}**

📅 **Date:** {{weddingDate}}
📍 **Lieu:** {{location}}

Réservez cette date dans votre agenda. Vous recevrez bientôt l'invitation formelle avec tous les détails.

Nous avons hâte de célébrer avec vous!

Avec amour,
{{coupleNames}}`,
      },
      WHATSAPP: {
        subject: "Réservez la date!",
        body: `Bonjour {{familyName}}!

Nous sommes heureux d'annoncer que nous nous marions!

{{coupleNames}}

📅 {{weddingDate}}
📍 {{location}}

Réservez la date! Plus de détails bientôt.

À bientôt!`,
      },
      SMS: {
        subject: "Réservez la date",
        body: `Bonjour {{familyName}}! Nous nous marions le {{weddingDate}}. Réservez la date! Plus de détails bientôt.`,
      },
    },
    INVITATION: {
      EMAIL: {
        subject: "Vous êtes invités à célébrer notre mariage!",
        body: `Chère famille {{familyName}},

Nous sommes ravis de vous inviter à célébrer notre mariage:

**{{coupleNames}}**

📅 **Date:** {{weddingDate}}
⏰ **Heure:** {{weddingTime}}
📍 **Lieu:** {{location}}

Veuillez confirmer votre présence avant le {{rsvpCutoffDate}}:

[Confirmer votre présence]( {{magicLink}} )

Si vous avez des questions, n'hésitez pas à nous contacter.

Avec amour,
{{coupleNames}}`,
      },
      WHATSAPP: {
        subject: "Invitation à notre mariage",
        body: `Bonjour {{familyName}}!

Nous sommes heureux de vous inviter à célébrer notre mariage!

{{coupleNames}}

📅 {{weddingDate}}
⏰ {{weddingTime}}
📍 {{location}}

Confirmez votre présence ici: {{magicLink}}

À confirmer avant: {{rsvpCutoffDate}}

À bientôt!`,
      },
      SMS: {
        subject: "Invitation",
        body: `Bonjour {{familyName}}, vous êtes invité à notre mariage le {{weddingDate}} à {{location}}. Confirmez ici: {{magicLink}}`,
      },
    },
    REMINDER: {
      EMAIL: {
        subject: "Rappel: Veuillez confirmer votre présence",
        body: `Chère famille {{familyName}},

Ceci est un aimable rappel pour confirmer votre présence à notre mariage:

**{{coupleNames}}**

📅 **Date:** {{weddingDate}}
⏰ **Heure:** {{weddingTime}}
📍 **Lieu:** {{location}}

Veuillez confirmer avant le {{rsvpCutoffDate}}:

[Confirmer votre présence]( {{magicLink}} )

Nous sommes heureux de célébrer avec vous!

Avec amour,
{{coupleNames}}`,
      },
      WHATSAPP: {
        subject: "Rappel: Confirmez votre présence",
        body: `Bonjour {{familyName}}, nous vous rappelons de confirmer votre présence à notre mariage le {{weddingDate}}. À confirmer avant: {{rsvpCutoffDate}}: {{magicLink}}`,
      },
      SMS: {
        subject: "Rappel",
        body: `Rappel: Veuillez confirmer avant {{rsvpCutoffDate}}. {{magicLink}}`,
      },
    },
    CONFIRMATION: {
      EMAIL: {
        subject: "Confirmation reçue! À bientôt",
        body: `Chère famille {{familyName}},

Merci d'avoir confirmé votre présence à notre mariage!

Nous sommes ravis de célébrer ce jour spécial avec vous.

**{{coupleNames}}**

📅 **Date:** {{weddingDate}}
⏰ **Heure:** {{weddingTime}}
📍 **Lieu:** {{location}}

À bientôt!

Avec amour,
{{coupleNames}}`,
      },
      WHATSAPP: {
        subject: "Confirmation reçue!",
        body: `Merci {{familyName}} d'avoir confirmé votre présence! Nous sommes ravis de vous voir à notre mariage le {{weddingDate}} à {{location}}. À bientôt!`,
      },
      SMS: {
        subject: "Confirmé",
        body: `Merci {{familyName}}! Votre présence est confirmée pour le {{weddingDate}}. À bientôt!`,
      },
    },
    TASTING_MENU: {
      EMAIL: {
        subject: "Invitation à la dégustation du menu - {{coupleNames}}",
        body: `Cher/Chère {{tastingParticipantName}},

Vous êtes invité(e) à participer à la dégustation du menu pour le mariage de {{coupleNames}}!

Veuillez visiter le lien suivant pour noter chaque plat et partager votre avis:

{{tastingLink}}

Nous attendons vos retours avec impatience!

Avec amour,
{{coupleNames}}`,
      },
      WHATSAPP: {
        subject: "Dégustation du menu",
        body: `Bonjour {{tastingParticipantName}}! 🍽️ Vous êtes invité(e) à la dégustation du menu pour le mariage de {{coupleNames}}. Notez chaque plat ici: {{tastingLink}}`,
      },
      SMS: {
        subject: "Dégustation",
        body: `Bonjour {{tastingParticipantName}}! Votre lien de dégustation pour {{coupleNames}}: {{tastingLink}}`,
      },
    },
  },
  IT: {
    SAVE_THE_DATE: {
      EMAIL: {
        subject: "Segnate la data! Ci sposiamo",
        body: `Caro famiglia {{familyName}},

Siamo felicissimi di annunciare che ci sposiamo!

**{{coupleNames}}**

📅 **Data:** {{weddingDate}}
📍 **Luogo:** {{location}}

Segnate questa data nel vostro calendario. Riceverete presto l'invito formale con tutti i dettagli.

Non vediamo l'ora di festeggiare con voi!

Con amore,
{{coupleNames}}`,
      },
      WHATSAPP: {
        subject: "Segnate la data!",
        body: `Ciao {{familyName}}!

Siamo felici di annunciare che ci sposiamo!

{{coupleNames}}

📅 {{weddingDate}}
📍 {{location}}

Segnate la data! Altri dettagli a breve.

A presto!`,
      },
      SMS: {
        subject: "Segnate la data",
        body: `Ciao {{familyName}}! Ci sposiamo il {{weddingDate}}. Segnate la data! Altri dettagli a breve.`,
      },
    },
    INVITATION: {
      EMAIL: {
        subject: "Siete invitati a celebrare il nostro matrimonio!",
        body: `Caro famiglia {{familyName}},

Siamo felicissimi di invitarvi a celebrare il nostro matrimonio:

**{{coupleNames}}**

📅 **Data:** {{weddingDate}}
⏰ **Ora:** {{weddingTime}}
📍 **Luogo:** {{location}}

Vi prego di confermare la vostra presenza entro il {{rsvpCutoffDate}}:

[Conferma partecipazione]( {{magicLink}} )

Se avete domande, non esitate a contattarci.

Con amore,
{{coupleNames}}`,
      },
      WHATSAPP: {
        subject: "Invito al nostro matrimonio",
        body: `Ciao {{familyName}}!

Siamo felici di invitarvi a celebrare il nostro matrimonio!

{{coupleNames}}

📅 {{weddingDate}}
⏰ {{weddingTime}}
📍 {{location}}

Confermate la vostra partecipazione qui: {{magicLink}}

Da confermare entro: {{rsvpCutoffDate}}

A presto!`,
      },
      SMS: {
        subject: "Invito",
        body: `Ciao {{familyName}}, siete invitati al nostro matrimonio il {{weddingDate}} a {{location}}. Confermate qui: {{magicLink}}`,
      },
    },
    REMINDER: {
      EMAIL: {
        subject: "Promemoria: Confermate la vostra partecipazione",
        body: `Caro famiglia {{familyName}},

Questo è un gentile promemoria per confermare la vostra partecipazione al nostro matrimonio:

**{{coupleNames}}**

📅 **Data:** {{weddingDate}}
⏰ **Ora:** {{weddingTime}}
📍 **Luogo:** {{location}}

Vi prego di confermare entro il {{rsvpCutoffDate}}:

[Conferma partecipazione]( {{magicLink}} )

Siamo felici di celebrare con voi!

Con amore,
{{coupleNames}}`,
      },
      WHATSAPP: {
        subject: "Promemoria: Confermate la vostra partecipazione",
        body: `Ciao {{familyName}}, vi ricordiamo di confermare la vostra partecipazione al nostro matrimonio il {{weddingDate}}. Da confermare entro: {{rsvpCutoffDate}}: {{magicLink}}`,
      },
      SMS: {
        subject: "Promemoria",
        body: `Promemoria: Confermate entro {{rsvpCutoffDate}}. {{magicLink}}`,
      },
    },
    CONFIRMATION: {
      EMAIL: {
        subject: "Conferma ricevuta! A presto",
        body: `Caro famiglia {{familyName}},

Grazie per aver confermato la vostra partecipazione al nostro matrimonio!

Siamo molto felici di celebrare questo giorno speciale con voi.

**{{coupleNames}}**

📅 **Data:** {{weddingDate}}
⏰ **Ora:** {{weddingTime}}
📍 **Luogo:** {{location}}

A presto!

Con amore,
{{coupleNames}}`,
      },
      WHATSAPP: {
        subject: "Conferma ricevuta!",
        body: `Grazie {{familyName}} per aver confermato la vostra partecipazione! Siamo felicissimi di vedervi al nostro matrimonio il {{weddingDate}} a {{location}}. A presto!`,
      },
      SMS: {
        subject: "Confermato",
        body: `Grazie {{familyName}}! La vostra partecipazione è confermata per il {{weddingDate}}. A presto!`,
      },
    },
    TASTING_MENU: {
      EMAIL: {
        subject: "Invito alla degustazione del menu - {{coupleNames}}",
        body: `Caro/a {{tastingParticipantName}},

Sei invitato/a a partecipare alla degustazione del menu per il matrimonio di {{coupleNames}}!

Visita il seguente link per valutare ogni piatto e condividere la tua opinione:

{{tastingLink}}

Non vediamo l'ora di ricevere il tuo feedback!

Con amore,
{{coupleNames}}`,
      },
      WHATSAPP: {
        subject: "Degustazione menu",
        body: `Ciao {{tastingParticipantName}}! 🍽️ Sei invitato/a alla degustazione del menu per il matrimonio di {{coupleNames}}. Valuta ogni piatto qui: {{tastingLink}}`,
      },
      SMS: {
        subject: "Degustazione",
        body: `Ciao {{tastingParticipantName}}! Il tuo link per la degustazione di {{coupleNames}}: {{tastingLink}}`,
      },
    },
  },
  DE: {
    SAVE_THE_DATE: {
      EMAIL: {
        subject: "Reserviert euch den Termin! Wir heiraten",
        body: `Liebe Familie {{familyName}},

Wir freuen uns, euch mitzuteilen, dass wir heiraten!

**{{coupleNames}}**

📅 **Datum:** {{weddingDate}}
📍 **Ort:** {{location}}

Bitte reserviert euch diesen Termin. Die formelle Einladung mit allen Details folgt bald.

Wir freuen uns darauf, mit euch zu feiern!

Mit Liebe,
{{coupleNames}}`,
      },
      WHATSAPP: {
        subject: "Reserviert den Termin!",
        body: `Hallo {{familyName}}!

Wir freuen uns, euch mitzuteilen, dass wir heiraten!

{{coupleNames}}

📅 {{weddingDate}}
📍 {{location}}

Reserviert den Termin! Mehr Details folgen bald.

Bis bald!`,
      },
      SMS: {
        subject: "Reserviert den Termin",
        body: `Hallo {{familyName}}! Wir heiraten am {{weddingDate}}. Reserviert den Termin! Mehr Details bald.`,
      },
    },
    INVITATION: {
      EMAIL: {
        subject: "Ihr seid zu unserer Hochzeit eingeladen!",
        body: `Liebe Familie {{familyName}},

Wir freuen uns, euch zu unserer Hochzeit einzuladen:

**{{coupleNames}}**

📅 **Datum:** {{weddingDate}}
⏰ **Uhrzeit:** {{weddingTime}}
📍 **Ort:** {{location}}

Bitte bestätigt eure Teilnahme bis zum {{rsvpCutoffDate}}:

[Teilnahme bestätigen]( {{magicLink}} )

Falls ihr Fragen habt, zögert nicht, uns zu kontaktieren.

Mit Liebe,
{{coupleNames}}`,
      },
      WHATSAPP: {
        subject: "Einladung zu unserer Hochzeit",
        body: `Hallo {{familyName}}!

Wir freuen uns, euch zu unserer Hochzeit einzuladen!

{{coupleNames}}

📅 {{weddingDate}}
⏰ {{weddingTime}}
📍 {{location}}

Bitte bestätigt hier: {{magicLink}}

Bestätigung bis: {{rsvpCutoffDate}}

Bis bald!`,
      },
      SMS: {
        subject: "Einladung",
        body: `Hallo {{familyName}}, ihr seid zu unserer Hochzeit am {{weddingDate}} in {{location}} eingeladen. Bestätigt hier: {{magicLink}}`,
      },
    },
    REMINDER: {
      EMAIL: {
        subject: "Erinnerung: Bitte bestätigt eure Teilnahme",
        body: `Liebe Familie {{familyName}},

Dies ist eine freundliche Erinnerung, eure Teilnahme an unserer Hochzeit zu bestätigen:

**{{coupleNames}}**

📅 **Datum:** {{weddingDate}}
⏰ **Uhrzeit:** {{weddingTime}}
📍 **Ort:** {{location}}

Bitte bestätigt bis zum {{rsvpCutoffDate}}:

[Teilnahme bestätigen]( {{magicLink}} )

Wir freuen uns, mit euch zu feiern!

Mit Liebe,
{{coupleNames}}`,
      },
      WHATSAPP: {
        subject: "Erinnerung: Bestätigt eure Teilnahme",
        body: `Hallo {{familyName}}, dies ist eine Erinnerung, eure Teilnahme an unserer Hochzeit am {{weddingDate}} zu bestätigen. Bestätigung bis: {{rsvpCutoffDate}}: {{magicLink}}`,
      },
      SMS: {
        subject: "Erinnerung",
        body: `Erinnerung: Bestätigt bis {{rsvpCutoffDate}}. {{magicLink}}`,
      },
    },
    CONFIRMATION: {
      EMAIL: {
        subject: "Bestätigung erhalten! Bis bald",
        body: `Liebe Familie {{familyName}},

Vielen Dank für die Bestätigung eurer Teilnahme an unserer Hochzeit!

Wir freuen uns sehr darauf, diesen besonderen Tag mit euch zu feiern.

**{{coupleNames}}**

📅 **Datum:** {{weddingDate}}
⏰ **Uhrzeit:** {{weddingTime}}
📍 **Ort:** {{location}}

Bis bald!

Mit Liebe,
{{coupleNames}}`,
      },
      WHATSAPP: {
        subject: "Bestätigung erhalten!",
        body: `Danke {{familyName}} für die Bestätigung! Wir freuen uns sehr, euch bei unserer Hochzeit am {{weddingDate}} in {{location}} zu sehen. Bis bald!`,
      },
      SMS: {
        subject: "Bestätigt",
        body: `Danke {{familyName}}! Eure Teilnahme ist für den {{weddingDate}} bestätigt. Bis bald!`,
      },
    },
    TASTING_MENU: {
      EMAIL: {
        subject: "Einladung zur Menüverkostung - {{coupleNames}}",
        body: `Liebe/r {{tastingParticipantName}},

Wir laden Sie herzlich zu unserer Menüverkostung für die Hochzeit von {{coupleNames}} ein!

Bitte besuchen Sie den folgenden Link, um jeden Gang zu bewerten und Ihre Meinung zu teilen:

{{tastingLink}}

Wir freuen uns auf Ihr Feedback!

Mit Liebe,
{{coupleNames}}`,
      },
      WHATSAPP: {
        subject: "Einladung zur Menüverkostung",
        body: `Hallo {{tastingParticipantName}}! 🍽️ Wir laden dich zur Menüverkostung für die Hochzeit von {{coupleNames}} ein. Bewerte jeden Gang hier: {{tastingLink}}`,
      },
      SMS: {
        subject: "Menüverkostung",
        body: `Hallo {{tastingParticipantName}}! Dein Link zur Menüverkostung für {{coupleNames}}: {{tastingLink}}`,
      },
    },
  },
};

/**
 * Get default template content for a specific language, type, and channel
 */
export function getDefaultTemplate(
  language: Language,
  type: TemplateType,
  channel: Channel
): DefaultTemplate {
  return DEFAULT_TEMPLATES[language][type][channel];
}

/**
 * Get all default templates for a wedding (5 languages x 4 types x 3 channels = 60 templates)
 */
export function getAllDefaultTemplates(): Array<{
  language: Language;
  type: TemplateType;
  channel: Channel;
  subject: string;
  body: string;
}> {
  const languages: Language[] = ["ES", "EN", "FR", "IT", "DE"];
  const types: TemplateType[] = ["SAVE_THE_DATE", "INVITATION", "REMINDER", "CONFIRMATION", "TASTING_MENU"];
  const channels: Channel[] = ["EMAIL", "WHATSAPP", "SMS"];

  return languages.flatMap((language) =>
    types.flatMap((type) =>
      channels.map((channel) => {
        const template = DEFAULT_TEMPLATES[language][type][channel];
        return {
          language,
          type,
          channel,
          ...template,
        };
      })
    )
  );
}
