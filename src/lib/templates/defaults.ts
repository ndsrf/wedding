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
  },
  EN: {
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
  },
  FR: {
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
  },
  IT: {
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
  },
  DE: {
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
 * Get all default templates for a wedding (5 languages x 2 types x 3 channels = 30 templates)
 */
export function getAllDefaultTemplates(): Array<{
  language: Language;
  type: TemplateType;
  channel: Channel;
  subject: string;
  body: string;
}> {
  const languages: Language[] = ["ES", "EN", "FR", "IT", "DE"];
  const types: TemplateType[] = ["INVITATION", "REMINDER"];
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
