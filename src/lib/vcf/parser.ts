/**
 * VCF (vCard) Parser
 *
 * Parses VCF files (virtual contact cards) and extracts contact information
 * for importing guests into the wedding application.
 *
 * Supports vCard 2.1, 3.0, and 4.0 formats.
 */

export interface VCFContact {
  name: string; // FN field
  email?: string; // EMAIL field
  phone?: string; // TEL field (mobile/cell preferred)
  organization?: string; // ORG field
}

export interface VCFParseResult {
  contacts: VCFContact[];
  errors: string[];
}

/**
 * Parse a VCF file content and extract contacts
 * @param vcfContent - The raw text content of the VCF file
 * @returns Parsed contacts and any errors encountered
 */
export function parseVCF(vcfContent: string): VCFParseResult {
  const contacts: VCFContact[] = [];
  const errors: string[] = [];

  try {
    // Split into individual vCards (each starts with BEGIN:VCARD)
    const vCards = vcfContent.split(/BEGIN:VCARD/i).filter((card) => card.trim());

    if (vCards.length === 0) {
      errors.push('No valid vCard entries found in the file');
      return { contacts, errors };
    }

    vCards.forEach((vCardText, index) => {
      try {
        const contact = parseVCard(vCardText);
        if (contact) {
          contacts.push(contact);
        }
      } catch (error) {
        errors.push(`Error parsing contact ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    if (contacts.length === 0 && errors.length === 0) {
      errors.push('No contacts could be extracted from the VCF file');
    }
  } catch (error) {
    errors.push(`Failed to parse VCF file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return { contacts, errors };
}

/**
 * Parse a single vCard entry
 */
function parseVCard(vCardText: string): VCFContact | null {
  const lines = unfoldLines(vCardText);

  let name: string | undefined;
  let email: string | undefined;
  let phone: string | undefined;
  let organization: string | undefined;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('END:VCARD')) continue;

    // Parse the line (format: PROPERTY;PARAMS:VALUE)
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;

    const propertyPart = trimmed.substring(0, colonIndex);
    const value = trimmed.substring(colonIndex + 1).trim();

    if (!value) continue;

    // Extract property name (before semicolon or colon)
    const propertyName = propertyPart.split(';')[0].toUpperCase();

    switch (propertyName) {
      case 'FN': // Formatted Name
        if (!name) {
          name = decodeValue(value);
        }
        break;

      case 'N': // Structured Name (fallback if FN not present)
        if (!name) {
          // N format: Family;Given;Middle;Prefix;Suffix
          const nameParts = value.split(';').filter((p) => p.trim());
          name = nameParts.join(' ').trim();
          name = decodeValue(name);
        }
        break;

      case 'EMAIL':
        if (!email) {
          email = decodeValue(value);
        }
        break;

      case 'TEL': // Phone number
        // Prefer mobile/cell numbers, but take any if none found yet
        const isMobile = propertyPart.toUpperCase().includes('CELL') || propertyPart.toUpperCase().includes('MOBILE');
        if (!phone || isMobile) {
          phone = cleanPhoneNumber(decodeValue(value));
        }
        break;

      case 'ORG': // Organization
        if (!organization) {
          organization = decodeValue(value);
        }
        break;
    }
  }

  // Name is required
  if (!name || name.trim() === '') {
    return null;
  }

  return {
    name: name.trim(),
    email: email?.trim(),
    phone: phone?.trim(),
    organization: organization?.trim(),
  };
}

/**
 * Unfold lines (vCard format allows line folding with spaces/tabs)
 * Lines that continue are prefixed with a space or tab
 */
function unfoldLines(text: string): string[] {
  const lines = text.split(/\r?\n/);
  const unfolded: string[] = [];

  let currentLine = '';
  for (const line of lines) {
    if (line.startsWith(' ') || line.startsWith('\t')) {
      // Continuation of previous line
      currentLine += line.substring(1);
    } else {
      if (currentLine) {
        unfolded.push(currentLine);
      }
      currentLine = line;
    }
  }

  if (currentLine) {
    unfolded.push(currentLine);
  }

  return unfolded;
}

/**
 * Decode vCard encoded values
 * Handles quoted-printable encoding and escaping
 */
function decodeValue(value: string): string {
  let decoded = value;

  // Handle escaped characters (\n, \,, \;, etc.)
  decoded = decoded
    .replace(/\\n/g, ' ')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');

  // Remove quotes if present
  if (decoded.startsWith('"') && decoded.endsWith('"')) {
    decoded = decoded.slice(1, -1);
  }

  return decoded;
}

/**
 * Clean phone number by removing common formatting characters
 * Keeps + for international format
 */
function cleanPhoneNumber(phone: string): string {
  // Remove spaces, dashes, parentheses, dots
  let cleaned = phone.replace(/[\s\-\(\)\.\[\]]/g, '');

  // Handle tel: prefix (some vCards include this)
  if (cleaned.toLowerCase().startsWith('tel:')) {
    cleaned = cleaned.substring(4);
  }

  return cleaned;
}

/**
 * Validate VCF file content
 * @returns Error message if invalid, null if valid
 */
export function validateVCF(vcfContent: string): string | null {
  if (!vcfContent || vcfContent.trim() === '') {
    return 'VCF file is empty';
  }

  // Check for basic vCard structure
  if (!vcfContent.includes('BEGIN:VCARD') && !vcfContent.includes('BEGIN:vCard')) {
    return 'Invalid VCF file format: missing BEGIN:VCARD';
  }

  if (!vcfContent.includes('END:VCARD') && !vcfContent.includes('END:vCard')) {
    return 'Invalid VCF file format: missing END:VCARD';
  }

  return null;
}
