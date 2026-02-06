/**
 * Unit tests for Guest Validation
 * Tests input validation schemas for family and member data
 */

import {
  createFamilySchema,
  updateFamilySchema,
  type CreateFamilyInput,
  type UpdateFamilyInput,
} from '@/lib/guests/validation';
import { ZodError } from 'zod';

describe('Guest Validation - Create Family', () => {
  describe('Valid Inputs', () => {
    it('should accept valid family with minimal data', () => {
      const input: CreateFamilyInput = {
        wedding_id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Smith Family',
        email: 'smith@example.com',
        preferred_language: 'EN',
        members: [],
      };

      const result = createFamilySchema.parse(input);

      expect(result).toEqual(input);
    });

    it('should accept valid family with all contact methods', () => {
      const input: CreateFamilyInput = {
        wedding_id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Smith Family',
        email: 'smith@example.com',
        phone: '+34612345678',
        whatsapp_number: '+34612345678',
        preferred_language: 'EN',
        channel_preference: 'EMAIL',
        members: [],
      };

      const result = createFamilySchema.parse(input);

      expect(result).toEqual(input);
    });

    it('should accept family with members', () => {
      const input: CreateFamilyInput = {
        wedding_id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Smith Family',
        email: 'smith@example.com',
        preferred_language: 'EN',
        members: [
          {
            name: 'John Smith',
            type: 'ADULT',
            age: 35,
          },
          {
            name: 'Jane Smith',
            type: 'ADULT',
            age: 33,
          },
        ],
      };

      const result = createFamilySchema.parse(input);

      expect(result.members).toHaveLength(2);
    });

    it('should accept all valid member types', () => {
      const input: CreateFamilyInput = {
        wedding_id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Smith Family',
        email: 'smith@example.com',
        preferred_language: 'EN',
        members: [
          { name: 'Adult', type: 'ADULT', age: 30 },
          { name: 'Child', type: 'CHILD', age: 10 },
          { name: 'Infant', type: 'INFANT', age: 1 },
        ],
      };

      const result = createFamilySchema.parse(input);

      expect(result.members[0].type).toBe('ADULT');
      expect(result.members[1].type).toBe('CHILD');
      expect(result.members[2].type).toBe('INFANT');
    });

    it('should accept all valid languages', () => {
      const languages = ['EN', 'ES', 'FR', 'IT', 'DE'] as const;

      languages.forEach((lang) => {
        const input: CreateFamilyInput = {
          wedding_id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Test Family',
          email: 'test@example.com',
          preferred_language: lang,
          members: [],
        };

        const result = createFamilySchema.parse(input);
        expect(result.preferred_language).toBe(lang);
      });
    });

    it('should accept all valid channel preferences', () => {
      const channels = ['EMAIL', 'SMS', 'WHATSAPP'] as const;

      channels.forEach((channel) => {
        const input: CreateFamilyInput = {
          wedding_id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Test Family',
          email: 'test@example.com',
          preferred_language: 'EN',
          channel_preference: channel,
          members: [],
        };

        const result = createFamilySchema.parse(input);
        expect(result.channel_preference).toBe(channel);
      });
    });
  });

  describe('Invalid Inputs', () => {
    it('should reject missing wedding_id', () => {
      const input = {
        name: 'Smith Family',
        email: 'smith@example.com',
        preferred_language: 'EN',
        members: [],
      };

      expect(() => createFamilySchema.parse(input)).toThrow(ZodError);
    });

    it('should reject missing name', () => {
      const input = {
        wedding_id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'smith@example.com',
        preferred_language: 'EN',
        members: [],
      };

      expect(() => createFamilySchema.parse(input)).toThrow(ZodError);
    });

    it('should reject empty name', () => {
      const input: CreateFamilyInput = {
        wedding_id: '550e8400-e29b-41d4-a716-446655440000',
        name: '',
        email: 'smith@example.com',
        preferred_language: 'EN',
        members: [],
      };

      expect(() => createFamilySchema.parse(input)).toThrow(ZodError);
    });

    it('should reject invalid email format', () => {
      const input: CreateFamilyInput = {
        wedding_id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Smith Family',
        email: 'invalid-email',
        preferred_language: 'EN',
        members: [],
      };

      expect(() => createFamilySchema.parse(input)).toThrow(ZodError);
    });

    it('should default to ES when preferred_language is missing', () => {
      const input = {
        wedding_id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Smith Family',
        email: 'smith@example.com',
        members: [],
      };

      const result = createFamilySchema.parse(input);
      expect(result.preferred_language).toBe('ES');
    });

    it('should reject invalid language', () => {
      const input = {
        wedding_id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Smith Family',
        email: 'smith@example.com',
        preferred_language: 'XX',
        members: [],
      };

      expect(() => createFamilySchema.parse(input)).toThrow(ZodError);
    });

    it('should reject invalid member type', () => {
      const input = {
        wedding_id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Smith Family',
        email: 'smith@example.com',
        preferred_language: 'EN',
        members: [
          {
            name: 'John',
            type: 'INVALID_TYPE',
            age: 30,
          },
        ],
      };

      expect(() => createFamilySchema.parse(input)).toThrow(ZodError);
    });

    it('should reject invalid channel preference', () => {
      const input = {
        wedding_id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Smith Family',
        email: 'smith@example.com',
        preferred_language: 'EN',
        channel_preference: 'INVALID',
        members: [],
      };

      expect(() => createFamilySchema.parse(input)).toThrow(ZodError);
    });

    it('should reject negative age', () => {
      const input = {
        wedding_id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Smith Family',
        email: 'smith@example.com',
        preferred_language: 'EN',
        members: [
          {
            name: 'John',
            type: 'ADULT',
            age: -5,
          },
        ],
      };

      expect(() => createFamilySchema.parse(input)).toThrow(ZodError);
    });

    it('should reject age over 150', () => {
      const input = {
        wedding_id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Smith Family',
        email: 'smith@example.com',
        preferred_language: 'EN',
        members: [
          {
            name: 'Ancient One',
            type: 'ADULT',
            age: 200,
          },
        ],
      };

      expect(() => createFamilySchema.parse(input)).toThrow(ZodError);
    });
  });

  describe('Optional Fields', () => {
    it('should accept null email', () => {
      const input: CreateFamilyInput = {
        wedding_id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Smith Family',
        email: null,
        phone: '+34612345678',
        preferred_language: 'EN',
        members: [],
      };

      const result = createFamilySchema.parse(input);
      expect(result.email).toBeNull();
    });

    it('should accept null phone', () => {
      const input: CreateFamilyInput = {
        wedding_id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Smith Family',
        email: 'smith@example.com',
        phone: null,
        preferred_language: 'EN',
        members: [],
      };

      const result = createFamilySchema.parse(input);
      expect(result.phone).toBeNull();
    });

    it('should accept null age', () => {
      const input: CreateFamilyInput = {
        wedding_id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Smith Family',
        email: 'smith@example.com',
        preferred_language: 'EN',
        members: [
          {
            name: 'John',
            type: 'ADULT',
            age: null,
          },
        ],
      };

      const result = createFamilySchema.parse(input);
      expect(result.members[0].age).toBeNull();
    });
  });

  describe('Whitespace Handling', () => {
    it('should preserve whitespace in names (no automatic trim)', () => {
      const input: CreateFamilyInput = {
        wedding_id: '550e8400-e29b-41d4-a716-446655440000',
        name: '  Smith Family  ',
        email: 'smith@example.com',
        preferred_language: 'EN',
        members: [],
      };

      const result = createFamilySchema.parse(input);
      // Schema doesn't automatically trim, so whitespace is preserved
      expect(result.name).toBe('  Smith Family  ');
    });

    it('should reject email with whitespace (invalid format)', () => {
      const input: CreateFamilyInput = {
        wedding_id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Smith Family',
        email: '  smith@example.com  ',
        preferred_language: 'EN',
        members: [],
      };

      // Email validation will fail with leading/trailing whitespace
      expect(() => createFamilySchema.parse(input)).toThrow(ZodError);
    });

    it('should preserve whitespace in member names (no automatic trim)', () => {
      const input: CreateFamilyInput = {
        wedding_id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Smith Family',
        email: 'smith@example.com',
        preferred_language: 'EN',
        members: [
          {
            name: '  John Smith  ',
            type: 'ADULT',
            age: 30,
          },
        ],
      };

      const result = createFamilySchema.parse(input);
      // Schema doesn't automatically trim member names
      expect(result.members[0].name).toBe('  John Smith  ');
    });
  });
});

describe('Guest Validation - Update Family', () => {
  describe('Valid Updates', () => {
    it('should accept partial updates', () => {
      const input: UpdateFamilyInput = {
        email: 'newemail@example.com',
      };

      const result = updateFamilySchema.parse(input);
      expect(result.email).toBe('newemail@example.com');
    });

    it('should accept updating multiple fields', () => {
      const input: UpdateFamilyInput = {
        name: 'Updated Family',
        email: 'updated@example.com',
        phone: '+34612345679',
      };

      const result = updateFamilySchema.parse(input);
      expect(result.name).toBe('Updated Family');
      expect(result.email).toBe('updated@example.com');
      expect(result.phone).toBe('+34612345679');
    });

    it('should accept updating member attending status', () => {
      const input: UpdateFamilyInput = {
        members: [
          {
            id: '550e8400-e29b-41d4-a716-446655440001',
            attending: true,
          },
        ],
      };

      const result = updateFamilySchema.parse(input);
      expect(result.members![0].attending).toBe(true);
    });

    it('should accept deleting a member', () => {
      const input: UpdateFamilyInput = {
        members: [
          {
            id: '550e8400-e29b-41d4-a716-446655440001',
            _delete: true,
          },
        ],
      };

      const result = updateFamilySchema.parse(input);
      expect(result.members![0]._delete).toBe(true);
    });

    it('should accept adding new members', () => {
      const input: UpdateFamilyInput = {
        members: [
          {
            name: 'New Member',
            type: 'ADULT',
            age: 25,
          },
        ],
      };

      const result = updateFamilySchema.parse(input);
      expect(result.members![0].name).toBe('New Member');
      expect(result.members![0].id).toBeUndefined();
    });

    it('should accept updating dietary restrictions', () => {
      const input: UpdateFamilyInput = {
        members: [
          {
            id: '550e8400-e29b-41d4-a716-446655440001',
            dietary_restrictions: 'Vegetarian, Gluten-free',
          },
        ],
      };

      const result = updateFamilySchema.parse(input);
      expect(result.members![0].dietary_restrictions).toBe('Vegetarian, Gluten-free');
    });
  });

  describe('Invalid Updates', () => {
    it('should reject invalid email format', () => {
      const input: UpdateFamilyInput = {
        email: 'not-an-email',
      };

      expect(() => updateFamilySchema.parse(input)).toThrow(ZodError);
    });

    it('should reject empty name', () => {
      const input: UpdateFamilyInput = {
        name: '',
      };

      expect(() => updateFamilySchema.parse(input)).toThrow(ZodError);
    });

    it('should reject invalid language', () => {
      const input: UpdateFamilyInput = {
        preferred_language: 'XX' as any,
      };

      expect(() => updateFamilySchema.parse(input)).toThrow(ZodError);
    });

    it('should reject invalid attending value', () => {
      const input = {
        members: [
          {
            id: 'member1',
            attending: 'yes',
          },
        ],
      };

      expect(() => updateFamilySchema.parse(input)).toThrow(ZodError);
    });
  });

  describe('Optional Fields in Updates', () => {
    it('should accept empty update object', () => {
      const input: UpdateFamilyInput = {};

      const result = updateFamilySchema.parse(input);
      expect(result).toEqual({});
    });

    it('should accept setting fields to null', () => {
      const input: UpdateFamilyInput = {
        email: null,
        phone: null,
      };

      const result = updateFamilySchema.parse(input);
      expect(result.email).toBeNull();
      expect(result.phone).toBeNull();
    });
  });
});

describe('Edge Cases', () => {
  describe('Special Characters', () => {
    it('should accept names with apostrophes', () => {
      const input: CreateFamilyInput = {
        wedding_id: '550e8400-e29b-41d4-a716-446655440000',
        name: "O'Connor Family",
        email: 'oconnor@example.com',
        preferred_language: 'EN',
        members: [
          {
            name: "Seán O'Brien",
            type: 'ADULT',
            age: 30,
          },
        ],
      };

      const result = createFamilySchema.parse(input);
      expect(result.name).toContain("'");
      expect(result.members[0].name).toContain("'");
    });

    it('should accept names with hyphens', () => {
      const input: CreateFamilyInput = {
        wedding_id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Smith-Jones Family',
        email: 'smith-jones@example.com',
        preferred_language: 'EN',
        members: [],
      };

      const result = createFamilySchema.parse(input);
      expect(result.name).toBe('Smith-Jones Family');
    });

    it('should accept names with accents', () => {
      const input: CreateFamilyInput = {
        wedding_id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'García Family',
        email: 'garcia@example.com',
        preferred_language: 'ES',
        members: [
          {
            name: 'José María',
            type: 'ADULT',
            age: 35,
          },
        ],
      };

      const result = createFamilySchema.parse(input);
      expect(result.name).toBe('García Family');
      expect(result.members[0].name).toBe('José María');
    });
  });

  describe('Boundary Values', () => {
    it('should accept age 0', () => {
      const input: CreateFamilyInput = {
        wedding_id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Smith Family',
        email: 'smith@example.com',
        preferred_language: 'EN',
        members: [
          {
            name: 'Newborn',
            type: 'INFANT',
            age: 0,
          },
        ],
      };

      const result = createFamilySchema.parse(input);
      expect(result.members[0].age).toBe(0);
    });

    it('should accept age 150', () => {
      const input: CreateFamilyInput = {
        wedding_id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Smith Family',
        email: 'smith@example.com',
        preferred_language: 'EN',
        members: [
          {
            name: 'Very Old',
            type: 'ADULT',
            age: 150,
          },
        ],
      };

      const result = createFamilySchema.parse(input);
      expect(result.members[0].age).toBe(150);
    });

    it('should accept very long names', () => {
      const longName = 'A'.repeat(200);
      const input: CreateFamilyInput = {
        wedding_id: '550e8400-e29b-41d4-a716-446655440000',
        name: longName,
        email: 'test@example.com',
        preferred_language: 'EN',
        members: [],
      };

      const result = createFamilySchema.parse(input);
      expect(result.name).toBe(longName);
    });
  });
});
