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

    // Detect QUOTED-PRINTABLE encoding (vCard 2.1 style)
    const upperPropertyPart = propertyPart.toUpperCase();
    const isQuotedPrintable = upperPropertyPart.includes('QUOTED-PRINTABLE');

    // Choose the right decoder for this property's value
    const decode = (v: string) =>
      isQuotedPrintable ? decodeQuotedPrintable(v) : decodeValue(v);

    switch (propertyName) {
      case 'FN': // Formatted Name
        if (!name) {
          name = decode(value);
        }
        break;

      case 'N': // Structured Name (fallback if FN not present)
        if (!name) {
          // N format: Family;Given;Middle;Prefix;Suffix
          // Decode first so that encoded semicolons are handled correctly
          const decodedN = decode(value);
          const nameParts = decodedN.split(';').filter((p) => p.trim());
          name = nameParts.join(' ').trim();
        }
        break;

      case 'EMAIL':
        if (!email) {
          email = decode(value);
        }
        break;

      case 'TEL': // Phone number
        // Prefer mobile/cell numbers, but take any if none found yet
        const isMobile = upperPropertyPart.includes('CELL') || upperPropertyPart.includes('MOBILE');
        if (!phone || isMobile) {
          phone = cleanPhoneNumber(decode(value));
        }
        break;

      case 'ORG': // Organization
        if (!organization) {
          organization = decode(value);
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
 * Lines that continue are prefixed with a space or tab.
 * Also handles QUOTED-PRINTABLE soft line breaks: a line ending with `=`
 * means the QP value continues on the next line without a leading space
 * (vCard 2.1 spec, section 2.1.3).
 */
function unfoldLines(text: string): string[] {
  const lines = text.split(/\r?\n/);
  const unfolded: string[] = [];

  let currentLine = '';
  for (const line of lines) {
    if (line.startsWith(' ') || line.startsWith('\t')) {
      // vCard line folding: continuation of previous line
      currentLine += line.substring(1);
    } else if (currentLine.endsWith('=')) {
      // QUOTED-PRINTABLE soft line break: strip the trailing `=` and append
      // the next line directly (no leading space in vCard 2.1 QP continuations)
      currentLine = currentLine.slice(0, -1) + line;
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
 * Decode QUOTED-PRINTABLE encoded vCard values (common in vCard 2.1).
 * Groups consecutive =XX sequences and decodes them as UTF-8 bytes so that
 * multi-byte characters (e.g. accented letters, emoji) are reconstructed
 * correctly.
 */
function decodeQuotedPrintable(value: string): string {
  // Collect runs of consecutive =XX tokens and decode them as UTF-8 together
  // so that multi-byte sequences like =C3=AD (í in UTF-8) are handled correctly.
  return value.replace(/((?:=[0-9A-Fa-f]{2})+)/g, (match) => {
    const bytes = match.match(/=[0-9A-Fa-f]{2}/g)!.map((m) => parseInt(m.slice(1), 16));
    try {
      return Buffer.from(bytes).toString('utf-8');
    } catch {
      // Fallback: return raw characters if UTF-8 decode fails
      return bytes.map((b) => String.fromCharCode(b)).join('');
    }
  });
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
