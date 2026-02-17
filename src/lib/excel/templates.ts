/**
 * Excel Template Generation
 *
 * Generates downloadable Excel templates with pre-filled headers and example data
 * for importing guest lists. Includes validation instructions in the template.
 *
 * Column layout matches the unified export/import format (86 columns):
 *   Cols  0-7:  Family info
 *   Cols  8-37: Member 1-10 basic — Name, Type, Age  (3 cols × 10)
 *   Cols 38-45: Extra family summary — Reference Code, RSVP Status, Total Members,
 *               Attending, Not Attending, Pending, Payment Status, Payment Amount
 *   Cols 46-85: Member 1-10 extra — Attending, Dietary, Accessibility, Added By Guest  (4 cols × 10)
 */

import * as XLSX from 'xlsx';
import type { Language } from '@prisma/client';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface TemplateOptions {
  language?: Language;
  includeExamples?: boolean;
}

export interface TemplateResult {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Build the unified header row (86 columns).
 * Required fields are marked with *.
 */
function buildHeaders(): string[] {
  // Cols 0-7: Family info
  const headers: string[] = [
    'Family Name *',
    'Contact Person *',
    'Email',
    'Phone',
    'WhatsApp',
    'Language *',
    'Channel',
    'Invited By',
  ];

  // Cols 8-37: Member basic info (3 cols × 10)
  for (let i = 1; i <= 10; i++) {
    headers.push(
      i === 1 ? 'Member 1 Name *' : `Member ${i} Name`,
      i === 1 ? 'Member 1 Type *' : `Member ${i} Type`,
      `Member ${i} Age`
    );
  }

  // Cols 38-45: Extra family summary (read-only — filled by system on export)
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

  // Cols 46-85: Member extra info (4 cols × 10)
  for (let i = 1; i <= 10; i++) {
    headers.push(
      `Member ${i} Attending`,
      `Member ${i} Dietary`,
      `Member ${i} Accessibility`,
      `Member ${i} Added By Guest`
    );
  }

  return headers;
}

/**
 * Build the column widths array for the unified format (86 columns).
 */
function buildColumnWidths(): { wch: number }[] {
  const widths: { wch: number }[] = [
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
    widths.push({ wch: 20 }, { wch: 10 }, { wch: 8 });
  }

  // Extra family summary widths
  widths.push(
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
    widths.push({ wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 15 });
  }

  return widths;
}

// ============================================================================
// TEMPLATE GENERATION
// ============================================================================

/**
 * Generate Excel template for guest list import.
 * Creates a downloadable Excel file with headers and optional example data.
 *
 * @param options - Template generation options
 * @returns Buffer containing the Excel file
 */
export function generateTemplate(options: TemplateOptions = {}): TemplateResult {
  const { includeExamples = true } = options;

  const headers = buildHeaders();

  // Create worksheet data
  const worksheetData: (string | number)[][] = [headers];

  // Add example rows if requested
  if (includeExamples) {
    // Helper: build a full 86-column example row
    // familyCols: 8 values, memberBasic: up to 10 members × [name, type, age]
    // extraFamily: 8 values (all blank — system-generated), extraMember: up to 10 members × [attending, dietary, accessibility, addedByGuest]
    const makeRow = (
      familyCols: (string | number)[],
      memberBasic: (string | number)[][],
      extraMemberPartial: (string | number)[][]
    ): (string | number)[] => {
      const row: (string | number)[] = [...familyCols];

      // Member basic (10 × 3)
      for (let i = 0; i < 10; i++) {
        const m = memberBasic[i];
        row.push(m ? m[0] : '', m ? m[1] : '', m ? m[2] : '');
      }

      // Extra family summary — blank (system-generated on export)
      row.push('', '', '', '', '', '', '', '');

      // Member extra (10 × 4)
      for (let i = 0; i < 10; i++) {
        const e = extraMemberPartial[i];
        row.push(e ? e[0] : '', e ? e[1] : '', e ? e[2] : '', e ? e[3] : '');
      }

      return row;
    };

    // García Family example
    worksheetData.push(makeRow(
      ['García Family', 'Juan García', 'juan.garcia@example.com', '+34612345678', '+34612345678', 'ES', 'WHATSAPP', ''],
      [
        ['Juan García', 'ADULT', 45],
        ['María García', 'ADULT', 42],
        ['Carlos García', 'CHILD', 12],
        ['Ana García', 'CHILD', 8],
      ],
      [
        ['Yes', '', '', ''],
        ['Yes', 'Vegetarian', '', ''],
        ['No', '', '', ''],
        ['', '', '', ''],
      ]
    ));

    // Smith Family example
    worksheetData.push(makeRow(
      ['Smith Family', 'John Smith', 'john.smith@example.com', '+441234567890', '+441234567890', 'EN', 'EMAIL', ''],
      [
        ['John Smith', 'ADULT', 50],
        ['Jane Smith', 'ADULT', 48],
        ['Emily Smith', 'INFANT', 2],
      ],
      [
        ['Yes', 'Gluten-free', 'Wheelchair access needed', ''],
        ['Yes', '', '', ''],
        ['', '', '', ''],
      ]
    ));
  }

  // Add instructions sheet
  const instructionsData = [
    ['Guest List Import Template'],
    [''],
    ['INSTRUCTIONS'],
    [''],
    ['Required Fields (marked with *):'],
    ['- Family Name: The family surname or group name'],
    ['- Contact Person: Name of the primary contact person'],
    ['- Language: Must be one of: ES, EN, FR, IT, DE (default: ES)'],
    ['- Member 1 Name: At least one family member is required'],
    ['- Member 1 Type: Must be one of: ADULT, CHILD, INFANT'],
    [''],
    ['Optional Fields — Family (cols A-H):'],
    ['- Email: Contact email (recommended for email invitations)'],
    ['- Phone: Contact phone number'],
    ['- WhatsApp: WhatsApp number (recommended for WhatsApp invitations)'],
    ['- Channel: Preferred communication channel (WHATSAPP, EMAIL, or SMS — leave blank to auto-select)'],
    ['- Invited By: Name or email of the admin who invited this guest (leave blank to default to the first admin)'],
    [''],
    ['Optional Fields — Member basic (cols I-AL, 3 cols × 10 members):'],
    ['- Member X Name: Full name of family member'],
    ['- Member X Type: Must be ADULT, CHILD, or INFANT'],
    ['- Member X Age: Age of family member (optional)'],
    [''],
    ['Optional Fields — Member extra (cols AS onwards, 4 cols × 10 members):'],
    ['- Member X Attending: RSVP status — Yes, No, or leave blank for Pending'],
    ['- Member X Dietary: Dietary restrictions or preferences (e.g. Vegetarian, Gluten-free)'],
    ['- Member X Accessibility: Accessibility requirements (e.g. Wheelchair access needed)'],
    [''],
    ['Optional Fields — Extra family (col AM):'],
    ['- Reference Code: If provided, used as-is; otherwise auto-generated for automated payment mode'],
    [''],
    ['Read-Only Fields (cols AN-AT — filled automatically on export, ignored on import):'],
    ['- RSVP Status, Total Members, Attending count, Not Attending count, Pending count, Payment Status, Payment Amount'],
    ['- Member X Added By Guest'],
    [''],
    ['Member Types:'],
    ['- ADULT: Adults (18+ years)'],
    ['- CHILD: Children (3-17 years)'],
    ['- INFANT: Infants (0-2 years)'],
    [''],
    ['Supported Languages:'],
    ['- ES: Spanish (Español)'],
    ['- EN: English'],
    ['- FR: French (Français)'],
    ['- IT: Italian (Italiano)'],
    ['- DE: German (Deutsch)'],
    [''],
    ['Supported Channels:'],
    ['- WHATSAPP: Send notifications via WhatsApp'],
    ['- EMAIL: Send notifications via Email'],
    ['- SMS: Send notifications via SMS'],
    [''],
    ['Notes:'],
    ['- You can add up to 10 members per family'],
    ['- At least one contact method (Email, Phone, or WhatsApp) is recommended'],
    ['- Duplicate emails or phones will be flagged as warnings'],
    ['- Reference codes are generated automatically for automated payment mode'],
    ['- Magic tokens for RSVP links are generated automatically'],
    ['- Exporting the guest list produces a file in this same format that can be re-imported'],
    [''],
    ['Example families are provided in the "Guest List" sheet'],
  ];

  // Create workbook
  const workbook = XLSX.utils.book_new();

  // Add guest list sheet
  const guestSheet = XLSX.utils.aoa_to_sheet(worksheetData);
  guestSheet['!cols'] = buildColumnWidths();
  XLSX.utils.book_append_sheet(workbook, guestSheet, 'Guest List');

  // Add instructions sheet
  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
  instructionsSheet['!cols'] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');

  // Generate buffer
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  return {
    buffer: Buffer.from(buffer),
    filename: `guest-list-template-${new Date().toISOString().split('T')[0]}.xlsx`,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
}

/**
 * Generate a pre-filled template with existing family data.
 * Useful for allowing admins to edit and re-import.
 *
 * @param families - Existing family data to pre-fill
 * @returns Buffer containing the Excel file
 */
export function generatePrefilledTemplate(
  families: Array<{
    name: string;
    email: string | null;
    phone: string | null;
    whatsapp_number: string | null;
    preferred_language: Language;
    channel_preference?: string | null;
    invitedByAdmin?: string;
    members: Array<{
      name: string;
      type: string;
      age: number | null;
      dietary_restrictions?: string | null;
      accessibility_needs?: string | null;
    }>;
  }>
): TemplateResult {
  const headers = buildHeaders();
  const worksheetData: (string | number)[][] = [headers];

  for (const family of families) {
    const row: (string | number)[] = [
      // Cols 0-7: Family info
      family.name,
      family.members[0]?.name || '',
      family.email || '',
      family.phone || '',
      family.whatsapp_number || '',
      family.preferred_language,
      family.channel_preference || '',
      family.invitedByAdmin || '',
    ];

    // Cols 8-37: Member basic info (3 cols × 10)
    for (let i = 0; i < 10; i++) {
      const member = family.members[i];
      row.push(member ? member.name : '', member ? member.type : '', member && member.age ? member.age : '');
    }

    // Cols 38-45: Extra family summary — blank (system-generated)
    row.push('', '', '', '', '', '', '', '');

    // Cols 46-85: Member extra info (4 cols × 10)
    for (let i = 0; i < 10; i++) {
      const member = family.members[i];
      row.push(
        '',                                                          // Attending (system-managed)
        member ? (member.dietary_restrictions || '') : '',
        member ? (member.accessibility_needs || '') : '',
        ''                                                           // Added By Guest (system-managed)
      );
    }

    worksheetData.push(row);
  }

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  worksheet['!cols'] = buildColumnWidths();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Guest List');

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  return {
    buffer: Buffer.from(buffer),
    filename: `guest-list-${new Date().toISOString().split('T')[0]}.xlsx`,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
}
