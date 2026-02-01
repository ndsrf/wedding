/**
 * Unit Tests - Date Converter
 *
 * Tests for checklist date converter functions
 */

import {
  parseRelativeDate,
  convertRelativeDateToAbsolute,
  convertAbsoluteDateToRelative,
  isValidRelativeDateFormat,
  type RelativeDateFormat,
} from '@/lib/checklist/date-converter';

describe('Date Converter - parseRelativeDate', () => {
  it('should parse WEDDING_DATE with zero offset', () => {
    const result = parseRelativeDate('WEDDING_DATE');
    expect(result).toEqual({ offset: 0 });
  });

  it('should parse WEDDING_DATE with negative offset', () => {
    const result = parseRelativeDate('WEDDING_DATE-90');
    expect(result).toEqual({ offset: -90 });

    const result2 = parseRelativeDate('WEDDING_DATE-7');
    expect(result2).toEqual({ offset: -7 });
  });

  it('should parse WEDDING_DATE with positive offset', () => {
    const result = parseRelativeDate('WEDDING_DATE+30');
    expect(result).toEqual({ offset: 30 });

    const result2 = parseRelativeDate('WEDDING_DATE+365');
    expect(result2).toEqual({ offset: 365 });
  });

  it('should return null for invalid formats', () => {
    expect(parseRelativeDate('invalid')).toBeNull();
    expect(parseRelativeDate('WEDDING_DATE-')).toBeNull();
    expect(parseRelativeDate('WEDDING_DATE+')).toBeNull();
    expect(parseRelativeDate('WEDDING_DATE-ABC')).toBeNull();
    expect(parseRelativeDate('WEDDING_DATE+XYZ')).toBeNull();
    expect(parseRelativeDate('')).toBeNull();
  });

  it('should handle whitespace', () => {
    const result = parseRelativeDate('  WEDDING_DATE-90  ');
    expect(result).toEqual({ offset: -90 });
  });

  it('should return null for non-string inputs', () => {
    expect(parseRelativeDate(null as any)).toBeNull();
    expect(parseRelativeDate(undefined as any)).toBeNull();
    expect(parseRelativeDate(123 as any)).toBeNull();
  });
});

describe('Date Converter - convertRelativeDateToAbsolute', () => {
  it('should convert WEDDING_DATE to wedding date', () => {
    const weddingDate = new Date('2026-06-15T00:00:00.000Z');
    const result = convertRelativeDateToAbsolute('WEDDING_DATE', weddingDate);

    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(5); // June (0-indexed)
    expect(result.getDate()).toBe(15);
  });

  it('should convert negative offsets (days before wedding)', () => {
    const weddingDate = new Date('2026-06-15T00:00:00.000Z');
    const result = convertRelativeDateToAbsolute('WEDDING_DATE-90', weddingDate);

    // 90 days before June 15, 2026 is March 17, 2026
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(2); // March (0-indexed)
    expect(result.getDate()).toBe(17);
  });

  it('should convert positive offsets (days after wedding)', () => {
    const weddingDate = new Date('2026-06-15T00:00:00.000Z');
    const result = convertRelativeDateToAbsolute('WEDDING_DATE+7', weddingDate);

    // 7 days after June 15, 2026 is June 22, 2026
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(5); // June (0-indexed)
    expect(result.getDate()).toBe(22);
  });

  it('should handle month boundaries correctly', () => {
    const weddingDate = new Date('2026-07-05T00:00:00.000Z');
    const result = convertRelativeDateToAbsolute('WEDDING_DATE-10', weddingDate);

    // 10 days before July 5 is June 25
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(5); // June (0-indexed)
    expect(result.getDate()).toBe(25);
  });

  it('should handle year boundaries correctly', () => {
    const weddingDate = new Date('2026-01-05T00:00:00.000Z');
    const result = convertRelativeDateToAbsolute('WEDDING_DATE-10', weddingDate);

    // 10 days before January 5, 2026 is December 26, 2025
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(11); // December (0-indexed)
    expect(result.getDate()).toBe(26);
  });

  it('should throw error for invalid relative date format', () => {
    const weddingDate = new Date('2026-06-15T00:00:00.000Z');

    expect(() => {
      convertRelativeDateToAbsolute('invalid' as RelativeDateFormat, weddingDate);
    }).toThrow('Invalid relative date format: invalid');
  });

  it('should throw error for invalid wedding date', () => {
    const invalidDate = new Date('invalid');

    expect(() => {
      convertRelativeDateToAbsolute('WEDDING_DATE-90', invalidDate);
    }).toThrow('Invalid wedding date provided');
  });

  it('should not mutate the input wedding date', () => {
    const weddingDate = new Date('2026-06-15T00:00:00.000Z');
    const originalTime = weddingDate.getTime();

    convertRelativeDateToAbsolute('WEDDING_DATE-90', weddingDate);

    expect(weddingDate.getTime()).toBe(originalTime);
  });
});

describe('Date Converter - convertAbsoluteDateToRelative', () => {
  it('should convert wedding date to WEDDING_DATE', () => {
    const weddingDate = new Date('2026-06-15T00:00:00.000Z');
    const absoluteDate = new Date('2026-06-15T00:00:00.000Z');

    const result = convertAbsoluteDateToRelative(absoluteDate, weddingDate);
    expect(result).toBe('WEDDING_DATE');
  });

  it('should convert dates before wedding to negative offset', () => {
    const weddingDate = new Date('2026-06-15T00:00:00.000Z');
    const absoluteDate = new Date('2026-03-17T00:00:00.000Z'); // 90 days before

    const result = convertAbsoluteDateToRelative(absoluteDate, weddingDate);
    expect(result).toBe('WEDDING_DATE-90');
  });

  it('should convert dates after wedding to positive offset', () => {
    const weddingDate = new Date('2026-06-15T00:00:00.000Z');
    const absoluteDate = new Date('2026-06-22T00:00:00.000Z'); // 7 days after

    const result = convertAbsoluteDateToRelative(absoluteDate, weddingDate);
    expect(result).toBe('WEDDING_DATE+7');
  });

  it('should handle different time zones correctly', () => {
    const weddingDate = new Date('2026-06-15T12:00:00.000Z');
    const absoluteDate = new Date('2026-06-16T12:00:00.000Z'); // 1 day after

    const result = convertAbsoluteDateToRelative(absoluteDate, weddingDate);
    expect(result).toBe('WEDDING_DATE+1');
  });

  it('should throw error for invalid absolute date', () => {
    const weddingDate = new Date('2026-06-15T00:00:00.000Z');
    const invalidDate = new Date('invalid');

    expect(() => {
      convertAbsoluteDateToRelative(invalidDate, weddingDate);
    }).toThrow('Invalid absolute date provided');
  });

  it('should throw error for invalid wedding date', () => {
    const absoluteDate = new Date('2026-06-15T00:00:00.000Z');
    const invalidDate = new Date('invalid');

    expect(() => {
      convertAbsoluteDateToRelative(absoluteDate, invalidDate);
    }).toThrow('Invalid wedding date provided');
  });
});

describe('Date Converter - isValidRelativeDateFormat', () => {
  it('should return true for valid formats', () => {
    expect(isValidRelativeDateFormat('WEDDING_DATE')).toBe(true);
    expect(isValidRelativeDateFormat('WEDDING_DATE-90')).toBe(true);
    expect(isValidRelativeDateFormat('WEDDING_DATE+7')).toBe(true);
    expect(isValidRelativeDateFormat('WEDDING_DATE-365')).toBe(true);
    expect(isValidRelativeDateFormat('WEDDING_DATE+100')).toBe(true);
  });

  it('should return false for invalid formats', () => {
    expect(isValidRelativeDateFormat('invalid')).toBe(false);
    expect(isValidRelativeDateFormat('WEDDING_DATE-')).toBe(false);
    expect(isValidRelativeDateFormat('WEDDING_DATE+')).toBe(false);
    expect(isValidRelativeDateFormat('WEDDING_DATE-ABC')).toBe(false);
    expect(isValidRelativeDateFormat('WEDDING_DATE+XYZ')).toBe(false);
    expect(isValidRelativeDateFormat('')).toBe(false);
  });

  it('should return false for non-string inputs', () => {
    expect(isValidRelativeDateFormat(null as any)).toBe(false);
    expect(isValidRelativeDateFormat(undefined as any)).toBe(false);
    expect(isValidRelativeDateFormat(123 as any)).toBe(false);
  });
});

describe('Date Converter - Round-trip conversion', () => {
  it('should correctly convert relative -> absolute -> relative', () => {
    const weddingDate = new Date('2026-06-15T00:00:00.000Z');
    const relativeDate: RelativeDateFormat = 'WEDDING_DATE-90';

    const absoluteDate = convertRelativeDateToAbsolute(relativeDate, weddingDate);
    const backToRelative = convertAbsoluteDateToRelative(absoluteDate, weddingDate);

    expect(backToRelative).toBe(relativeDate);
  });

  it('should correctly convert absolute -> relative -> absolute', () => {
    const weddingDate = new Date('2026-06-15T00:00:00.000Z');
    const absoluteDate = new Date('2026-03-17T00:00:00.000Z');

    const relativeDate = convertAbsoluteDateToRelative(absoluteDate, weddingDate);
    const backToAbsolute = convertRelativeDateToAbsolute(relativeDate, weddingDate);

    expect(backToAbsolute.getFullYear()).toBe(absoluteDate.getFullYear());
    expect(backToAbsolute.getMonth()).toBe(absoluteDate.getMonth());
    expect(backToAbsolute.getDate()).toBe(absoluteDate.getDate());
  });
});
