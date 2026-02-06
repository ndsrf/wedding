/**
 * Unit tests for Guest CRUD Service
 * Tests family and member creation, updates, and deletion logic
 */

import { createFamily, updateFamily, deleteFamily, getFamilyWithMembers } from '@/lib/guests/crud';
import { prisma } from '@/lib/db/prisma';

// Mock Prisma
jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    wedding: {
      findUnique: jest.fn(),
    },
    weddingAdmin: {
      findFirst: jest.fn(),
    },
    family: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    familyMember: {
      createMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

// Mock short-url
jest.mock('@/lib/short-url', () => ({
  assignShortCode: jest.fn(),
}));

// Mock audit logging
jest.mock('@/lib/guests/audit', () => ({
  logAuditEvent: jest.fn(),
}));

describe('Guest CRUD - createFamily', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create family with members', async () => {
    const weddingData = { payment_tracking_mode: 'NONE' };
    const adminData = { id: '550e8400-e29b-41d4-a716-446655440020' };
    const familyData = {
      id: '550e8400-e29b-41d4-a716-446655440010',
      wedding_id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Smith Family',
      email: 'smith@example.com',
      phone: null,
      whatsapp_number: null,
      magic_token: 'token123',
      reference_code: null,
      preferred_language: 'EN',
      invited_by_admin_id: '550e8400-e29b-41d4-a716-446655440020',
      members: [
        {
          id: '550e8400-e29b-41d4-a716-446655440030',
          family_id: '550e8400-e29b-41d4-a716-446655440010',
          name: 'John Smith',
          type: 'ADULT',
          age: 35,
          dietary_restrictions: null,
          accessibility_needs: null,
          added_by_guest: false,
          attending: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ],
    };

    (prisma.wedding.findUnique as jest.Mock).mockResolvedValue(weddingData);
    (prisma.weddingAdmin.findFirst as jest.Mock).mockResolvedValue(adminData);
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback({
        family: {
          create: jest.fn().mockResolvedValue(familyData),
          findUnique: jest.fn().mockResolvedValue(familyData),
        },
        familyMember: {
          createMany: jest.fn(),
        },
      });
    });

    const input = {
      wedding_id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Smith Family',
      email: 'smith@example.com',
      preferred_language: 'EN' as const,
      members: [
        {
          name: 'John Smith',
          type: 'ADULT' as const,
          age: 35,
        },
      ],
    };

    const result = await createFamily(input, '550e8400-e29b-41d4-a716-446655440020');

    expect(result).toBeDefined();
    expect(result.name).toBe('Smith Family');
    expect(result.members).toHaveLength(1);
  });

  it('should generate reference code for automated payment mode', async () => {
    const weddingData = { payment_tracking_mode: 'AUTOMATED' };
    const adminData = { id: '550e8400-e29b-41d4-a716-446655440020' };

    (prisma.wedding.findUnique as jest.Mock).mockResolvedValue(weddingData);
    (prisma.weddingAdmin.findFirst as jest.Mock).mockResolvedValue(adminData);
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      const txResult = await callback({
        family: {
          create: jest.fn().mockImplementation((data) => ({
            ...data.data,
            id: '550e8400-e29b-41d4-a716-446655440010',
            members: [],
          })),
          findUnique: jest.fn().mockImplementation(() => ({
            id: '550e8400-e29b-41d4-a716-446655440010',
            reference_code: 'ABC123',
            members: [],
          })),
        },
        familyMember: {
          createMany: jest.fn(),
        },
      });
      return txResult;
    });

    const input = {
      wedding_id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Smith Family',
      email: 'smith@example.com',
      preferred_language: 'EN' as const,
      members: [],
    };

    const result = await createFamily(input, '550e8400-e29b-41d4-a716-446655440020');

    expect(result.reference_code).toBeTruthy();
  });

  it('should throw error if wedding not found', async () => {
    (prisma.wedding.findUnique as jest.Mock).mockResolvedValue(null);

    const input = {
      wedding_id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Smith Family',
      email: 'smith@example.com',
      preferred_language: 'EN' as const,
      members: [],
    };

    await expect(createFamily(input, '550e8400-e29b-41d4-a716-446655440020')).rejects.toThrow('Wedding not found');
  });

  it('should use default admin if not specified', async () => {
    const weddingData = { payment_tracking_mode: 'NONE' };
    const adminData = { id: 'default-admin' };

    (prisma.wedding.findUnique as jest.Mock).mockResolvedValue(weddingData);
    (prisma.weddingAdmin.findFirst as jest.Mock).mockResolvedValue(adminData);
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      const txResult = await callback({
        family: {
          create: jest.fn().mockImplementation((data) => ({
            ...data.data,
            id: '550e8400-e29b-41d4-a716-446655440010',
            members: [],
          })),
          findUnique: jest.fn().mockResolvedValue({
            id: '550e8400-e29b-41d4-a716-446655440010',
            invited_by_admin_id: 'default-admin',
            members: [],
          }),
        },
        familyMember: {
          createMany: jest.fn(),
        },
      });
      return txResult;
    });

    const input = {
      wedding_id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Smith Family',
      email: 'smith@example.com',
      preferred_language: 'EN' as const,
      members: [],
    };

    const result = await createFamily(input, '550e8400-e29b-41d4-a716-446655440020');

    expect(result.invited_by_admin_id).toBe('default-admin');
  });
});

describe('Guest CRUD - updateFamily', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update family basic fields', async () => {
    const existingFamily = {
      id: '550e8400-e29b-41d4-a716-446655440010',
      wedding_id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Smith Family',
      email: 'old@example.com',
      members: [],
    };

    (prisma.family.findFirst as jest.Mock).mockResolvedValue(existingFamily);
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback({
        family: {
          update: jest.fn().mockResolvedValue({
            ...existingFamily,
            email: 'new@example.com',
          }),
          findUnique: jest.fn().mockResolvedValue({
            ...existingFamily,
            email: 'new@example.com',
          }),
        },
        familyMember: {
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
      });
    });

    const input = {
      email: 'new@example.com',
    };

    const result = await updateFamily('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440000', input, '550e8400-e29b-41d4-a716-446655440020');

    expect(result.email).toBe('new@example.com');
  });

  it('should throw error if family not found', async () => {
    (prisma.family.findFirst as jest.Mock).mockResolvedValue(null);

    const input = {
      email: 'new@example.com',
    };

    await expect(updateFamily('invalid', '550e8400-e29b-41d4-a716-446655440000', input, '550e8400-e29b-41d4-a716-446655440020')).rejects.toThrow(
      'Family not found'
    );
  });

  it('should update family members', async () => {
    const existingFamily = {
      id: '550e8400-e29b-41d4-a716-446655440010',
      wedding_id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Smith Family',
      members: [
        {
          id: '550e8400-e29b-41d4-a716-446655440030',
          name: 'John Smith',
          type: 'ADULT',
          age: 35,
        },
      ],
    };

    (prisma.family.findFirst as jest.Mock).mockResolvedValue(existingFamily);
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback({
        family: {
          update: jest.fn(),
          findUnique: jest.fn().mockResolvedValue({
            ...existingFamily,
            members: [
              {
                id: '550e8400-e29b-41d4-a716-446655440030',
                name: 'John Smith Updated',
                type: 'ADULT',
                age: 36,
              },
            ],
          }),
        },
        familyMember: {
          update: jest.fn(),
          create: jest.fn(),
          delete: jest.fn(),
        },
      });
    });

    const input = {
      members: [
        {
          id: '550e8400-e29b-41d4-a716-446655440030',
          name: 'John Smith Updated',
          age: 36,
        },
      ],
    };

    const result = await updateFamily('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440000', input, '550e8400-e29b-41d4-a716-446655440020');

    expect(result.members[0].name).toBe('John Smith Updated');
  });

  it('should delete members when _delete is true', async () => {
    const existingFamily = {
      id: '550e8400-e29b-41d4-a716-446655440010',
      wedding_id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Smith Family',
      members: [
        {
          id: '550e8400-e29b-41d4-a716-446655440030',
          name: 'John Smith',
        },
      ],
    };

    const deleteFn = jest.fn();

    (prisma.family.findFirst as jest.Mock).mockResolvedValue(existingFamily);
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback({
        family: {
          update: jest.fn(),
          findUnique: jest.fn().mockResolvedValue({
            ...existingFamily,
            members: [],
          }),
        },
        familyMember: {
          delete: deleteFn,
          create: jest.fn(),
          update: jest.fn(),
        },
      });
    });

    const input = {
      members: [
        {
          id: '550e8400-e29b-41d4-a716-446655440030',
          _delete: true,
        },
      ],
    };

    await updateFamily('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440000', input, '550e8400-e29b-41d4-a716-446655440020');

    expect(deleteFn).toHaveBeenCalledWith({ where: { id: '550e8400-e29b-41d4-a716-446655440030' } });
  });

  it('should add new members without id', async () => {
    const existingFamily = {
      id: '550e8400-e29b-41d4-a716-446655440010',
      wedding_id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Smith Family',
      members: [],
    };

    const createFn = jest.fn();

    (prisma.family.findFirst as jest.Mock).mockResolvedValue(existingFamily);
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback({
        family: {
          update: jest.fn(),
          findUnique: jest.fn().mockResolvedValue({
            ...existingFamily,
            members: [{ name: 'New Member', type: 'ADULT' }],
          }),
        },
        familyMember: {
          create: createFn,
          update: jest.fn(),
          delete: jest.fn(),
        },
      });
    });

    const input = {
      members: [
        {
          name: 'New Member',
          type: 'ADULT' as const,
        },
      ],
    };

    await updateFamily('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440000', input, '550e8400-e29b-41d4-a716-446655440020');

    expect(createFn).toHaveBeenCalled();
  });
});

describe('Guest CRUD - deleteFamily', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delete family and return stats', async () => {
    const existingFamily = {
      id: '550e8400-e29b-41d4-a716-446655440010',
      wedding_id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Smith Family',
      members: [
        { id: '550e8400-e29b-41d4-a716-446655440030', attending: true },
        { id: 'member2', attending: true },
      ],
      tracking_events: [{ id: 'event1' }],
      gifts: [{ id: 'gift1' }],
    };

    (prisma.family.findFirst as jest.Mock).mockResolvedValue(existingFamily);
    (prisma.family.delete as jest.Mock).mockResolvedValue(existingFamily);

    const result = await deleteFamily('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440020');

    expect(result.success).toBe(true);
    expect(result.had_rsvp).toBe(true);
    expect(result.deleted_members_count).toBe(2);
    expect(result.deleted_events_count).toBe(1);
    expect(result.deleted_gifts_count).toBe(1);
  });

  it('should throw error if family not found', async () => {
    (prisma.family.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(deleteFamily('invalid', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440020')).rejects.toThrow(
      'Family not found'
    );
  });

  it('should detect when family has not submitted RSVP', async () => {
    const existingFamily = {
      id: '550e8400-e29b-41d4-a716-446655440010',
      wedding_id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Smith Family',
      members: [
        { id: '550e8400-e29b-41d4-a716-446655440030', attending: null },
        { id: 'member2', attending: null },
      ],
      tracking_events: [],
      gifts: [],
    };

    (prisma.family.findFirst as jest.Mock).mockResolvedValue(existingFamily);
    (prisma.family.delete as jest.Mock).mockResolvedValue(existingFamily);

    const result = await deleteFamily('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440020');

    expect(result.had_rsvp).toBe(false);
  });
});

describe('Guest CRUD - getFamilyWithMembers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return family with members', async () => {
    const familyData = {
      id: '550e8400-e29b-41d4-a716-446655440010',
      wedding_id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Smith Family',
      members: [
        { id: '550e8400-e29b-41d4-a716-446655440030', name: 'John' },
        { id: 'member2', name: 'Jane' },
      ],
    };

    (prisma.family.findFirst as jest.Mock).mockResolvedValue(familyData);

    const result = await getFamilyWithMembers('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440000');

    expect(result).toBeDefined();
    expect(result!.name).toBe('Smith Family');
    expect(result!.members).toHaveLength(2);
  });

  it('should return null if family not found', async () => {
    (prisma.family.findFirst as jest.Mock).mockResolvedValue(null);

    const result = await getFamilyWithMembers('invalid', '550e8400-e29b-41d4-a716-446655440000');

    expect(result).toBeNull();
  });

  it('should only return family for correct wedding', async () => {
    (prisma.family.findFirst as jest.Mock).mockImplementation(({ where }) => {
      if (where.wedding_id === '550e8400-e29b-41d4-a716-446655440000' && where.id === '550e8400-e29b-41d4-a716-446655440010') {
        return Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440010', wedding_id: '550e8400-e29b-41d4-a716-446655440000', members: [] });
      }
      return Promise.resolve(null);
    });

    const result1 = await getFamilyWithMembers('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440000');
    expect(result1).toBeDefined();

    const result2 = await getFamilyWithMembers('550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440001');
    expect(result2).toBeNull();
  });
});
