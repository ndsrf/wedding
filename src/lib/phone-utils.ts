/**
 * Phone Number Utilities
 *
 * Provides utilities for handling phone numbers including country prefix mapping
 * and automatic prefix addition based on wedding country.
 */

/**
 * Mapping of country codes to phone prefixes
 * Format: country ISO code -> phone prefix (with +)
 */
export const COUNTRY_PHONE_PREFIXES: Record<string, string> = {
  // Europe
  ES: '+34', // Spain
  FR: '+33', // France
  IT: '+39', // Italy
  DE: '+49', // Germany
  GB: '+44', // United Kingdom
  PT: '+351', // Portugal
  NL: '+31', // Netherlands
  BE: '+32', // Belgium
  CH: '+41', // Switzerland
  AT: '+43', // Austria
  SE: '+46', // Sweden
  NO: '+47', // Norway
  DK: '+45', // Denmark
  FI: '+358', // Finland
  IE: '+353', // Ireland
  GR: '+30', // Greece
  PL: '+48', // Poland
  CZ: '+420', // Czech Republic
  HU: '+36', // Hungary
  RO: '+40', // Romania

  // Americas
  US: '+1', // United States
  CA: '+1', // Canada
  MX: '+52', // Mexico
  BR: '+55', // Brazil
  AR: '+54', // Argentina
  CL: '+56', // Chile
  CO: '+57', // Colombia
  PE: '+51', // Peru
  VE: '+58', // Venezuela

  // Asia
  CN: '+86', // China
  JP: '+81', // Japan
  IN: '+91', // India
  KR: '+82', // South Korea
  TH: '+66', // Thailand
  VN: '+84', // Vietnam
  PH: '+63', // Philippines
  ID: '+62', // Indonesia
  MY: '+60', // Malaysia
  SG: '+65', // Singapore

  // Oceania
  AU: '+61', // Australia
  NZ: '+64', // New Zealand

  // Middle East
  AE: '+971', // UAE
  SA: '+966', // Saudi Arabia
  IL: '+972', // Israel
  TR: '+90', // Turkey

  // Africa
  ZA: '+27', // South Africa
  EG: '+20', // Egypt
  MA: '+212', // Morocco
};

/**
 * List of countries for dropdown selection
 * Format: { code: ISO country code, name: Display name, prefix: Phone prefix }
 */
export const COUNTRIES = [
  { code: 'ES', name: 'Spain', prefix: '+34' },
  { code: 'FR', name: 'France', prefix: '+33' },
  { code: 'IT', name: 'Italy', prefix: '+39' },
  { code: 'DE', name: 'Germany', prefix: '+49' },
  { code: 'GB', name: 'United Kingdom', prefix: '+44' },
  { code: 'PT', name: 'Portugal', prefix: '+351' },
  { code: 'NL', name: 'Netherlands', prefix: '+31' },
  { code: 'BE', name: 'Belgium', prefix: '+32' },
  { code: 'CH', name: 'Switzerland', prefix: '+41' },
  { code: 'AT', name: 'Austria', prefix: '+43' },
  { code: 'SE', name: 'Sweden', prefix: '+46' },
  { code: 'NO', name: 'Norway', prefix: '+47' },
  { code: 'DK', name: 'Denmark', prefix: '+45' },
  { code: 'FI', name: 'Finland', prefix: '+358' },
  { code: 'IE', name: 'Ireland', prefix: '+353' },
  { code: 'GR', name: 'Greece', prefix: '+30' },
  { code: 'PL', name: 'Poland', prefix: '+48' },
  { code: 'CZ', name: 'Czech Republic', prefix: '+420' },
  { code: 'HU', name: 'Hungary', prefix: '+36' },
  { code: 'RO', name: 'Romania', prefix: '+40' },
  { code: 'US', name: 'United States', prefix: '+1' },
  { code: 'CA', name: 'Canada', prefix: '+1' },
  { code: 'MX', name: 'Mexico', prefix: '+52' },
  { code: 'BR', name: 'Brazil', prefix: '+55' },
  { code: 'AR', name: 'Argentina', prefix: '+54' },
  { code: 'CL', name: 'Chile', prefix: '+56' },
  { code: 'CO', name: 'Colombia', prefix: '+57' },
  { code: 'PE', name: 'Peru', prefix: '+51' },
  { code: 'VE', name: 'Venezuela', prefix: '+58' },
  { code: 'CN', name: 'China', prefix: '+86' },
  { code: 'JP', name: 'Japan', prefix: '+81' },
  { code: 'IN', name: 'India', prefix: '+91' },
  { code: 'KR', name: 'South Korea', prefix: '+82' },
  { code: 'TH', name: 'Thailand', prefix: '+66' },
  { code: 'VN', name: 'Vietnam', prefix: '+84' },
  { code: 'PH', name: 'Philippines', prefix: '+63' },
  { code: 'ID', name: 'Indonesia', prefix: '+62' },
  { code: 'MY', name: 'Malaysia', prefix: '+60' },
  { code: 'SG', name: 'Singapore', prefix: '+65' },
  { code: 'AU', name: 'Australia', prefix: '+61' },
  { code: 'NZ', name: 'New Zealand', prefix: '+64' },
  { code: 'AE', name: 'United Arab Emirates', prefix: '+971' },
  { code: 'SA', name: 'Saudi Arabia', prefix: '+966' },
  { code: 'IL', name: 'Israel', prefix: '+972' },
  { code: 'TR', name: 'Turkey', prefix: '+90' },
  { code: 'ZA', name: 'South Africa', prefix: '+27' },
  { code: 'EG', name: 'Egypt', prefix: '+20' },
  { code: 'MA', name: 'Morocco', prefix: '+212' },
].sort((a, b) => a.name.localeCompare(b.name));

/**
 * Check if a phone number already has a country prefix
 */
export function hasCountryPrefix(phone: string | null | undefined): boolean {
  if (!phone) return false;

  const trimmed = phone.trim();
  return trimmed.startsWith('+');
}

/**
 * Add country prefix to a phone number if it doesn't already have one
 * @param phone - The phone number to process
 * @param countryCode - The ISO country code (e.g., 'ES', 'US')
 * @returns The phone number with country prefix, or null if phone is empty
 */
export function addCountryPrefix(
  phone: string | null | undefined,
  countryCode: string | null | undefined
): string | null {
  // Return null if phone is empty
  if (!phone || phone.trim() === '') {
    return null;
  }

  const trimmedPhone = phone.trim();

  // If already has prefix, return as is
  if (hasCountryPrefix(trimmedPhone)) {
    return trimmedPhone;
  }

  // If no country code provided, return phone as is
  if (!countryCode) {
    return trimmedPhone;
  }

  // Get prefix for country
  const prefix = COUNTRY_PHONE_PREFIXES[countryCode];
  if (!prefix) {
    return trimmedPhone;
  }

  // Remove any leading zeros or spaces
  const cleanPhone = trimmedPhone.replace(/^0+/, '').replace(/\s+/g, '');

  // Add prefix
  return `${prefix}${cleanPhone}`;
}

/**
 * Normalize phone number by removing spaces, dashes, and parentheses
 * Keeps the + prefix if present
 */
export function normalizePhoneNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;

  const trimmed = phone.trim();
  if (trimmed === '') return null;

  // Keep + at the beginning, remove all other non-digit characters
  if (trimmed.startsWith('+')) {
    return '+' + trimmed.slice(1).replace(/\D/g, '');
  }

  return trimmed.replace(/\D/g, '');
}

/**
 * Process phone number: normalize it and add country prefix if needed
 * This is the main function to use when saving phone numbers
 */
export function processPhoneNumber(
  phone: string | null | undefined,
  countryCode: string | null | undefined
): string | null {
  const normalized = normalizePhoneNumber(phone);
  return addCountryPrefix(normalized, countryCode);
}
