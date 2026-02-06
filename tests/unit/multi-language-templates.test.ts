/**
 * Unit tests for Multi-Language Template Support
 * Tests template rendering with different languages and special characters
 */

import { renderTemplate, type TemplateVariables } from '@/lib/templates/renderer';
import { formatDateByLanguage } from '@/lib/date-formatter';

describe('Multi-Language Template Rendering', () => {
  describe('English (EN)', () => {
    it('should render English invitation template', () => {
      const template = `Dear {{familyName}},

You are cordially invited to the wedding of {{coupleNames}}.

Date: {{weddingDate}}
Time: {{weddingTime}}
Location: {{location}}

Please RSVP by {{rsvpCutoffDate}} using this link: {{magicLink}}

We look forward to celebrating with you!`;

      const variables: TemplateVariables = {
        familyName: 'Smith Family',
        coupleNames: 'John & Jane',
        weddingDate: 'Saturday, June 15, 2024',
        weddingTime: '4:00 PM',
        location: 'Grand Ballroom, Downtown Hotel',
        rsvpCutoffDate: 'May 31, 2024',
        magicLink: 'https://wedding.com/rsvp/abc123',
      };

      const result = renderTemplate(template, variables);

      expect(result).toContain('Dear Smith Family');
      expect(result).toContain('John & Jane');
      expect(result).toContain('Saturday, June 15, 2024');
    });
  });

  describe('Spanish (ES)', () => {
    it('should render Spanish invitation template with accents', () => {
      const template = `Querida familia {{familyName}},

Están cordialmente invitados a la boda de {{coupleNames}}.

Fecha: {{weddingDate}}
Hora: {{weddingTime}}
Ubicación: {{location}}

Por favor confirmen su asistencia antes del {{rsvpCutoffDate}} usando este enlace: {{magicLink}}

¡Esperamos celebrar con ustedes!`;

      const variables: TemplateVariables = {
        familyName: 'García',
        coupleNames: 'José & María',
        weddingDate: 'Sábado, 15 de junio de 2024',
        weddingTime: '16:00',
        location: 'Gran Salón, Hotel Centro',
        rsvpCutoffDate: '31 de mayo de 2024',
        magicLink: 'https://boda.com/rsvp/abc123',
      };

      const result = renderTemplate(template, variables);

      expect(result).toContain('Querida familia García');
      expect(result).toContain('José & María');
      expect(result).toContain('Sábado, 15 de junio de 2024');
      expect(result).toContain('¡Esperamos celebrar con ustedes!');
    });

    it('should handle Spanish special characters correctly', () => {
      const template = '{{familyName}} - {{location}}';
      const variables: TemplateVariables = {
        familyName: 'Peña-Niñez',
        location: 'Málaga, España',
      };

      const result = renderTemplate(template, variables);

      expect(result).toBe('Peña-Niñez - Málaga, España');
    });
  });

  describe('French (FR)', () => {
    it('should render French invitation template with accents', () => {
      const template = `Chère famille {{familyName}},

Vous êtes cordialement invités au mariage de {{coupleNames}}.

Date: {{weddingDate}}
Heure: {{weddingTime}}
Lieu: {{location}}

Veuillez confirmer votre présence avant le {{rsvpCutoffDate}} en utilisant ce lien: {{magicLink}}

Nous avons hâte de célébrer avec vous!`;

      const variables: TemplateVariables = {
        familyName: 'Dubois',
        coupleNames: 'François & Élise',
        weddingDate: 'Samedi, 15 juin 2024',
        weddingTime: '16h00',
        location: 'Château de Versailles',
        rsvpCutoffDate: '31 mai 2024',
        magicLink: 'https://mariage.com/rsvp/abc123',
      };

      const result = renderTemplate(template, variables);

      expect(result).toContain('Chère famille Dubois');
      expect(result).toContain('François & Élise');
      expect(result).toContain('Château de Versailles');
      expect(result).toContain('Nous avons hâte de célébrer avec vous!');
    });

    it('should handle French special characters correctly', () => {
      const template = '{{coupleNames}} à {{location}}';
      const variables: TemplateVariables = {
        coupleNames: 'François & Héloïse',
        location: 'Côte d\'Azur',
      };

      const result = renderTemplate(template, variables);

      expect(result).toBe('François & Héloïse à Côte d\'Azur');
    });
  });

  describe('Italian (IT)', () => {
    it('should render Italian invitation template', () => {
      const template = `Cara famiglia {{familyName}},

Siete cordialmente invitati al matrimonio di {{coupleNames}}.

Data: {{weddingDate}}
Ora: {{weddingTime}}
Luogo: {{location}}

Si prega di confermare la vostra presenza entro il {{rsvpCutoffDate}} utilizzando questo link: {{magicLink}}

Non vediamo l'ora di festeggiare con voi!`;

      const variables: TemplateVariables = {
        familyName: 'Rossi',
        coupleNames: 'Marco & Lucia',
        weddingDate: 'Sabato, 15 giugno 2024',
        weddingTime: '16:00',
        location: 'Villa Borghese, Roma',
        rsvpCutoffDate: '31 maggio 2024',
        magicLink: 'https://matrimonio.com/rsvp/abc123',
      };

      const result = renderTemplate(template, variables);

      expect(result).toContain('Cara famiglia Rossi');
      expect(result).toContain('Marco & Lucia');
      expect(result).toContain('Villa Borghese, Roma');
      expect(result).toContain('Non vediamo l\'ora di festeggiare con voi!');
    });
  });

  describe('German (DE)', () => {
    it('should render German invitation template with umlauts', () => {
      const template = `Liebe Familie {{familyName}},

Sie sind herzlich zur Hochzeit von {{coupleNames}} eingeladen.

Datum: {{weddingDate}}
Uhrzeit: {{weddingTime}}
Ort: {{location}}

Bitte bestätigen Sie Ihre Teilnahme bis zum {{rsvpCutoffDate}} über diesen Link: {{magicLink}}

Wir freuen uns darauf, mit Ihnen zu feiern!`;

      const variables: TemplateVariables = {
        familyName: 'Müller',
        coupleNames: 'Jürgen & Ännchen',
        weddingDate: 'Samstag, 15. Juni 2024',
        weddingTime: '16:00 Uhr',
        location: 'Schloss Neuschwanstein',
        rsvpCutoffDate: '31. Mai 2024',
        magicLink: 'https://hochzeit.com/rsvp/abc123',
      };

      const result = renderTemplate(template, variables);

      expect(result).toContain('Liebe Familie Müller');
      expect(result).toContain('Jürgen & Ännchen');
      expect(result).toContain('Schloss Neuschwanstein');
      expect(result).toContain('Wir freuen uns darauf, mit Ihnen zu feiern!');
    });

    it('should handle German special characters correctly', () => {
      const template = '{{familyName}} - {{location}}';
      const variables: TemplateVariables = {
        familyName: 'Schröder',
        location: 'München, Größe Straße',
      };

      const result = renderTemplate(template, variables);

      expect(result).toBe('Schröder - München, Größe Straße');
    });
  });

  describe('Mixed Language Content', () => {
    it('should handle templates with multiple language characters', () => {
      const template = 'Wedding: {{coupleNames}} in {{location}}';
      const variables: TemplateVariables = {
        coupleNames: 'François & María',
        location: 'Zürich, Schweiz',
      };

      const result = renderTemplate(template, variables);

      expect(result).toBe('Wedding: François & María in Zürich, Schweiz');
    });

    it('should handle emoji in multi-language templates', () => {
      const template = '💒 {{coupleNames}} 💍 - {{location}} 🎉';
      const variables: TemplateVariables = {
        coupleNames: 'José & María',
        location: 'Barcelona, España',
      };

      const result = renderTemplate(template, variables);

      expect(result).toContain('José & María');
      expect(result).toContain('💒');
      expect(result).toContain('💍');
      expect(result).toContain('🎉');
    });

    it('should preserve line breaks in multi-language templates', () => {
      const template = `{{familyName}}

Votre invitation

{{location}}`;
      const variables: TemplateVariables = {
        familyName: 'Famille Dubois',
        location: 'Paris, France',
      };

      const result = renderTemplate(template, variables);

      expect(result).toBe(`Famille Dubois

Votre invitation

Paris, France`);
    });
  });

  describe('WhatsApp Message Formatting', () => {
    it('should render Spanish WhatsApp message', () => {
      const template = `¡Hola familia {{familyName}}! 👋

Estamos emocionados de invitarles a nuestra boda 💒

📅 Fecha: {{weddingDate}}
⏰ Hora: {{weddingTime}}
📍 Lugar: {{location}}

Para confirmar tu asistencia, visita: {{magicLink}}

¡Nos vemos pronto! 🎉`;

      const variables: TemplateVariables = {
        familyName: 'González',
        weddingDate: 'Sábado, 15 de junio',
        weddingTime: '16:00',
        location: 'Hacienda San José',
        magicLink: 'https://boda.com/rsvp/xyz',
      };

      const result = renderTemplate(template, variables);

      expect(result).toContain('¡Hola familia González! 👋');
      expect(result).toContain('💒');
      expect(result).toContain('Hacienda San José');
      expect(result).toContain('🎉');
    });

    it('should render French WhatsApp message with accents', () => {
      const template = `Bonjour {{familyName}}! 💐

Nous serions ravis de vous avoir à notre mariage! 🥂

📅 {{weddingDate}}
⏰ {{weddingTime}}
📍 {{location}}

Répondez ici: {{magicLink}}

À bientôt! ❤️`;

      const variables: TemplateVariables = {
        familyName: 'Famille Beaumont',
        weddingDate: 'Samedi, 15 juin',
        weddingTime: '16h00',
        location: 'Château de Chambord',
        magicLink: 'https://mariage.fr/rsvp/xyz',
      };

      const result = renderTemplate(template, variables);

      expect(result).toContain('Bonjour Famille Beaumont! 💐');
      expect(result).toContain('Château de Chambord');
      expect(result).toContain('Répondez ici');
      expect(result).toContain('❤️');
    });
  });

  describe('Edge Cases with Special Characters', () => {
    it('should handle curly quotes in templates', () => {
      const template = '"{{familyName}}" invited to "{{coupleNames}}" wedding';
      const variables: TemplateVariables = {
        familyName: 'O\'Brien',
        coupleNames: 'Patrick & Siobhán',
      };

      const result = renderTemplate(template, variables);

      expect(result).toBe('"O\'Brien" invited to "Patrick & Siobhán" wedding');
    });

    it('should handle apostrophes in names', () => {
      const template = '{{familyName}} at {{location}}';
      const variables: TemplateVariables = {
        familyName: 'O\'Connor-D\'Angelo',
        location: 'L\'Aquila, Italy',
      };

      const result = renderTemplate(template, variables);

      expect(result).toBe('O\'Connor-D\'Angelo at L\'Aquila, Italy');
    });

    it('should handle right-to-left markers if present', () => {
      const template = '{{familyName}} - {{location}}';
      const variables: TemplateVariables = {
        familyName: 'משפחה Cohen',
        location: 'Tel Aviv, Israel',
      };

      const result = renderTemplate(template, variables);

      expect(result).toContain('Cohen');
      expect(result).toContain('Tel Aviv');
    });

    it('should handle Chinese characters', () => {
      const template = '{{familyName}} 诚邀您参加婚礼 {{location}}';
      const variables: TemplateVariables = {
        familyName: '王家',
        location: '北京',
      };

      const result = renderTemplate(template, variables);

      expect(result).toBe('王家 诚邀您参加婚礼 北京');
    });
  });
});

describe('Date Formatter - Multi-Language', () => {
  const testDate = new Date('2024-06-15T16:00:00Z');

  it('should format date in English', () => {
    const result = formatDateByLanguage(testDate, 'en');

    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
    // English dates typically contain commas
    expect(result).toMatch(/\w+/);
  });

  it('should format date in Spanish', () => {
    const result = formatDateByLanguage(testDate, 'es');

    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });

  it('should format date in French', () => {
    const result = formatDateByLanguage(testDate, 'fr');

    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });

  it('should format date in Italian', () => {
    const result = formatDateByLanguage(testDate, 'it');

    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });

  it('should format date in German', () => {
    const result = formatDateByLanguage(testDate, 'de');

    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });

  it('should handle different date formats across languages', () => {
    const languages: ('en' | 'es' | 'fr' | 'it' | 'de')[] = ['en', 'es', 'fr', 'it', 'de'];

    const results = languages.map((lang) => formatDateByLanguage(testDate, lang));

    // All results should be defined and different
    results.forEach((result) => {
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    // Should have some variation in formats
    const uniqueResults = new Set(results);
    expect(uniqueResults.size).toBeGreaterThan(1);
  });
});
