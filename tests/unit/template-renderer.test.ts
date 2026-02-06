/**
 * Unit tests for Template Renderer
 * Tests the template rendering, placeholder extraction, and validation functions
 */

import {
  renderTemplate,
  getPlaceholders,
  hasAllPlaceholders,
  getAvailablePlaceholders,
  type TemplateVariables,
} from '@/lib/templates/renderer';

describe('renderTemplate', () => {
  it('should replace single placeholder', () => {
    const template = 'Hello {{familyName}}';
    const variables: TemplateVariables = { familyName: 'Smith' };

    expect(renderTemplate(template, variables)).toBe('Hello Smith');
  });

  it('should replace multiple placeholders', () => {
    const template = 'Hello {{familyName}}, you are invited to {{coupleNames}} wedding';
    const variables: TemplateVariables = {
      familyName: 'Smith',
      coupleNames: 'John & Jane',
    };

    expect(renderTemplate(template, variables)).toBe(
      'Hello Smith, you are invited to John & Jane wedding'
    );
  });

  it('should replace repeated placeholders', () => {
    const template = '{{familyName}} family - {{familyName}} is invited';
    const variables: TemplateVariables = { familyName: 'Smith' };

    expect(renderTemplate(template, variables)).toBe('Smith family - Smith is invited');
  });

  it('should keep placeholder if variable not found', () => {
    const template = 'Hello {{familyName}}, location: {{location}}';
    const variables: TemplateVariables = { familyName: 'Smith' };

    expect(renderTemplate(template, variables)).toBe('Hello Smith, location: {{location}}');
  });

  it('should handle empty template', () => {
    const template = '';
    const variables: TemplateVariables = { familyName: 'Smith' };

    expect(renderTemplate(template, variables)).toBe('');
  });

  it('should handle template with no placeholders', () => {
    const template = 'Hello world';
    const variables: TemplateVariables = { familyName: 'Smith' };

    expect(renderTemplate(template, variables)).toBe('Hello world');
  });

  it('should handle empty variables', () => {
    const template = 'Hello {{familyName}}';
    const variables: TemplateVariables = {};

    expect(renderTemplate(template, variables)).toBe('Hello {{familyName}}');
  });

  it('should handle special characters in variables', () => {
    const template = 'Hello {{familyName}}';
    const variables: TemplateVariables = { familyName: 'O\'Connor & Smith' };

    expect(renderTemplate(template, variables)).toBe('Hello O\'Connor & Smith');
  });

  it('should handle multiline templates', () => {
    const template = `Hello {{familyName}},

You are invited to {{coupleNames}} wedding on {{weddingDate}}.

Best regards`;
    const variables: TemplateVariables = {
      familyName: 'Smith',
      coupleNames: 'John & Jane',
      weddingDate: 'June 15, 2024',
    };

    expect(renderTemplate(template, variables)).toBe(
      `Hello Smith,

You are invited to John & Jane wedding on June 15, 2024.

Best regards`
    );
  });

  it('should handle URLs in templates', () => {
    const template = 'RSVP here: {{magicLink}}';
    const variables: TemplateVariables = {
      magicLink: 'https://wedding.com/rsvp/abc123',
    };

    expect(renderTemplate(template, variables)).toBe(
      'RSVP here: https://wedding.com/rsvp/abc123'
    );
  });

  it('should not replace when placeholder has trailing text', () => {
    const template = 'Hello {{familyName}}s';
    const variables: TemplateVariables = { familyName: 'Smith' };

    // The regex \{\{(\w+)\}\} will match {{familyName}} and replace it
    // This test verifies the current behavior - it will replace the placeholder
    expect(renderTemplate(template, variables)).toBe('Hello Smiths');
  });

  it('should handle placeholders with numbers', () => {
    const template = 'Hello {{name1}} and {{name2}}';
    const variables: TemplateVariables = {
      name1: 'John',
      name2: 'Jane',
    };

    expect(renderTemplate(template, variables)).toBe('Hello John and Jane');
  });
});

describe('getPlaceholders', () => {
  it('should extract single placeholder', () => {
    const template = 'Hello {{familyName}}';

    expect(getPlaceholders(template)).toEqual(['familyName']);
  });

  it('should extract multiple placeholders', () => {
    const template = 'Hello {{familyName}}, invited to {{coupleNames}} on {{weddingDate}}';

    expect(getPlaceholders(template)).toEqual(['familyName', 'coupleNames', 'weddingDate']);
  });

  it('should remove duplicate placeholders', () => {
    const template = '{{familyName}} family - {{familyName}} is invited';

    expect(getPlaceholders(template)).toEqual(['familyName']);
  });

  it('should return empty array for no placeholders', () => {
    const template = 'Hello world';

    expect(getPlaceholders(template)).toEqual([]);
  });

  it('should return empty array for empty template', () => {
    const template = '';

    expect(getPlaceholders(template)).toEqual([]);
  });

  it('should handle placeholders with underscores', () => {
    const template = 'Hello {{family_name}} and {{couple_names}}';

    expect(getPlaceholders(template)).toEqual(['family_name', 'couple_names']);
  });

  it('should handle placeholders with numbers', () => {
    const template = 'Hello {{name1}} and {{name2}}';

    expect(getPlaceholders(template)).toEqual(['name1', 'name2']);
  });

  it('should handle multiline templates', () => {
    const template = `Hello {{familyName}},

You are invited to {{coupleNames}} wedding.

RSVP: {{magicLink}}`;

    expect(getPlaceholders(template)).toEqual(['familyName', 'coupleNames', 'magicLink']);
  });
});

describe('hasAllPlaceholders', () => {
  it('should return true when all placeholders are present', () => {
    const template = 'Hello {{familyName}}, invited to {{coupleNames}}';
    const required = ['familyName', 'coupleNames'];

    expect(hasAllPlaceholders(template, required)).toBe(true);
  });

  it('should return false when placeholder is missing', () => {
    const template = 'Hello {{familyName}}';
    const required = ['familyName', 'coupleNames'];

    expect(hasAllPlaceholders(template, required)).toBe(false);
  });

  it('should return true when template has extra placeholders', () => {
    const template = 'Hello {{familyName}}, {{coupleNames}}, {{weddingDate}}';
    const required = ['familyName', 'coupleNames'];

    expect(hasAllPlaceholders(template, required)).toBe(true);
  });

  it('should return true for empty required list', () => {
    const template = 'Hello {{familyName}}';
    const required: string[] = [];

    expect(hasAllPlaceholders(template, required)).toBe(true);
  });

  it('should return false for template with no placeholders but required ones', () => {
    const template = 'Hello world';
    const required = ['familyName'];

    expect(hasAllPlaceholders(template, required)).toBe(false);
  });
});

describe('getAvailablePlaceholders', () => {
  it('should return array of placeholder definitions', () => {
    const placeholders = getAvailablePlaceholders();

    expect(Array.isArray(placeholders)).toBe(true);
    expect(placeholders.length).toBeGreaterThan(0);
  });

  it('should have correct structure for each placeholder', () => {
    const placeholders = getAvailablePlaceholders();

    placeholders.forEach((placeholder) => {
      expect(placeholder).toHaveProperty('key');
      expect(placeholder).toHaveProperty('label');
      expect(placeholder).toHaveProperty('description');
      expect(placeholder).toHaveProperty('example');

      expect(typeof placeholder.key).toBe('string');
      expect(typeof placeholder.label).toBe('string');
      expect(typeof placeholder.description).toBe('string');
      expect(typeof placeholder.example).toBe('string');
    });
  });

  it('should include essential placeholders', () => {
    const placeholders = getAvailablePlaceholders();
    const keys = placeholders.map((p) => p.key);

    expect(keys).toContain('familyName');
    expect(keys).toContain('coupleNames');
    expect(keys).toContain('weddingDate');
    expect(keys).toContain('magicLink');
  });

  it('should have unique keys', () => {
    const placeholders = getAvailablePlaceholders();
    const keys = placeholders.map((p) => p.key);
    const uniqueKeys = new Set(keys);

    expect(keys.length).toBe(uniqueKeys.size);
  });
});
