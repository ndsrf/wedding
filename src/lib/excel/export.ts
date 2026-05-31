/**
 * Excel Export Service
 *
 * Exports guest data to Excel format (XLSX or CSV).
 * Includes family information, members, RSVP status, and payment details.
 */

import * as XLSX from 'xlsx';
import { prisma } from '@/lib/db/prisma';
import type { Language, Channel } from '@prisma/client';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type ExportFormat = 'xlsx' | 'csv';

export interface ExportOptions {
  format?: ExportFormat;
  /** Payment info is always included in the export; this option is accepted for compatibility. */
  includePaymentInfo?: boolean;
}

export interface ExportResult {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}

interface FamilyExportData {
  familyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  whatsapp: string;
  language: Language;
  channel: Channel | null;
  invitedByAdmin: string;
  referenceCode: string;
  rsvpStatus: string;
  attendingCount: number;
  notAttendingCount: number;
  pendingCount: number;
  totalMembers: number;
  paymentStatus: string;
  paymentAmount: string;
  members: Array<{
    name: string;
    type: string;
    age: number | null;
    attending: string;
    dietaryRestrictions: string;
    accessibilityNeeds: string;
    addedByGuest: boolean;
  }>;
}

// ============================================================================
// DATA FETCHING
// ============================================================================

/**
 * Fetch all guest data for a wedding
 */
async function fetchGuestData(wedding_id: string): Promise<FamilyExportData[]> {
  const [families, weddingAdmins] = await Promise.all([
    prisma.family.findMany({
      where: {
        wedding_id,
      },
      include: {
        members: {
          orderBy: {
            created_at: 'asc',
          },
        },
        gifts: {
          orderBy: {
            created_at: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        name: 'asc',
      },
    }),
    prisma.weddingAdmin.findMany({
      where: { wedding_id },
      select: { id: true, name: true, email: true },
    }),
  ]);

  const adminMap = new Map(weddingAdmins.map((a) => [a.id, a.name || a.email]));

  return families.map((family) => {
    // Calculate RSVP status
    const attendingMembers = family.members.filter((m) => m.attending === true);
    const notAttendingMembers = family.members.filter((m) => m.attending === false);
    const pendingMembers = family.members.filter((m) => m.attending === null);

    let rsvpStatus = 'Pending';
    if (pendingMembers.length === 0) {
      if (attendingMembers.length > 0) {
        rsvpStatus = notAttendingMembers.length > 0 ? 'Partial' : 'Attending';
      } else {
        rsvpStatus = 'Not Attending';
      }
    }

    // Get payment info
    const latestGift = family.gifts[0];
    const paymentStatus = latestGift ? latestGift.status : 'No Payment';
    const paymentAmount = latestGift ? latestGift.amount.toString() : '0.00';

    return {
      familyName: family.name,
      contactPerson: family.members[0]?.name || '',
      email: family.email || '',
      phone: family.phone || '',
      whatsapp: family.whatsapp_number || '',
      language: family.preferred_language,
      channel: family.channel_preference,
      invitedByAdmin: family.invited_by_admin_id ? (adminMap.get(family.invited_by_admin_id) || '') : '',
      referenceCode: family.reference_code || '',
      rsvpStatus,
      attendingCount: attendingMembers.length,
      notAttendingCount: notAttendingMembers.length,
      pendingCount: pendingMembers.length,
      totalMembers: family.members.length,
      paymentStatus,
      paymentAmount,
      members: family.members.map((member) => ({
        name: member.name,
        type: member.type,
        age: member.age,
        attending:
          member.attending === null ? 'Pending' : member.attending ? 'Yes' : 'No',
        dietaryRestrictions: member.dietary_restrictions || '',
        accessibilityNeeds: member.accessibility_needs || '',
        addedByGuest: member.added_by_guest,
      })),
    };
  });
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

/**
 * Export guest data to Excel or CSV format
 *
 * Unified column format (86 columns total):
 *   Cols  0-7:  Family info (Family Name, Contact Person, Email, Phone, WhatsApp, Language, Channel, Invited By)
 *   Cols  8-37: Member 1-10 basic info — Name, Type, Age (3 cols × 10 members)
 *   Cols 38-45: Extra family info — Reference Code, RSVP Status, Total Members, Attending, Not Attending, Pending, Payment Status, Payment Amount
 *   Cols 46-85: Member 1-10 extra info — Attending, Dietary, Accessibility, Added By Guest (4 cols × 10 members)
 *
 * This format matches the import template exactly so exported files can be re-imported.
 *
 * @param wedding_id - Wedding ID to export guests for
 * @param options - Export options (format)
 * @returns Buffer containing the exported file
 */
export async function exportGuestData(
  wedding_id: string,
  options: ExportOptions = {}
): Promise<ExportResult> {
  const { format = 'xlsx' } = options;

  // Fetch data
  const familiesData = await fetchGuestData(wedding_id);

  // Prepare export rows
  const exportRows: (string | number)[][] = [];

  // Build header row — unified format
  const headers: string[] = [
    // Cols 0-7: Family info
    'Family Name',
    'Contact Person',
    'Email',
    'Phone',
    'WhatsApp',
    'Language',
    'Channel',
    'Invited By',
  ];

  // Cols 8-37: Member basic info (3 cols × 10 members)
  for (let i = 1; i <= 10; i++) {
    headers.push(`Member ${i} Name`, `Member ${i} Type`, `Member ${i} Age`);
  }

  // Cols 38-45: Extra family summary
  headers.push(
    'Reference Code',
    'RSVP Status',
    'Total Members',
    'Attending',
    'Not Attending',
    'Pending',
    'Payment Status',
    'Payment Amount'
  );

  // Cols 46-85: Member extra info (4 cols × 10 members)
  for (let i = 1; i <= 10; i++) {
    headers.push(
      `Member ${i} Attending`,
      `Member ${i} Dietary`,
      `Member ${i} Accessibility`,
      `Member ${i} Added By Guest`
    );
  }

  exportRows.push(headers);

  // Add data rows
  for (const family of familiesData) {
    const row: (string | number)[] = [
      // Cols 0-7: Family info
      family.familyName,
      family.contactPerson,
      family.email,
      family.phone,
      family.whatsapp,
      family.language,
      family.channel || '',
      family.invitedByAdmin,
    ];

    // Cols 8-37: Member basic info (3 cols × 10 members)
    for (let i = 0; i < 10; i++) {
      const member = family.members[i];
      if (member) {
        row.push(member.name, member.type, member.age || '');
      } else {
        row.push('', '', '');
      }
    }

    // Cols 38-45: Extra family summary
    row.push(
      family.referenceCode,
      family.rsvpStatus,
      family.totalMembers,
      family.attendingCount,
      family.notAttendingCount,
      family.pendingCount,
      family.paymentStatus,
      family.paymentAmount
    );

    // Cols 46-85: Member extra info (4 cols × 10 members)
    for (let i = 0; i < 10; i++) {
      const member = family.members[i];
      if (member) {
        row.push(
          member.attending,
          member.dietaryRestrictions,
          member.accessibilityNeeds,
          member.addedByGuest ? 'Yes' : 'No'
        );
      } else {
        row.push('', '', '', '');
      }
    }

    exportRows.push(row);
  }

  // Create workbook
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(exportRows);

  // Set column widths
  const columnWidths: { wch: number }[] = [
    { wch: 20 }, // Family Name
    { wch: 20 }, // Contact Person
    { wch: 25 }, // Email
    { wch: 15 }, // Phone
    { wch: 15 }, // WhatsApp
    { wch: 10 }, // Language
    { wch: 12 }, // Channel
    { wch: 20 }, // Invited By
  ];

  // Member basic info widths (3 cols × 10)
  for (let i = 0; i < 10; i++) {
    columnWidths.push({ wch: 20 }, { wch: 10 }, { wch: 8 });
  }

  // Extra family summary widths
  columnWidths.push(
    { wch: 15 }, // Reference Code
    { wch: 15 }, // RSVP Status
    { wch: 12 }, // Total Members
    { wch: 10 }, // Attending
    { wch: 12 }, // Not Attending
    { wch: 10 }, // Pending
    { wch: 15 }, // Payment Status
    { wch: 12 }  // Payment Amount
  );

  // Member extra info widths (4 cols × 10)
  for (let i = 0; i < 10; i++) {
    columnWidths.push({ wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 15 });
  }

  worksheet['!cols'] = columnWidths;

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Guest List');

  // Generate file based on format
  const timestamp = new Date().toISOString().split('T')[0];

  if (format === 'csv') {
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    return {
      buffer: Buffer.from(csv, 'utf-8'),
      filename: `guest-list-${timestamp}.csv`,
      mimeType: 'text/csv',
    };
  } else {
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return {
      buffer: Buffer.from(buffer),
      filename: `guest-list-${timestamp}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }
}

/**
 * Export guest data with simplified format (basic info only)
 *
 * @param wedding_id - Wedding ID to export guests for
 * @returns Buffer containing the exported file
 */
export async function exportGuestDataSimplified(wedding_id: string): Promise<ExportResult> {
  const familiesData = await fetchGuestData(wedding_id);

  // Prepare simplified export rows
  const exportRows: (string | number)[][] = [];

  // Header
  exportRows.push([
    'Family Name',
    'Contact Person',
    'Email',
    'Phone',
    'WhatsApp',
    'Total Members',
    'RSVP Status',
    'Members Attending',
  ]);

  // Data rows
  for (const family of familiesData) {
    exportRows.push([
      family.familyName,
      family.contactPerson,
      family.email,
      family.phone,
      family.whatsapp,
      family.totalMembers,
      family.rsvpStatus,
      family.attendingCount,
    ]);
  }

  // Create workbook
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(exportRows);

  worksheet['!cols'] = [
    { wch: 20 },
    { wch: 20 },
    { wch: 25 },
    { wch: 15 },
    { wch: 15 },
    { wch: 12 },
    { wch: 15 },
    { wch: 15 },
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Guest Summary');

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  const timestamp = new Date().toISOString().split('T')[0];

  return {
    buffer: Buffer.from(buffer),
    filename: `guest-summary-${timestamp}.xlsx`,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
}


