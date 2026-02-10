/**
 * VCF Import Service
 *
 * Validates and imports guest list data from VCF (vCard) files.
 * Each contact becomes a new family with one member.
 */

import { prisma } from '@/lib/db/prisma';
import type { Language, Channel } from '@prisma/client';
import { parseVCF, type VCFContact } from './parser';
import { processPhoneNumber } from '@/lib/phone-utils';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface VCFImportOptions {
  weddingId: string;
  adminId: string;
  adminName: string;
  defaultLanguage: Language;
  weddingCountry?: string | null;
}

export interface ValidationError {
  contact: string;
  field: string;
  message: string;
}

export interface ImportResult {
  success: boolean;
  familiesCreated: number;
  membersCreated: number;
  errors: ValidationError[];
  message: string;
}

// ============================================================================
// IMPORT FUNCTION
// ============================================================================

/**
 * Import contacts from VCF file
 */
export async function importVCF(
  vcfContent: string,
  options: VCFImportOptions
): Promise<ImportResult> {
  const errors: ValidationError[] = [];
  let familiesCreated = 0;
  let membersCreated = 0;

  try {
    // Parse VCF file
    const parseResult = parseVCF(vcfContent);

    // Add parse errors to validation errors
    parseResult.errors.forEach((error) => {
      errors.push({
        contact: 'File',
        field: 'parse',
        message: error,
      });
    });

    if (parseResult.contacts.length === 0) {
      return {
        success: false,
        familiesCreated: 0,
        membersCreated: 0,
        errors,
        message: 'No valid contacts found in VCF file',
      };
    }

    // Get wedding to access its language for translations
    const wedding = await prisma.wedding.findUnique({
      where: { id: options.weddingId },
      select: { default_language: true, wedding_country: true },
    });

    if (!wedding) {
      return {
        success: false,
        familiesCreated: 0,
        membersCreated: 0,
        errors: [{ contact: 'System', field: 'wedding', message: 'Wedding not found' }],
        message: 'Wedding not found',
      };
    }

    // Determine country for phone prefix
    const countryCode = options.weddingCountry || wedding.wedding_country;

    // Process each contact
    for (const contact of parseResult.contacts) {
      try {
        await importContact(contact, options, wedding.default_language, countryCode, errors);
        familiesCreated++;
        membersCreated++; // Each contact creates one family member
      } catch (error) {
        errors.push({
          contact: contact.name,
          field: 'import',
          message: error instanceof Error ? error.message : 'Failed to import contact',
        });
      }
    }

    // Determine success
    const success = familiesCreated > 0;

    return {
      success,
      familiesCreated,
      membersCreated,
      errors,
      message: success
        ? `Successfully imported ${familiesCreated} ${familiesCreated === 1 ? 'family' : 'families'}`
        : 'Failed to import any contacts',
    };
  } catch (error) {
    return {
      success: false,
      familiesCreated,
      membersCreated,
      errors: [
        {
          contact: 'System',
          field: 'import',
          message: error instanceof Error ? error.message : 'Unknown error during import',
        },
      ],
      message: 'Import failed',
    };
  }
}

/**
 * Import a single contact as a family
 */
async function importContact(
  contact: VCFContact,
  options: VCFImportOptions,
  weddingLanguage: Language,
  countryCode: string | null,
  errors: ValidationError[]
): Promise<void> {
  // Validate that we have at least a name
  if (!contact.name || contact.name.trim() === '') {
    throw new Error('Contact name is required');
  }

  // Check for duplicate email
  if (contact.email) {
    const existingFamily = await prisma.family.findFirst({
      where: {
        wedding_id: options.weddingId,
        email: contact.email,
      },
    });

    if (existingFamily) {
      errors.push({
        contact: contact.name,
        field: 'email',
        message: `Email ${contact.email} already exists - skipped`,
      });
      throw new Error('Duplicate email');
    }
  }

  // Process phone numbers with country prefix
  const processedPhone = contact.phone
    ? processPhoneNumber(contact.phone, countryCode)
    : null;

  // Use phone for WhatsApp by default if phone exists
  const whatsappNumber = processedPhone;

  // Determine channel preference (WhatsApp if phone exists, EMAIL otherwise)
  let channelPreference: Channel | null = null;
  if (processedPhone) {
    channelPreference = 'WHATSAPP';
  } else if (contact.email) {
    channelPreference = 'EMAIL';
  }

  // Create private notes with import information
  const importNoteKey = 'admin.guests.importedFromVCF'; // Translation key
  // Format: "Imported from VCF file by {adminName}"
  const privateNotes = getImportNote(weddingLanguage, options.adminName);

  // Create family and member in a transaction
  await prisma.$transaction(async (tx) => {
    // Create family
    const family = await tx.family.create({
      data: {
        wedding_id: options.weddingId,
        name: contact.name,
        email: contact.email || null,
        phone: processedPhone,
        whatsapp_number: whatsappNumber,
        channel_preference: channelPreference,
        preferred_language: options.defaultLanguage,
        invited_by_admin_id: options.adminId,
        private_notes: privateNotes,
      },
    });

    // Create family member (contact person)
    await tx.familyMember.create({
      data: {
        family_id: family.id,
        name: contact.name,
        type: 'ADULT',
        added_by_guest: false,
      },
    });
  });
}

/**
 * Get import note in the wedding's language
 */
function getImportNote(language: Language, adminName: string): string {
  const translations: Record<Language, string> = {
    ES: `Importado desde archivo VCF por ${adminName}`,
    EN: `Imported from VCF file by ${adminName}`,
    FR: `Importé depuis un fichier VCF par ${adminName}`,
    IT: `Importato da file VCF da ${adminName}`,
    DE: `Importiert aus VCF-Datei von ${adminName}`,
  };

  return translations[language] || translations.EN;
}
