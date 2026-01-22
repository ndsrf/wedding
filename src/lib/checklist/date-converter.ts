/**
 * Date Converter Service for Checklist Feature
 *
 * Handles conversion between relative date formats (e.g., "WEDDING_DATE-90")
 * and absolute dates based on a wedding date.
 *
 * All functions are pure with no side effects.
 */

export type RelativeDateFormat =
  | `WEDDING_DATE${'+' | '-'}${number}` // e.g., "WEDDING_DATE-90", "WEDDING_DATE+7"
  | 'WEDDING_DATE';

/**
 * Parses a relative date string and extracts the day offset
 *
 * @param relativeDate - String in format "WEDDING_DATE", "WEDDING_DATE+N", or "WEDDING_DATE-N"
 * @returns Object with offset in days, or null if invalid format
 *
 * @example
 * parseRelativeDate("WEDDING_DATE-90") // { offset: -90 }
 * parseRelativeDate("WEDDING_DATE+7")  // { offset: 7 }
 * parseRelativeDate("WEDDING_DATE")    // { offset: 0 }
 * parseRelativeDate("invalid")         // null
 */
export function parseRelativeDate(relativeDate: string): { offset: number } | null {
  if (!relativeDate || typeof relativeDate !== 'string') {
    return null;
  }

  const trimmed = relativeDate.trim();

  // Handle exact wedding date
  if (trimmed === 'WEDDING_DATE') {
    return { offset: 0 };
  }

  // Match pattern: WEDDING_DATE followed by + or - and a number
  const regex = /^WEDDING_DATE([+-])(\d+)$/;
  const match = trimmed.match(regex);

  if (!match) {
    return null;
  }

  const sign = match[1];
  const days = parseInt(match[2], 10);

  // Validate that the number is valid
  if (isNaN(days)) {
    return null;
  }

  const offset = sign === '+' ? days : -days;
  return { offset };
}

/**
 * Converts a relative date to an absolute date based on wedding date
 *
 * @param relativeDate - Relative date string (e.g., "WEDDING_DATE-90")
 * @param weddingDate - The wedding date to calculate from
 * @returns Absolute date calculated from wedding date and offset
 * @throws Error if relative date format is invalid or wedding date is invalid
 *
 * @example
 * convertRelativeDateToAbsolute("WEDDING_DATE-90", new Date("2026-06-15"))
 * // Returns: new Date("2026-03-17")
 */
export function convertRelativeDateToAbsolute(
  relativeDate: RelativeDateFormat,
  weddingDate: Date
): Date {
  // Validate wedding date
  if (!(weddingDate instanceof Date) || isNaN(weddingDate.getTime())) {
    throw new Error('Invalid wedding date provided');
  }

  // Parse the relative date
  const parsed = parseRelativeDate(relativeDate);
  if (parsed === null) {
    throw new Error(`Invalid relative date format: ${relativeDate}`);
  }

  // Create new date object to avoid mutating input
  const result = new Date(weddingDate);

  // Add/subtract days using setDate which handles month/year boundaries automatically
  result.setDate(result.getDate() + parsed.offset);

  return result;
}

/**
 * Converts an absolute date to a relative date format based on wedding date
 *
 * @param absoluteDate - The absolute date to convert
 * @param weddingDate - The wedding date to calculate offset from
 * @returns Relative date string (e.g., "WEDDING_DATE-90")
 * @throws Error if either date is invalid
 *
 * @example
 * convertAbsoluteDateToRelative(new Date("2026-03-17"), new Date("2026-06-15"))
 * // Returns: "WEDDING_DATE-90"
 */
export function convertAbsoluteDateToRelative(
  absoluteDate: Date,
  weddingDate: Date
): RelativeDateFormat {
  // Validate both dates
  if (!(absoluteDate instanceof Date) || isNaN(absoluteDate.getTime())) {
    throw new Error('Invalid absolute date provided');
  }
  if (!(weddingDate instanceof Date) || isNaN(weddingDate.getTime())) {
    throw new Error('Invalid wedding date provided');
  }

  // Calculate difference in milliseconds
  const diffMs = absoluteDate.getTime() - weddingDate.getTime();

  // Convert to days (rounded to nearest day to handle timezone/DST issues)
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  // Format based on offset
  if (diffDays === 0) {
    return 'WEDDING_DATE';
  } else if (diffDays > 0) {
    return `WEDDING_DATE+${diffDays}` as RelativeDateFormat;
  } else {
    return `WEDDING_DATE${diffDays}` as RelativeDateFormat; // diffDays is already negative
  }
}

/**
 * Validates whether a string matches the relative date format
 *
 * @param value - String to validate
 * @returns true if valid relative date format, false otherwise
 *
 * @example
 * isValidRelativeDateFormat("WEDDING_DATE-90")  // true
 * isValidRelativeDateFormat("WEDDING_DATE+7")   // true
 * isValidRelativeDateFormat("WEDDING_DATE")     // true
 * isValidRelativeDateFormat("invalid")          // false
 * isValidRelativeDateFormat("WEDDING_DATE-")    // false
 * isValidRelativeDateFormat("WEDDING_DATE-ABC") // false
 */
export function isValidRelativeDateFormat(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }

  const parsed = parseRelativeDate(value);
  return parsed !== null;
}
