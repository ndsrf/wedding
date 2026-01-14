/**
 * Excel Export Service
 *
 * Exports guest data to Excel format (XLSX or CSV).
 * Includes family information, members, RSVP status, and payment details.
 */

import * as XLSX from 'xlsx';
import { prisma } from '@/lib/db/prisma';
import type { Language } from '@prisma/client';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type ExportFormat = 'xlsx' | 'csv';

export interface ExportOptions {
  format?: ExportFormat;
  includePaymentInfo?: boolean;
  includeRsvpStatus?: boolean;
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
  const families = await prisma.family.findMany({
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
  });

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
 * @param wedding_id - Wedding ID to export guests for
 * @param options - Export options (format, inclusions)
 * @returns Buffer containing the exported file
 */
export async function exportGuestData(
  wedding_id: string,
  options: ExportOptions = {}
): Promise<ExportResult> {
  const { format = 'xlsx', includePaymentInfo = true, includeRsvpStatus = true } = options;

  // Fetch data
  const familiesData = await fetchGuestData(wedding_id);

  // Prepare export rows
  const exportRows: (string | number)[][] = [];

  // Add header row
  const headers = [
    'Family Name',
    'Contact Person',
    'Email',
    'Phone',
    'WhatsApp',
    'Language',
    'Reference Code',
  ];

  if (includeRsvpStatus) {
    headers.push('RSVP Status', 'Total Members', 'Attending', 'Not Attending', 'Pending');
  }

  if (includePaymentInfo) {
    headers.push('Payment Status', 'Payment Amount');
  }

  headers.push(
    'Member 1 Name',
    'Member 1 Type',
    'Member 1 Age',
    'Member 1 Attending',
    'Member 1 Dietary',
    'Member 1 Accessibility',
    'Member 1 Added By Guest'
  );

  // Add headers for up to 10 members
  for (let i = 2; i <= 10; i++) {
    headers.push(
      `Member ${i} Name`,
      `Member ${i} Type`,
      `Member ${i} Age`,
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
      family.familyName,
      family.contactPerson,
      family.email,
      family.phone,
      family.whatsapp,
      family.language,
      family.referenceCode,
    ];

    if (includeRsvpStatus) {
      row.push(
        family.rsvpStatus,
        family.totalMembers,
        family.attendingCount,
        family.notAttendingCount,
        family.pendingCount
      );
    }

    if (includePaymentInfo) {
      row.push(family.paymentStatus, family.paymentAmount);
    }

    // Add member data (up to 10 members)
    for (let i = 0; i < 10; i++) {
      const member = family.members[i];
      if (member) {
        row.push(
          member.name,
          member.type,
          member.age || '',
          member.attending,
          member.dietaryRestrictions,
          member.accessibilityNeeds,
          member.addedByGuest ? 'Yes' : 'No'
        );
      } else {
        row.push('', '', '', '', '', '', '');
      }
    }

    exportRows.push(row);
  }

  // Create workbook
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(exportRows);

  // Set column widths
  const columnWidths = [
    { wch: 20 }, // Family Name
    { wch: 20 }, // Contact Person
    { wch: 25 }, // Email
    { wch: 15 }, // Phone
    { wch: 15 }, // WhatsApp
    { wch: 10 }, // Language
    { wch: 15 }, // Reference Code
  ];

  if (includeRsvpStatus) {
    columnWidths.push(
      { wch: 15 }, // RSVP Status
      { wch: 12 }, // Total Members
      { wch: 10 }, // Attending
      { wch: 12 }, // Not Attending
      { wch: 10 }  // Pending
    );
  }

  if (includePaymentInfo) {
    columnWidths.push(
      { wch: 15 }, // Payment Status
      { wch: 12 }  // Payment Amount
    );
  }

  // Add widths for member columns
  for (let i = 0; i < 10; i++) {
    columnWidths.push(
      { wch: 20 }, // Member Name
      { wch: 10 }, // Member Type
      { wch: 8 },  // Member Age
      { wch: 10 }, // Member Attending
      { wch: 20 }, // Member Dietary
      { wch: 20 }, // Member Accessibility
      { wch: 15 }  // Member Added By Guest
    );
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
