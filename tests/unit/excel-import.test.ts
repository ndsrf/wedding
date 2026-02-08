/**
 * Unit tests for Excel Import Service
 * Tests validation, parsing, and import logic for guest list Excel files
 */

import { importGuestList } from '@/lib/excel/import';
import { prisma } from '@/lib/db/prisma';
import * as XLSX from 'xlsx';

// Mock Prisma
jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    family: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    weddingAdmin: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    familyMember: {
      create: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

describe('Excel Import - Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should reject empty file', async () => {
    // Create empty workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([]);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Guest List');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    (prisma.weddingAdmin.findMany as jest.Mock).mockResolvedValue([
      { id: 'admin1', name: 'Admin', email: 'admin@test.com' },
    ]);

    const result = await importGuestList('wedding1', buffer, 'MANUAL', 'EN');

    expect(result.success).toBe(false);
    expect(result.errors[0].message).toContain('No data found');
  });

  it('should reject file with too many families', async () => {
    const rows = [['Family Name', 'Contact Person']];
    for (let i = 0; i < 501; i++) {
      rows.push([`Family ${i}`, `Contact ${i}`]);
    }

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Guest List');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    (prisma.weddingAdmin.findMany as jest.Mock).mockResolvedValue([
      { id: 'admin1', name: 'Admin', email: 'admin@test.com' },
    ]);

    const result = await importGuestList('wedding1', buffer, 'MANUAL', 'EN');

    expect(result.success).toBe(false);
    expect(result.errors[0].message).toContain('Too many families');
  });

  it('should validate required fields', async () => {
    const rows = [
      ['Family Name', 'Contact Person', 'Email', 'Phone', 'WhatsApp', 'Language', 'Channel', 'Invited By', 'Member 1 Name', 'Member 1 Type', 'Member 1 Age'],
      ['Smith Family', '', 'test@example.com', '', '', 'EN', '', '', 'John', 'ADULT', '30'], // Missing contact person
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Guest List');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    (prisma.weddingAdmin.findMany as jest.Mock).mockResolvedValue([
      { id: 'admin1', name: 'Admin', email: 'admin@test.com' },
    ]);

    const result = await importGuestList('wedding1', buffer, 'MANUAL', 'EN');

    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        field: 'Contact Person',
        message: 'Contact Person is required',
      })
    );
  });

  it('should validate member types', async () => {
    const rows = [
      ['Family Name', 'Contact Person', 'Email', 'Phone', 'WhatsApp', 'Language', 'Channel', 'Invited By', 'Member 1 Name', 'Member 1 Type', 'Member 1 Age'],
      ['Smith Family', 'John Smith', 'test@example.com', '', '', 'EN', '', '', 'John', 'INVALID_TYPE', '30'],
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Guest List');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    (prisma.weddingAdmin.findMany as jest.Mock).mockResolvedValue([
      { id: 'admin1', name: 'Admin', email: 'admin@test.com' },
    ]);

    const result = await importGuestList('wedding1', buffer, 'MANUAL', 'EN');

    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        field: 'Member 1 Type',
        message: expect.stringContaining('Invalid member type'),
      })
    );
  });

  it('should require at least one member', async () => {
    const rows = [
      ['Family Name', 'Contact Person', 'Email', 'Phone', 'WhatsApp', 'Language', 'Channel', 'Invited By'],
      ['Smith Family', 'John Smith', 'test@example.com', '', '', 'EN', '', ''],
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Guest List');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    (prisma.weddingAdmin.findMany as jest.Mock).mockResolvedValue([
      { id: 'admin1', name: 'Admin', email: 'admin@test.com' },
    ]);

    const result = await importGuestList('wedding1', buffer, 'MANUAL', 'EN');

    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        field: 'Members',
        message: 'At least one family member is required',
      })
    );
  });

  it('should warn about duplicate emails', async () => {
    const rows = [
      ['Family Name', 'Contact Person', 'Email', 'Phone', 'WhatsApp', 'Language', 'Channel', 'Invited By', 'Member 1 Name', 'Member 1 Type', 'Member 1 Age'],
      ['Smith Family', 'John Smith', 'test@example.com', '', '', 'EN', '', '', 'John', 'ADULT', '30'],
      ['Jones Family', 'Jane Jones', 'test@example.com', '', '', 'EN', '', '', 'Jane', 'ADULT', '28'],
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Guest List');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    (prisma.weddingAdmin.findMany as jest.Mock).mockResolvedValue([
      { id: 'admin1', name: 'Admin', email: 'admin@test.com' },
    ]);

    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback({
        family: {
          create: jest.fn().mockResolvedValue({ id: 'family1' }),
        },
        familyMember: {
          create: jest.fn(),
        },
      });
    });

    const result = await importGuestList('wedding1', buffer, 'MANUAL', 'EN');

    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        field: 'Email',
        message: expect.stringContaining('Duplicate email'),
      })
    );
  });

  it('should warn about no contact method', async () => {
    const rows = [
      ['Family Name', 'Contact Person', 'Email', 'Phone', 'WhatsApp', 'Language', 'Channel', 'Invited By', 'Member 1 Name', 'Member 1 Type', 'Member 1 Age'],
      ['Smith Family', 'John Smith', '', '', '', 'EN', '', '', 'John', 'ADULT', '30'],
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Guest List');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    (prisma.weddingAdmin.findMany as jest.Mock).mockResolvedValue([
      { id: 'admin1', name: 'Admin', email: 'admin@test.com' },
    ]);

    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback({
        family: {
          create: jest.fn().mockResolvedValue({ id: 'family1' }),
        },
        familyMember: {
          create: jest.fn(),
        },
      });
    });

    const result = await importGuestList('wedding1', buffer, 'MANUAL', 'EN');

    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        field: 'Contact',
        message: expect.stringContaining('No contact method'),
      })
    );
  });

  it('should handle invalid language with warning', async () => {
    const rows = [
      ['Family Name', 'Contact Person', 'Email', 'Phone', 'WhatsApp', 'Language', 'Channel', 'Invited By', 'Member 1 Name', 'Member 1 Type', 'Member 1 Age'],
      ['Smith Family', 'John Smith', 'test@example.com', '', '', 'XX', '', '', 'John', 'ADULT', '30'],
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Guest List');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    (prisma.weddingAdmin.findMany as jest.Mock).mockResolvedValue([
      { id: 'admin1', name: 'Admin', email: 'admin@test.com' },
    ]);

    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback({
        family: {
          create: jest.fn().mockResolvedValue({ id: 'family1' }),
        },
        familyMember: {
          create: jest.fn(),
        },
      });
    });

    const result = await importGuestList('wedding1', buffer, 'MANUAL', 'EN');

    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        field: 'Language',
        message: expect.stringContaining('Invalid language'),
      })
    );
  });

  it('should accept valid member types', async () => {
    const rows = [
      ['Family Name', 'Contact Person', 'Email', 'Phone', 'WhatsApp', 'Language', 'Channel', 'Invited By', 'Member 1 Name', 'Member 1 Type', 'Member 1 Age', 'Member 2 Name', 'Member 2 Type', 'Member 2 Age', 'Member 3 Name', 'Member 3 Type', 'Member 3 Age'],
      ['Smith Family', 'John Smith', 'test@example.com', '', '', 'EN', '', '', 'John', 'ADULT', '30', 'Jane', 'CHILD', '10', 'Baby', 'INFANT', '1'],
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Guest List');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    (prisma.weddingAdmin.findMany as jest.Mock).mockResolvedValue([
      { id: 'admin1', name: 'Admin', email: 'admin@test.com' },
    ]);

    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback({
        family: {
          create: jest.fn().mockResolvedValue({ id: 'family1' }),
        },
        familyMember: {
          create: jest.fn(),
        },
      });
    });

    const result = await importGuestList('wedding1', buffer, 'MANUAL', 'EN');

    expect(result.success).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should warn about invalid admin name', async () => {
    const rows = [
      ['Family Name', 'Contact Person', 'Email', 'Phone', 'WhatsApp', 'Language', 'Channel', 'Invited By', 'Member 1 Name', 'Member 1 Type', 'Member 1 Age'],
      ['Smith Family', 'John Smith', 'test@example.com', '', '', 'EN', '', 'NonExistentAdmin', 'John', 'ADULT', '30'],
    ];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Guest List');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    (prisma.weddingAdmin.findMany as jest.Mock).mockResolvedValue([
      { id: 'admin1', name: 'Admin', email: 'admin@test.com' },
    ]);

    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback({
        family: {
          create: jest.fn().mockResolvedValue({ id: 'family1' }),
        },
        familyMember: {
          create: jest.fn(),
        },
      });
    });

    const result = await importGuestList('wedding1', buffer, 'MANUAL', 'EN');

    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        field: 'Invited By',
        message: expect.stringContaining('not found'),
      })
    );
  });
});