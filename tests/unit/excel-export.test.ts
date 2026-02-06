/**
 * Unit tests for Excel Export Service
 * Tests export logic and data transformation for guest lists
 */

import { exportGuestData, exportGuestDataSimplified } from '@/lib/excel/export';
import { prisma } from '@/lib/db/prisma';
import * as XLSX from 'xlsx';

// Mock Prisma
jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    family: {
      findMany: jest.fn(),
    },
    weddingAdmin: {
      findMany: jest.fn(),
    },
  },
}));

describe('Excel Export', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockFamilyData = [
    {
      id: 'family1',
      wedding_id: 'wedding1',
      name: 'Smith Family',
      email: 'smith@example.com',
      phone: '+34612345678',
      whatsapp_number: '+34612345678',
      preferred_language: 'EN',
      invited_by_admin_id: 'admin1',
      reference_code: 'REF123',
      members: [
        {
          id: 'member1',
          family_id: 'family1',
          name: 'John Smith',
          type: 'ADULT',
          age: 35,
          attending: true,
          dietary_restrictions: 'Vegetarian',
          accessibility_needs: null,
          added_by_guest: false,
          created_at: new Date(),
        },
        {
          id: 'member2',
          family_id: 'family1',
          name: 'Jane Smith',
          type: 'ADULT',
          age: 33,
          attending: true,
          dietary_restrictions: null,
          accessibility_needs: null,
          added_by_guest: false,
          created_at: new Date(),
        },
      ],
      gifts: [
        {
          id: 'gift1',
          family_id: 'family1',
          amount: 100.0,
          status: 'CONFIRMED',
          created_at: new Date(),
        },
      ],
    },
    {
      id: 'family2',
      wedding_id: 'wedding1',
      name: 'Jones Family',
      email: 'jones@example.com',
      phone: null,
      whatsapp_number: null,
      preferred_language: 'ES',
      invited_by_admin_id: 'admin1',
      reference_code: null,
      members: [
        {
          id: 'member3',
          family_id: 'family2',
          name: 'Bob Jones',
          type: 'ADULT',
          age: 40,
          attending: null,
          dietary_restrictions: null,
          accessibility_needs: null,
          added_by_guest: false,
          created_at: new Date(),
        },
      ],
      gifts: [],
    },
  ];

  const mockAdmins = [
    { id: 'admin1', name: 'Admin User', email: 'admin@test.com' },
  ];

  describe('exportGuestData', () => {
    it('should export with default options', async () => {
      (prisma.family.findMany as jest.Mock).mockResolvedValue(mockFamilyData);
      (prisma.weddingAdmin.findMany as jest.Mock).mockResolvedValue(mockAdmins);

      const result = await exportGuestData('wedding1');

      expect(result).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.filename).toContain('guest-list-');
      expect(result.filename).toContain('.xlsx');
      expect(result.mimeType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });

    it('should export as CSV when format is csv', async () => {
      (prisma.family.findMany as jest.Mock).mockResolvedValue(mockFamilyData);
      (prisma.weddingAdmin.findMany as jest.Mock).mockResolvedValue(mockAdmins);

      const result = await exportGuestData('wedding1', { format: 'csv' });

      expect(result).toBeDefined();
      expect(result.filename).toContain('.csv');
      expect(result.mimeType).toBe('text/csv');
    });

    it('should include payment info when requested', async () => {
      (prisma.family.findMany as jest.Mock).mockResolvedValue(mockFamilyData);
      (prisma.weddingAdmin.findMany as jest.Mock).mockResolvedValue(mockAdmins);

      const result = await exportGuestData('wedding1', { includePaymentInfo: true });

      // Parse workbook to check headers
      const workbook = XLSX.read(result.buffer, { type: 'buffer' });
      const worksheet = workbook.Sheets['Guest List'];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
      const headers = data[0];

      expect(headers).toContain('Payment Status');
      expect(headers).toContain('Payment Amount');
    });

    it('should include RSVP status when requested', async () => {
      (prisma.family.findMany as jest.Mock).mockResolvedValue(mockFamilyData);
      (prisma.weddingAdmin.findMany as jest.Mock).mockResolvedValue(mockAdmins);

      const result = await exportGuestData('wedding1', { includeRsvpStatus: true });

      // Parse workbook to check headers
      const workbook = XLSX.read(result.buffer, { type: 'buffer' });
      const worksheet = workbook.Sheets['Guest List'];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
      const headers = data[0];

      expect(headers).toContain('RSVP Status');
      expect(headers).toContain('Total Members');
      expect(headers).toContain('Attending');
    });

    it('should correctly calculate RSVP status - Attending', async () => {
      (prisma.family.findMany as jest.Mock).mockResolvedValue(mockFamilyData);
      (prisma.weddingAdmin.findMany as jest.Mock).mockResolvedValue(mockAdmins);

      const result = await exportGuestData('wedding1');

      const workbook = XLSX.read(result.buffer, { type: 'buffer' });
      const worksheet = workbook.Sheets['Guest List'];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as (string | number)[][];

      // Find Smith Family row (both members attending)
      const smithRow = data.find((row) => row[0] === 'Smith Family');
      expect(smithRow).toBeDefined();

      // RSVP Status column
      const rsvpStatusIndex = (data[0] as string[]).indexOf('RSVP Status');
      expect(smithRow![rsvpStatusIndex]).toBe('Attending');
    });

    it('should correctly calculate RSVP status - Pending', async () => {
      (prisma.family.findMany as jest.Mock).mockResolvedValue(mockFamilyData);
      (prisma.weddingAdmin.findMany as jest.Mock).mockResolvedValue(mockAdmins);

      const result = await exportGuestData('wedding1');

      const workbook = XLSX.read(result.buffer, { type: 'buffer' });
      const worksheet = workbook.Sheets['Guest List'];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as (string | number)[][];

      // Find Jones Family row (attending is null)
      const jonesRow = data.find((row) => row[0] === 'Jones Family');
      expect(jonesRow).toBeDefined();

      const rsvpStatusIndex = (data[0] as string[]).indexOf('RSVP Status');
      expect(jonesRow![rsvpStatusIndex]).toBe('Pending');
    });

    it('should map admin ID to admin name', async () => {
      (prisma.family.findMany as jest.Mock).mockResolvedValue(mockFamilyData);
      (prisma.weddingAdmin.findMany as jest.Mock).mockResolvedValue(mockAdmins);

      const result = await exportGuestData('wedding1');

      const workbook = XLSX.read(result.buffer, { type: 'buffer' });
      const worksheet = workbook.Sheets['Guest List'];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as (string | number)[][];

      const invitedByIndex = (data[0] as string[]).indexOf('Invited By');
      const smithRow = data.find((row) => row[0] === 'Smith Family');

      expect(smithRow![invitedByIndex]).toBe('Admin User');
    });

    it('should handle families with no gifts', async () => {
      (prisma.family.findMany as jest.Mock).mockResolvedValue(mockFamilyData);
      (prisma.weddingAdmin.findMany as jest.Mock).mockResolvedValue(mockAdmins);

      const result = await exportGuestData('wedding1', { includePaymentInfo: true });

      const workbook = XLSX.read(result.buffer, { type: 'buffer' });
      const worksheet = workbook.Sheets['Guest List'];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as (string | number)[][];

      const jonesRow = data.find((row) => row[0] === 'Jones Family');
      const paymentStatusIndex = (data[0] as string[]).indexOf('Payment Status');
      const paymentAmountIndex = (data[0] as string[]).indexOf('Payment Amount');

      expect(jonesRow![paymentStatusIndex]).toBe('No Payment');
      expect(jonesRow![paymentAmountIndex]).toBe('0.00');
    });

    it('should export member details correctly', async () => {
      (prisma.family.findMany as jest.Mock).mockResolvedValue(mockFamilyData);
      (prisma.weddingAdmin.findMany as jest.Mock).mockResolvedValue(mockAdmins);

      const result = await exportGuestData('wedding1');

      const workbook = XLSX.read(result.buffer, { type: 'buffer' });
      const worksheet = workbook.Sheets['Guest List'];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as (string | number)[][];

      const smithRow = data.find((row) => row[0] === 'Smith Family');
      const member1NameIndex = (data[0] as string[]).indexOf('Member 1 Name');
      const member1TypeIndex = (data[0] as string[]).indexOf('Member 1 Type');
      const member1AgeIndex = (data[0] as string[]).indexOf('Member 1 Age');

      expect(smithRow![member1NameIndex]).toBe('John Smith');
      expect(smithRow![member1TypeIndex]).toBe('ADULT');
      expect(smithRow![member1AgeIndex]).toBe(35);
    });
  });

  describe('exportGuestDataSimplified', () => {
    it('should export simplified format', async () => {
      (prisma.family.findMany as jest.Mock).mockResolvedValue(mockFamilyData);
      (prisma.weddingAdmin.findMany as jest.Mock).mockResolvedValue(mockAdmins);

      const result = await exportGuestDataSimplified('wedding1');

      expect(result).toBeDefined();
      expect(result.filename).toContain('guest-summary-');
      expect(result.filename).toContain('.xlsx');
    });

    it('should have simplified headers', async () => {
      (prisma.family.findMany as jest.Mock).mockResolvedValue(mockFamilyData);
      (prisma.weddingAdmin.findMany as jest.Mock).mockResolvedValue(mockAdmins);

      const result = await exportGuestDataSimplified('wedding1');

      const workbook = XLSX.read(result.buffer, { type: 'buffer' });
      const worksheet = workbook.Sheets['Guest Summary'];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
      const headers = data[0];

      expect(headers).toEqual([
        'Family Name',
        'Contact Person',
        'Email',
        'Phone',
        'WhatsApp',
        'Total Members',
        'RSVP Status',
        'Members Attending',
      ]);
    });

    it('should have correct member counts', async () => {
      (prisma.family.findMany as jest.Mock).mockResolvedValue(mockFamilyData);
      (prisma.weddingAdmin.findMany as jest.Mock).mockResolvedValue(mockAdmins);

      const result = await exportGuestDataSimplified('wedding1');

      const workbook = XLSX.read(result.buffer, { type: 'buffer' });
      const worksheet = workbook.Sheets['Guest Summary'];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as (string | number)[][];

      const smithRow = data.find((row) => row[0] === 'Smith Family');
      const totalMembersIndex = (data[0] as string[]).indexOf('Total Members');
      const membersAttendingIndex = (data[0] as string[]).indexOf('Members Attending');

      expect(smithRow![totalMembersIndex]).toBe(2);
      expect(smithRow![membersAttendingIndex]).toBe(2);
    });
  });
});
