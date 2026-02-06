/**
 * Unit tests for WhatsApp Links Utility
 * Tests the generation of wa.me URLs for the LINKS sending mode
 */

import { buildWhatsAppLink } from '@/lib/notifications/whatsapp-links';

describe('buildWhatsAppLink', () => {
  it('should build link with standard international format', () => {
    const phone = '+34612345678';
    const message = 'Hello World';

    const link = buildWhatsAppLink(phone, message);

    expect(link).toBe('https://wa.me/34612345678?text=Hello%20World');
  });

  it('should strip spaces from phone number', () => {
    const phone = '+34 612 345 678';
    const message = 'Hello';

    const link = buildWhatsAppLink(phone, message);

    expect(link).toBe('https://wa.me/34612345678?text=Hello');
  });

  it('should strip dashes from phone number', () => {
    const phone = '+34-612-345-678';
    const message = 'Hello';

    const link = buildWhatsAppLink(phone, message);

    expect(link).toBe('https://wa.me/34612345678?text=Hello');
  });

  it('should strip parentheses from phone number', () => {
    const phone = '+1 (555) 123-4567';
    const message = 'Hello';

    const link = buildWhatsAppLink(phone, message);

    expect(link).toBe('https://wa.me/15551234567?text=Hello');
  });

  it('should handle phone without plus sign', () => {
    const phone = '34612345678';
    const message = 'Hello';

    const link = buildWhatsAppLink(phone, message);

    expect(link).toBe('https://wa.me/34612345678?text=Hello');
  });

  it('should encode special characters in message', () => {
    const phone = '+34612345678';
    const message = 'Hello & Welcome! How are you?';

    const link = buildWhatsAppLink(phone, message);

    expect(link).toContain('text=Hello%20%26%20Welcome!%20How%20are%20you%3F');
  });

  it('should encode newlines in message', () => {
    const phone = '+34612345678';
    const message = 'Hello\nWorld';

    const link = buildWhatsAppLink(phone, message);

    expect(link).toContain('%0A'); // URL-encoded newline
  });

  it('should handle multiline message', () => {
    const phone = '+34612345678';
    const message = `Hello John,

You are invited to our wedding!

Best regards`;

    const link = buildWhatsAppLink(phone, message);

    expect(link).toContain('https://wa.me/34612345678?text=');
    expect(link).toContain('%0A'); // Contains newlines
  });

  it('should handle empty message', () => {
    const phone = '+34612345678';
    const message = '';

    const link = buildWhatsAppLink(phone, message);

    expect(link).toBe('https://wa.me/34612345678?text=');
  });

  it('should encode emojis properly', () => {
    const phone = '+34612345678';
    const message = 'Hello 👋 Wedding 💒 Party 🎉';

    const link = buildWhatsAppLink(phone, message);

    expect(link).toContain('https://wa.me/34612345678?text=');
    // Emojis should be URL-encoded
    expect(link.length).toBeGreaterThan(50);
  });

  it('should encode accented characters', () => {
    const phone = '+34612345678';
    const message = 'Bienvenido a nuestra boda en España';

    const link = buildWhatsAppLink(phone, message);

    expect(link).toContain('https://wa.me/34612345678?text=');
    expect(link).toContain('Espa%C3%B1a');
  });

  it('should handle links in message', () => {
    const phone = '+34612345678';
    const message = 'RSVP here: https://wedding.com/rsvp/abc123';

    const link = buildWhatsAppLink(phone, message);

    expect(link).toContain('https://wa.me/34612345678?text=');
    expect(link).toContain('https%3A%2F%2Fwedding.com');
  });

  it('should handle very long messages', () => {
    const phone = '+34612345678';
    const message = 'A'.repeat(1000);

    const link = buildWhatsAppLink(phone, message);

    expect(link).toContain('https://wa.me/34612345678?text=');
    expect(link.length).toBeGreaterThan(1000);
  });

  it('should handle international phone formats', () => {
    const testCases = [
      { phone: '+1 555-123-4567', expected: '15551234567' },
      { phone: '+44 20 1234 5678', expected: '442012345678' },
      { phone: '+49 30 12345678', expected: '493012345678' },
      { phone: '+33 1 23 45 67 89', expected: '33123456789' },
      { phone: '+81-3-1234-5678', expected: '81312345678' },
    ];

    testCases.forEach(({ phone, expected }) => {
      const link = buildWhatsAppLink(phone, 'Hello');
      expect(link).toBe(`https://wa.me/${expected}?text=Hello`);
    });
  });

  it('should handle phone with dots', () => {
    const phone = '+34.612.345.678';
    const message = 'Hello';

    const link = buildWhatsAppLink(phone, message);

    expect(link).toBe('https://wa.me/34612345678?text=Hello');
  });

  it('should preserve only digits in phone', () => {
    const phone = 'abc+34def612ghi345jkl678';
    const message = 'Hello';

    const link = buildWhatsAppLink(phone, message);

    expect(link).toBe('https://wa.me/34612345678?text=Hello');
  });

  it('should handle template variables in message', () => {
    const phone = '+34612345678';
    const message = 'Hello {{familyName}}, you are invited!';

    const link = buildWhatsAppLink(phone, message);

    expect(link).toContain('Hello%20%7B%7BfamilyName%7D%7D');
  });
});
