/**
 * Unit Tests - Guest Validation
 *
 * Tests for guest/family validation functions
 */

import {
  validateFamilyData,
  createFamilySchema,
  createMemberSchema,
  updateMemberSchema,
  languageSchema,
  channelSchema,
  memberTypeSchema,
} from '@/lib/guests/validation';

describe('Guest Validation - Schemas', () => {
  describe('languageSchema', () => {
    it('should accept valid language codes', () => {
      expect(() => languageSchema.parse('ES')).not.toThrow();
      expect(() => languageSchema.parse('EN')).not.toThrow();
      expect(() => languageSchema.parse('FR')).not.toThrow();
      expect(() => languageSchema.parse('IT')).not.toThrow();
      expect(() => languageSchema.parse('DE')).not.toThrow();
    });

    it('should reject invalid language codes', () => {
      expect(() => languageSchema.parse('XX')).toThrow();
      expect(() => languageSchema.parse('es')).toThrow(); // lowercase
    });
  });

  describe('channelSchema', () => {
    it('should accept valid channel types', () => {
      expect(() => channelSchema.parse('WHATSAPP')).not.toThrow();
      expect(() => channelSchema.parse('EMAIL')).not.toThrow();
      expect(() => channelSchema.parse('SMS')).not.toThrow();
    });

    it('should reject invalid channel types', () => {
      expect(() => channelSchema.parse('PHONE')).toThrow();
      expect(() => channelSchema.parse('whatsapp')).toThrow(); // lowercase
    });
  });

  describe('memberTypeSchema', () => {
    it('should accept valid member types', () => {
      expect(() => memberTypeSchema.parse('ADULT')).not.toThrow();
      expect(() => memberTypeSchema.parse('CHILD')).not.toThrow();
      expect(() => memberTypeSchema.parse('INFANT')).not.toThrow();
    });

    it('should reject invalid member types', () => {
      expect(() => memberTypeSchema.parse('TEENAGER')).toThrow();
      expect(() => memberTypeSchema.parse('adult')).toThrow(); // lowercase
    });
  });
});

describe('Guest Validation - createMemberSchema', () => {
  it('should validate valid member data', () => {
    const validMember = {
      name: 'John Doe',
      type: 'ADULT' as const,
      age: 30,
      dietary_restrictions: 'Vegetarian',
      accessibility_needs: 'Wheelchair access',
    };

    expect(() => createMemberSchema.parse(validMember)).not.toThrow();
  });

  it('should require name and type', () => {
    const memberWithoutName = {
      type: 'ADULT' as const,
    };
    expect(() => createMemberSchema.parse(memberWithoutName)).toThrow();

    const memberWithoutType = {
      name: 'John Doe',
    };
    expect(() => createMemberSchema.parse(memberWithoutType)).toThrow();
  });

  it('should reject invalid age values', () => {
    const memberWithNegativeAge = {
      name: 'John Doe',
      type: 'ADULT' as const,
      age: -5,
    };
    expect(() => createMemberSchema.parse(memberWithNegativeAge)).toThrow();

    const memberWithExcessiveAge = {
      name: 'John Doe',
      type: 'ADULT' as const,
      age: 200,
    };
    expect(() => createMemberSchema.parse(memberWithExcessiveAge)).toThrow();
  });

  it('should accept null/optional values for optional fields', () => {
    const minimalMember = {
      name: 'John Doe',
      type: 'ADULT' as const,
    };
    expect(() => createMemberSchema.parse(minimalMember)).not.toThrow();

    const memberWithNulls = {
      name: 'John Doe',
      type: 'ADULT' as const,
      age: null,
      dietary_restrictions: null,
      accessibility_needs: null,
    };
    expect(() => createMemberSchema.parse(memberWithNulls)).not.toThrow();
  });
});

describe('Guest Validation - createFamilySchema', () => {
  it('should validate complete family data', () => {
    const validFamily = {
      wedding_id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Smith Family',
      email: 'smith@example.com',
      phone: '+34612345678',
      whatsapp_number: '+34612345678',
      channel_preference: 'WHATSAPP' as const,
      preferred_language: 'EN' as const,
      members: [
        {
          name: 'John Smith',
          type: 'ADULT' as const,
          age: 35,
        },
        {
          name: 'Jane Smith',
          type: 'ADULT' as const,
          age: 32,
        },
      ],
    };

    expect(() => createFamilySchema.parse(validFamily)).not.toThrow();
  });

  it('should require wedding_id and name', () => {
    const familyWithoutWeddingId = {
      name: 'Smith Family',
    };
    expect(() => createFamilySchema.parse(familyWithoutWeddingId)).toThrow();

    const familyWithoutName = {
      wedding_id: '123e4567-e89b-12d3-a456-426614174000',
    };
    expect(() => createFamilySchema.parse(familyWithoutName)).toThrow();
  });

  it('should validate email format', () => {
    const familyWithInvalidEmail = {
      wedding_id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Smith Family',
      email: 'not-an-email',
    };
    expect(() => createFamilySchema.parse(familyWithInvalidEmail)).toThrow();

    const familyWithValidEmail = {
      wedding_id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Smith Family',
      email: 'smith@example.com',
    };
    expect(() => createFamilySchema.parse(familyWithValidEmail)).not.toThrow();
  });

  it('should accept a valid UUID for invited_by_admin_id', () => {
    const familyWithAdmin = {
      wedding_id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Smith Family',
      invited_by_admin_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    };
    expect(() => createFamilySchema.parse(familyWithAdmin)).not.toThrow();
    const result = createFamilySchema.parse(familyWithAdmin);
    expect(result.invited_by_admin_id).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
  });

  it('should reject a non-UUID value for invited_by_admin_id', () => {
    const familyWithInvalidAdmin = {
      wedding_id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Smith Family',
      invited_by_admin_id: 'not-a-uuid',
    };
    expect(() => createFamilySchema.parse(familyWithInvalidAdmin)).toThrow();
  });

  it('should default to ES language and empty members array', () => {
    const minimalFamily = {
      wedding_id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Smith Family',
    };
    const result = createFamilySchema.parse(minimalFamily);
    expect(result.preferred_language).toBe('ES');
    expect(result.members).toEqual([]);
  });
});

describe('Guest Validation - validateFamilyData function', () => {
  it('should validate family data for creation', () => {
    const input = {
      wedding_id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Smith Family',
      email: 'smith@example.com',
      members: [
        {
          name: 'John Smith',
          type: 'ADULT' as const,
        },
      ],
    };

    const result = validateFamilyData(input, false);
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.errors).toBeUndefined();
  });

  it('should validate family data for update', () => {
    const input = {
      name: 'Updated Smith Family',
      email: 'newsmith@example.com',
    };

    const result = validateFamilyData(input, true);
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.errors).toBeUndefined();
  });

  it('should return errors for invalid data', () => {
    const input = {
      wedding_id: 'not-a-uuid',
      name: '', // Empty name
      email: 'invalid-email',
    };

    const result = validateFamilyData(input, false);
    expect(result.success).toBe(false);
    expect(result.data).toBeUndefined();
    expect(result.errors).toBeDefined();
  });

  it('should handle different validation for create vs update', () => {
    // This should fail for create (missing wedding_id and name)
    const input = {
      email: 'smith@example.com',
    };

    const createResult = validateFamilyData(input, false);
    expect(createResult.success).toBe(false);

    // This should succeed for update (all fields optional)
    const updateResult = validateFamilyData(input, true);
    expect(updateResult.success).toBe(true);
  });
});

describe('Guest Validation - updateMemberSchema', () => {
  it('should validate member update with all fields', () => {
    const updateData = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Updated Name',
      type: 'ADULT' as const,
      age: 40,
      attending: true,
      dietary_restrictions: 'Vegan',
      accessibility_needs: 'None',
    };

    expect(() => updateMemberSchema.parse(updateData)).not.toThrow();
  });

  it('should allow partial updates', () => {
    const partialUpdate = {
      name: 'Updated Name',
    };

    expect(() => updateMemberSchema.parse(partialUpdate)).not.toThrow();
  });

  it('should support delete flag', () => {
    const deleteUpdate = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      _delete: true,
    };

    expect(() => updateMemberSchema.parse(deleteUpdate)).not.toThrow();
  });

  it('should validate attending as boolean or null', () => {
    const attendingTrue = { attending: true };
    expect(() => updateMemberSchema.parse(attendingTrue)).not.toThrow();

    const attendingFalse = { attending: false };
    expect(() => updateMemberSchema.parse(attendingFalse)).not.toThrow();

    const attendingNull = { attending: null };
    expect(() => updateMemberSchema.parse(attendingNull)).not.toThrow();
  });
});
