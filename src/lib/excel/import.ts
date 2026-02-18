/**
 * Excel Import Service
 *
 * Validates and imports guest list data from Excel files.
 * Performs comprehensive validation and creates Family and FamilyMember records.
 */

import * as XLSX from 'xlsx';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/db/prisma';
import type { Language, MemberType, PaymentMode, Channel } from '@prisma/client';
import { processPhoneNumber } from '@/lib/phone-utils';

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
  channel: Channel | null;
  invitedBy: string | null;
  referenceCode: string | null;
  members: Array<{
    name: string;
    type: MemberType;
    age: number | null;
    dietaryRestrictions: string | null;
    accessibilityNeeds: string | null;
    attending: boolean | null;
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
const VALID_CHANNELS: Channel[] = ['WHATSAPP', 'EMAIL', 'SMS'];

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
 * Validate channel preference
 */
function validateChannel(value: string | undefined): Channel | null {
  if (!value) return null;

  const channel = value.trim().toUpperCase();
  if (VALID_CHANNELS.includes(channel as Channel)) {
    return channel as Channel;
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
    const channel = row[6] ? String(row[6]).trim() : null;
    const invitedBy = row[7] ? String(row[7]).trim() : null;

    // Col 38: Reference Code (optional — preserve from export, otherwise auto-generated)
    const referenceCode = row[38] ? String(row[38]).trim() : null;

    // Parse members (up to 10)
    // Unified column layout:
    //   Cols  8-37: Member 1-10 basic info — Name (8+i*3), Type (9+i*3), Age (10+i*3)
    //   Cols 38-45: Extra family summary — Reference Code (38) imported; RSVP counts and
    //               Payment (39-45) are computed/system-managed and ignored on import
    //   Cols 46-85: Member 1-10 extra info — Attending (46+i*4) imported,
    //               Dietary (47+i*4) imported, Accessibility (48+i*4) imported,
    //               Added By Guest (49+i*4) system-managed, ignored on import
    const members: ImportRow['members'] = [];

    for (let i = 0; i < 10; i++) {
      const nameIndex         = 8  + (i * 3);
      const typeIndex         = 9  + (i * 3);
      const ageIndex          = 10 + (i * 3);
      const attendingIndex    = 46 + (i * 4);
      const dietaryIndex      = 47 + (i * 4);
      const accessibilityIndex = 48 + (i * 4);

      const memberName = row[nameIndex] ? String(row[nameIndex]).trim() : '';
      const memberType = row[typeIndex] ? String(row[typeIndex]).trim() : '';
      const memberAge  = row[ageIndex]  ? parseInt(String(row[ageIndex]), 10) : null;

      const attendingRaw = row[attendingIndex] ? String(row[attendingIndex]).trim().toLowerCase() : '';
      const attending: boolean | null =
        attendingRaw === 'yes' ? true : attendingRaw === 'no' ? false : null;

      const memberDietary      = row[dietaryIndex]       ? String(row[dietaryIndex]).trim()       : null;
      const memberAccessibility = row[accessibilityIndex] ? String(row[accessibilityIndex]).trim() : null;

      if (memberName && memberType) {
        members.push({
          name: memberName,
          type: memberType as MemberType,
          age: memberAge,
          attending,
          dietaryRestrictions: memberDietary,
          accessibilityNeeds: memberAccessibility,
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
      channel: validateChannel(channel || undefined),
      invitedBy: invitedBy || null,
      referenceCode: referenceCode || null,
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
  defaultLanguage: Language,
  adminNames: Set<string>
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

    // Validate channel (optional field)
    if (row.channel && !VALID_CHANNELS.includes(row.channel)) {
      warnings.push({
        row: rowNum,
        field: 'Channel',
        message: `Invalid channel '${row.channel}', will be left empty`,
      });
      row.channel = null;
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

    // Warn if invitedBy value doesn't match any admin
    if (row.invitedBy && !adminNames.has(row.invitedBy.toLowerCase())) {
      warnings.push({
        row: rowNum,
        field: 'Invited By',
        message: `Admin '${row.invitedBy}' not found, will default to first admin`,
      });
      row.invitedBy = null;
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
  defaultLanguage: Language = 'ES',
  weddingCountry?: string | null
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

    // Fetch admins for the wedding to resolve invitedBy
    const weddingAdmins = await prisma.weddingAdmin.findMany({
      where: { wedding_id },
      select: { id: true, name: true, email: true },
      orderBy: { created_at: 'asc' },
    });
    const defaultAdminId = weddingAdmins.length > 0 ? weddingAdmins[0].id : null;

    // Build lookup map: lowercase name -> id, lowercase email -> id
    const adminLookup = new Map<string, string>();
    const adminNames = new Set<string>();
    for (const admin of weddingAdmins) {
      if (admin.name) {
        adminLookup.set(admin.name.toLowerCase(), admin.id);
        adminNames.add(admin.name.toLowerCase());
      }
      if (admin.email) {
        adminLookup.set(admin.email.toLowerCase(), admin.id);
        adminNames.add(admin.email.toLowerCase());
      }
    }

    // Validate data
    const { errors, warnings } = validateImportData(rows, defaultLanguage, adminNames);

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

        // Use provided reference code from the file, or auto-generate for AUTOMATED payment mode
        const referenceCode = row.referenceCode
          ? row.referenceCode
          : paymentMode === 'AUTOMATED' ? await ensureUniqueReferenceCode(wedding_id) : null;

        // Resolve invited_by_admin_id: match by name first, then email, then default
        const resolvedAdminId = row.invitedBy
          ? (adminLookup.get(row.invitedBy.toLowerCase()) || defaultAdminId)
          : defaultAdminId;

        // Process phone numbers with country prefix
        const processedPhone = processPhoneNumber(row.phone, weddingCountry);
        const processedWhatsapp = processPhoneNumber(row.whatsapp, weddingCountry);

        // Create family
        const family = await tx.family.create({
          data: {
            wedding_id,
            name: row.familyName,
            email: row.email,
            phone: processedPhone,
            whatsapp_number: processedWhatsapp,
            magic_token: magicToken,
            reference_code: referenceCode,
            preferred_language: row.language,
            channel_preference: row.channel,
            invited_by_admin_id: resolvedAdminId,
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
              attending: member.attending,
              added_by_guest: false,
              dietary_restrictions: member.dietaryRestrictions,
              accessibility_needs: member.accessibilityNeeds,
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
