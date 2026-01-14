/**
 * Excel Import Service
 *
 * Validates and imports guest list data from Excel files.
 * Performs comprehensive validation and creates Family and FamilyMember records.
 */

import * as XLSX from 'xlsx';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/db/prisma';
import type { Language, MemberType, PaymentMode } from '@prisma/client';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ImportRow {
  familyName: string;
  contactPerson: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  language: Language;
  members: Array<{
    name: string;
    type: MemberType;
    age: number | null;
  }>;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ValidationWarning {
  row: number;
  field: string;
  message: string;
}

export interface ImportResult {
  success: boolean;
  familiesCreated: number;
  membersCreated: number;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  message: string;
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

const VALID_LANGUAGES: Language[] = ['ES', 'EN', 'FR', 'IT', 'DE'];
const VALID_MEMBER_TYPES: MemberType[] = ['ADULT', 'CHILD', 'INFANT'];

/**
 * Validate member type
 */
function validateMemberType(value: string | undefined): MemberType | null {
  if (!value) return null;

  const type = value.trim().toUpperCase();
  if (VALID_MEMBER_TYPES.includes(type as MemberType)) {
    return type as MemberType;
  }

  return null;
}

/**
 * Generate unique reference code for automated payment mode
 */
function generateReferenceCode(): string {
  // Generate 8-character alphanumeric code
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Check if reference code is unique
 */
async function ensureUniqueReferenceCode(wedding_id: string): Promise<string> {
  let code = generateReferenceCode();
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const existing = await prisma.family.findFirst({
      where: {
        wedding_id,
        reference_code: code,
      },
    });

    if (!existing) {
      return code;
    }

    code = generateReferenceCode();
    attempts++;
  }

  // Fallback to UUID if we can't generate unique code
  return randomUUID().substring(0, 8).toUpperCase();
}

// ============================================================================
// EXCEL PARSING
// ============================================================================

/**
 * Parse Excel file buffer into structured data
 */
function parseExcelFile(buffer: Buffer): ImportRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });

  // Get the first sheet (Guest List)
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to JSON
  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as (string | number | null)[][];

  // Skip header row
  const dataRows = rawData.slice(1);

  const rows: ImportRow[] = [];

  for (const row of dataRows) {
    // Skip empty rows
    if (!row || row.length === 0 || !row[0]) continue;

    const familyName = String(row[0] || '').trim();
    const contactPerson = String(row[1] || '').trim();
    const email = row[2] ? String(row[2]).trim() : null;
    const phone = row[3] ? String(row[3]).trim() : null;
    const whatsapp = row[4] ? String(row[4]).trim() : null;
    const language = String(row[5] || 'ES').trim().toUpperCase() as Language;

    // Parse members (up to 10)
    const members: ImportRow['members'] = [];

    for (let i = 0; i < 10; i++) {
      const nameIndex = 6 + (i * 3);
      const typeIndex = 7 + (i * 3);
      const ageIndex = 8 + (i * 3);

      const memberName = row[nameIndex] ? String(row[nameIndex]).trim() : '';
      const memberType = row[typeIndex] ? String(row[typeIndex]).trim() : '';
      const memberAge = row[ageIndex] ? parseInt(String(row[ageIndex]), 10) : null;

      if (memberName && memberType) {
        members.push({
          name: memberName,
          type: memberType as MemberType,
          age: memberAge,
        });
      }
    }

    rows.push({
      familyName,
      contactPerson,
      email: email || null,
      phone: phone || null,
      whatsapp: whatsapp || null,
      language,
      members,
    });
  }

  return rows;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate import data
 */
function validateImportData(
  rows: ImportRow[],
  defaultLanguage: Language
): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const emailsSeen = new Set<string>();
  const phonesSeen = new Set<string>();

  rows.forEach((row, index) => {
    const rowNum = index + 2; // +2 for header and 0-index

    // Validate required fields
    if (!row.familyName) {
      errors.push({
        row: rowNum,
        field: 'Family Name',
        message: 'Family Name is required',
      });
    }

    if (!row.contactPerson) {
      errors.push({
        row: rowNum,
        field: 'Contact Person',
        message: 'Contact Person is required',
      });
    }

    // Validate at least one member
    if (row.members.length === 0) {
      errors.push({
        row: rowNum,
        field: 'Members',
        message: 'At least one family member is required',
      });
    }

    // Validate language
    if (!VALID_LANGUAGES.includes(row.language)) {
      warnings.push({
        row: rowNum,
        field: 'Language',
        message: `Invalid language '${row.language}', using default '${defaultLanguage}'`,
      });
      row.language = defaultLanguage;
    }

    // Validate member types
    row.members.forEach((member, memberIndex) => {
      if (!member.name) {
        errors.push({
          row: rowNum,
          field: `Member ${memberIndex + 1} Name`,
          message: 'Member name is required',
        });
      }

      const validatedType = validateMemberType(member.type);
      if (!validatedType) {
        errors.push({
          row: rowNum,
          field: `Member ${memberIndex + 1} Type`,
          message: `Invalid member type '${member.type}'. Must be ADULT, CHILD, or INFANT`,
        });
      } else {
        member.type = validatedType;
      }

      // Validate age if provided
      if (member.age !== null && (member.age < 0 || member.age > 120)) {
        warnings.push({
          row: rowNum,
          field: `Member ${memberIndex + 1} Age`,
          message: `Age ${member.age} seems invalid`,
        });
      }
    });

    // Check for duplicate emails
    if (row.email) {
      if (emailsSeen.has(row.email.toLowerCase())) {
        warnings.push({
          row: rowNum,
          field: 'Email',
          message: `Duplicate email: ${row.email}`,
        });
      } else {
        emailsSeen.add(row.email.toLowerCase());
      }
    }

    // Check for duplicate phones
    if (row.phone) {
      if (phonesSeen.has(row.phone)) {
        warnings.push({
          row: rowNum,
          field: 'Phone',
          message: `Duplicate phone: ${row.phone}`,
        });
      } else {
        phonesSeen.add(row.phone);
      }
    }

    // Warn if no contact method
    if (!row.email && !row.phone && !row.whatsapp) {
      warnings.push({
        row: rowNum,
        field: 'Contact',
        message: 'No contact method provided (email, phone, or WhatsApp)',
      });
    }
  });

  return { errors, warnings };
}

// ============================================================================
// IMPORT FUNCTION
// ============================================================================

/**
 * Import guest list from Excel file
 * Validates data and creates Family and FamilyMember records in a transaction
 *
 * @param wedding_id - Wedding ID to import guests for
 * @param file - Excel file buffer
 * @param paymentMode - Payment tracking mode (AUTOMATED generates reference codes)
 * @param defaultLanguage - Default language for the wedding
 * @returns Import result with success status, counts, and errors/warnings
 */
export async function importGuestList(
  wedding_id: string,
  file: Buffer,
  paymentMode: PaymentMode,
  defaultLanguage: Language = 'ES'
): Promise<ImportResult> {
  try {
    // Parse Excel file
    const rows = parseExcelFile(file);

    if (rows.length === 0) {
      return {
        success: false,
        familiesCreated: 0,
        membersCreated: 0,
        errors: [{ row: 0, field: 'File', message: 'No data found in Excel file' }],
        warnings: [],
        message: 'No data found in Excel file',
      };
    }

    if (rows.length > 500) {
      return {
        success: false,
        familiesCreated: 0,
        membersCreated: 0,
        errors: [
          {
            row: 0,
            field: 'File',
            message: `Too many families (${rows.length}). Maximum allowed is 500.`,
          },
        ],
        warnings: [],
        message: 'Too many families in file',
      };
    }

    // Validate data
    const { errors, warnings } = validateImportData(rows, defaultLanguage);

    if (errors.length > 0) {
      return {
        success: false,
        familiesCreated: 0,
        membersCreated: 0,
        errors,
        warnings,
        message: `Validation failed with ${errors.length} error(s)`,
      };
    }

    // Perform atomic import in a transaction
    const result = await prisma.$transaction(async (tx) => {
      let familiesCreated = 0;
      let membersCreated = 0;

      for (const row of rows) {
        // Generate magic token
        const magicToken = randomUUID();

        // Generate reference code if automated payment mode
        const referenceCode =
          paymentMode === 'AUTOMATED' ? await ensureUniqueReferenceCode(wedding_id) : null;

        // Create family
        const family = await tx.family.create({
          data: {
            wedding_id,
            name: row.familyName,
            email: row.email,
            phone: row.phone,
            whatsapp_number: row.whatsapp,
            magic_token: magicToken,
            reference_code: referenceCode,
            preferred_language: row.language,
          },
        });

        familiesCreated++;

        // Create family members
        for (const member of row.members) {
          await tx.familyMember.create({
            data: {
              family_id: family.id,
              name: member.name,
              type: member.type,
              age: member.age,
              added_by_guest: false,
            },
          });

          membersCreated++;
        }
      }

      return { familiesCreated, membersCreated };
    });

    return {
      success: true,
      familiesCreated: result.familiesCreated,
      membersCreated: result.membersCreated,
      errors: [],
      warnings,
      message: `Successfully imported ${result.familiesCreated} families with ${result.membersCreated} members`,
    };
  } catch (error) {
    console.error('Import error:', error);
    return {
      success: false,
      familiesCreated: 0,
      membersCreated: 0,
      errors: [
        {
          row: 0,
          field: 'System',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        },
      ],
      warnings: [],
      message: 'Import failed due to system error',
    };
  }
}
