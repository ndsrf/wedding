/**
 * Excel Template Generation
 *
 * Generates downloadable Excel templates with pre-filled headers and example data
 * for importing guest lists. Includes validation instructions in the template.
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
// TEMPLATE GENERATION
// ============================================================================

/**
 * Generate Excel template for guest list import
 * Creates a downloadable Excel file with headers and example data
 *
 * @param options - Template generation options
 * @returns Buffer containing the Excel file
 */
export function generateTemplate(options: TemplateOptions = {}): TemplateResult {
  const { includeExamples = true } = options;

  // Define column headers
  const headers = [
    'Family Name *',
    'Contact Person *',
    'Email',
    'Phone',
    'WhatsApp',
    'Language *',
    'Member 1 Name *',
    'Member 1 Type *',
    'Member 1 Age',
    'Member 2 Name',
    'Member 2 Type',
    'Member 2 Age',
    'Member 3 Name',
    'Member 3 Type',
    'Member 3 Age',
    'Member 4 Name',
    'Member 4 Type',
    'Member 4 Age',
    'Member 5 Name',
    'Member 5 Type',
    'Member 5 Age',
    'Member 6 Name',
    'Member 6 Type',
    'Member 6 Age',
    'Member 7 Name',
    'Member 7 Type',
    'Member 7 Age',
    'Member 8 Name',
    'Member 8 Type',
    'Member 8 Age',
    'Member 9 Name',
    'Member 9 Type',
    'Member 9 Age',
    'Member 10 Name',
    'Member 10 Type',
    'Member 10 Age',
  ];

  // Create worksheet data
  const worksheetData: (string | number)[][] = [headers];

  // Add example rows if requested
  if (includeExamples) {
    worksheetData.push(
      [
        'García Family',
        'Juan García',
        'juan.garcia@example.com',
        '+34612345678',
        '+34612345678',
        'ES',
        'Juan García',
        'ADULT',
        '45',
        'María García',
        'ADULT',
        '42',
        'Carlos García',
        'CHILD',
        '12',
        'Ana García',
        'CHILD',
        '8',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
      ],
      [
        'Smith Family',
        'John Smith',
        'john.smith@example.com',
        '+441234567890',
        '+441234567890',
        'EN',
        'John Smith',
        'ADULT',
        '50',
        'Jane Smith',
        'ADULT',
        '48',
        'Emily Smith',
        'INFANT',
        '2',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
      ]
    );
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
    ['Optional Fields:'],
    ['- Email: Contact email (recommended for email invitations)'],
    ['- Phone: Contact phone number'],
    ['- WhatsApp: WhatsApp number (recommended for WhatsApp invitations)'],
    ['- Member X Age: Age of family member (optional)'],
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
    ['Notes:'],
    ['- You can add up to 10 members per family'],
    ['- At least one contact method (Email, Phone, or WhatsApp) is recommended'],
    ['- Duplicate emails or phones will be flagged as warnings'],
    ['- Reference codes will be generated automatically for automated payment mode'],
    ['- Magic tokens for RSVP links will be generated automatically'],
    [''],
    ['Example families are provided in the "Guest List" sheet'],
  ];

  // Create workbook
  const workbook = XLSX.utils.book_new();

  // Add guest list sheet
  const guestSheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Set column widths
  const columnWidths = [
    { wch: 20 }, // Family Name
    { wch: 20 }, // Contact Person
    { wch: 25 }, // Email
    { wch: 15 }, // Phone
    { wch: 15 }, // WhatsApp
    { wch: 10 }, // Language
  ];

  // Add widths for member columns
  for (let i = 0; i < 10; i++) {
    columnWidths.push({ wch: 20 }); // Member Name
    columnWidths.push({ wch: 10 }); // Member Type
    columnWidths.push({ wch: 8 });  // Member Age
  }

  guestSheet['!cols'] = columnWidths;

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
 * Generate a pre-filled template with existing data
 * Useful for allowing admins to edit and re-import
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
    members: Array<{
      name: string;
      type: string;
      age: number | null;
    }>;
  }>
): TemplateResult {
  // Define column headers
  const headers = [
    'Family Name *',
    'Contact Person *',
    'Email',
    'Phone',
    'WhatsApp',
    'Language *',
    'Member 1 Name *',
    'Member 1 Type *',
    'Member 1 Age',
    'Member 2 Name',
    'Member 2 Type',
    'Member 2 Age',
    'Member 3 Name',
    'Member 3 Type',
    'Member 3 Age',
    'Member 4 Name',
    'Member 4 Type',
    'Member 4 Age',
    'Member 5 Name',
    'Member 5 Type',
    'Member 5 Age',
    'Member 6 Name',
    'Member 6 Type',
    'Member 6 Age',
    'Member 7 Name',
    'Member 7 Type',
    'Member 7 Age',
    'Member 8 Name',
    'Member 8 Type',
    'Member 8 Age',
    'Member 9 Name',
    'Member 9 Type',
    'Member 9 Age',
    'Member 10 Name',
    'Member 10 Type',
    'Member 10 Age',
  ];

  // Create worksheet data
  const worksheetData: (string | number)[][] = [headers];

  // Add family rows
  for (const family of families) {
    const row: (string | number)[] = [
      family.name,
      family.members[0]?.name || '',
      family.email || '',
      family.phone || '',
      family.whatsapp_number || '',
      family.preferred_language,
    ];

    // Add up to 10 members
    for (let i = 0; i < 10; i++) {
      const member = family.members[i];
      if (member) {
        row.push(member.name, member.type, member.age || '');
      } else {
        row.push('', '', '');
      }
    }

    worksheetData.push(row);
  }

  // Create workbook
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Set column widths
  const columnWidths = [
    { wch: 20 }, // Family Name
    { wch: 20 }, // Contact Person
    { wch: 25 }, // Email
    { wch: 15 }, // Phone
    { wch: 15 }, // WhatsApp
    { wch: 10 }, // Language
  ];

  // Add widths for member columns
  for (let i = 0; i < 10; i++) {
    columnWidths.push({ wch: 20 }); // Member Name
    columnWidths.push({ wch: 10 }); // Member Type
    columnWidths.push({ wch: 8 });  // Member Age
  }

  worksheet['!cols'] = columnWidths;

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Guest List');

  // Generate buffer
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  return {
    buffer: Buffer.from(buffer),
    filename: `guest-list-${new Date().toISOString().split('T')[0]}.xlsx`,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
}
