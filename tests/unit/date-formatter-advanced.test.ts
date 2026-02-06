/**
 * Advanced Unit Tests for Date Formatter
 * Tests edge cases, timezone handling, and multi-language date formatting
 */

import { formatDateByLanguage } from '@/lib/date-formatter';

describe('Date Formatter - Advanced', () => {
  describe('Edge Cases', () => {
    it('should format dates at midnight', () => {
      const date = new Date('2024-06-15T00:00:00Z');

      const result = formatDateByLanguage(date, 'en');

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should format dates at end of day', () => {
      const date = new Date('2024-06-15T23:59:59Z');

      const result = formatDateByLanguage(date, 'en');

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should format leap year dates', () => {
      const date = new Date('2024-02-29T12:00:00Z');

      const result = formatDateByLanguage(date, 'en');

      expect(result).toBeDefined();
      expect(result).toContain('29');
      expect(result.toLowerCase()).toMatch(/feb/);
    });

    it('should format New Year dates', () => {
      const date = new Date('2024-01-01T12:00:00Z');

      const result = formatDateByLanguage(date, 'en');

      expect(result).toBeDefined();
      expect(result).toContain('1');
      expect(result.toLowerCase()).toMatch(/jan/);
    });

    it('should format New Year Eve dates', () => {
      const date = new Date('2024-12-31T12:00:00Z');

      const result = formatDateByLanguage(date, 'en');

      expect(result).toBeDefined();
      expect(result).toContain('31');
      expect(result.toLowerCase()).toMatch(/dec/);
    });
  });

  describe('Different Date Formats Across Languages', () => {
    const testDate = new Date('2024-06-15T16:00:00Z');

    it('should produce different formats for different languages', () => {
      const formats = {
        en: formatDateByLanguage(testDate, 'en'),
        es: formatDateByLanguage(testDate, 'es'),
        fr: formatDateByLanguage(testDate, 'fr'),
        it: formatDateByLanguage(testDate, 'it'),
        de: formatDateByLanguage(testDate, 'de'),
      };

      // All should be defined
      Object.values(formats).forEach((format) => {
        expect(format).toBeDefined();
        expect(format.length).toBeGreaterThan(0);
      });

      // Should have at least 2 different formats
      const uniqueFormats = new Set(Object.values(formats));
      expect(uniqueFormats.size).toBeGreaterThanOrEqual(2);
    });

    it('should include year in formatted date', () => {
      const languages: ('en' | 'es' | 'fr' | 'it' | 'de')[] = ['en', 'es', 'fr', 'it', 'de'];

      languages.forEach((lang) => {
        const result = formatDateByLanguage(testDate, lang);
        expect(result).toMatch(/2024/);
      });
    });

    it('should include month in formatted date', () => {
      const languages: ('en' | 'es' | 'fr' | 'it' | 'de')[] = ['en', 'es', 'fr', 'it', 'de'];

      languages.forEach((lang) => {
        const result = formatDateByLanguage(testDate, lang);
        // Should contain either number 6 or month name
        const hasMonth = result.includes('6') ||
                        result.toLowerCase().includes('jun') ||
                        result.toLowerCase().includes('juin') ||
                        result.toLowerCase().includes('giugno');
        expect(hasMonth).toBe(true);
      });
    });

    it('should include day in formatted date', () => {
      const languages: ('en' | 'es' | 'fr' | 'it' | 'de')[] = ['en', 'es', 'fr', 'it', 'de'];

      languages.forEach((lang) => {
        const result = formatDateByLanguage(testDate, lang);
        expect(result).toMatch(/15/);
      });
    });
  });

  describe('Month Names by Language', () => {
    const january = new Date('2024-01-15T12:00:00Z');
    const december = new Date('2024-12-15T12:00:00Z');

    it('should format January correctly in different languages', () => {
      const en = formatDateByLanguage(january, 'en');
      const es = formatDateByLanguage(january, 'es');

      expect(en).toBeDefined();
      expect(es).toBeDefined();
    });

    it('should format December correctly in different languages', () => {
      const en = formatDateByLanguage(december, 'en');
      const de = formatDateByLanguage(december, 'de');

      expect(en).toBeDefined();
      expect(de).toBeDefined();
    });

    it('should handle all months of the year', () => {
      for (let month = 1; month <= 12; month++) {
        const date = new Date(`2024-${month.toString().padStart(2, '0')}-15T12:00:00Z`);
        const result = formatDateByLanguage(date, 'en');

        expect(result).toBeDefined();
        expect(result.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Year Handling', () => {
    it('should format dates in past years', () => {
      const date = new Date('2020-06-15T12:00:00Z');

      const result = formatDateByLanguage(date, 'en');

      expect(result).toContain('2020');
    });

    it('should format dates in future years', () => {
      const date = new Date('2030-06-15T12:00:00Z');

      const result = formatDateByLanguage(date, 'en');

      expect(result).toContain('2030');
    });

    it('should format dates in different centuries', () => {
      const date1900s = new Date('1990-06-15T12:00:00Z');
      const date2000s = new Date('2024-06-15T12:00:00Z');
      const date2100s = new Date('2100-06-15T12:00:00Z');

      const result1900s = formatDateByLanguage(date1900s, 'en');
      const result2000s = formatDateByLanguage(date2000s, 'en');
      const result2100s = formatDateByLanguage(date2100s, 'en');

      expect(result1900s).toContain('1990');
      expect(result2000s).toContain('2024');
      expect(result2100s).toContain('2100');
    });
  });

  describe('Consistency', () => {
    const testDate = new Date('2024-06-15T12:00:00Z');

    it('should return same format for same inputs', () => {
      const result1 = formatDateByLanguage(testDate, 'en');
      const result2 = formatDateByLanguage(testDate, 'en');

      expect(result1).toBe(result2);
    });

    it('should be deterministic across multiple calls', () => {
      const results = Array(5)
        .fill(null)
        .map(() => formatDateByLanguage(testDate, 'es'));

      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBe(1);
    });
  });

  describe('Day of Week Handling', () => {
    it('should handle Mondays', () => {
      const monday = new Date('2024-01-01T12:00:00Z'); // Monday

      const result = formatDateByLanguage(monday, 'en');

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle Sundays', () => {
      const sunday = new Date('2024-01-07T12:00:00Z'); // Sunday

      const result = formatDateByLanguage(sunday, 'en');

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle all days of the week', () => {
      const baseDate = new Date('2024-01-01T12:00:00Z');

      for (let i = 0; i < 7; i++) {
        const date = new Date(baseDate);
        date.setDate(baseDate.getDate() + i);

        const result = formatDateByLanguage(date, 'en');

        expect(result).toBeDefined();
        expect(result.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Date Object Types', () => {
    it('should handle Date objects', () => {
      const date = new Date('2024-06-15T12:00:00Z');

      const result = formatDateByLanguage(date, 'en');

      expect(result).toBeDefined();
    });

    it('should handle Date from ISO string', () => {
      const date = new Date('2024-06-15T12:00:00.000Z');

      const result = formatDateByLanguage(date, 'en');

      expect(result).toBeDefined();
      expect(result).toContain('2024');
    });

    it('should handle Date from timestamp', () => {
      const timestamp = new Date('2024-06-15T12:00:00Z').getTime();
      const date = new Date(timestamp);

      const result = formatDateByLanguage(date, 'en');

      expect(result).toBeDefined();
    });
  });

  describe('Special Wedding Dates', () => {
    it('should format Valentine Day dates', () => {
      const valentines = new Date('2024-02-14T12:00:00Z');

      const result = formatDateByLanguage(valentines, 'en');

      expect(result).toContain('14');
      expect(result.toLowerCase()).toMatch(/feb/);
    });

    it('should format summer wedding dates', () => {
      const summer = new Date('2024-07-20T12:00:00Z');

      const result = formatDateByLanguage(summer, 'en');

      expect(result).toContain('2024');
      expect(result).toContain('20');
    });

    it('should format winter wedding dates', () => {
      const winter = new Date('2024-12-20T12:00:00Z');

      const result = formatDateByLanguage(winter, 'en');

      expect(result).toContain('2024');
      expect(result).toContain('20');
    });

    it('should format spring wedding dates', () => {
      const spring = new Date('2024-04-15T12:00:00Z');

      const result = formatDateByLanguage(spring, 'en');

      expect(result).toContain('2024');
      expect(result).toContain('15');
    });

    it('should format autumn wedding dates', () => {
      const autumn = new Date('2024-10-12T12:00:00Z');

      const result = formatDateByLanguage(autumn, 'en');

      expect(result).toContain('2024');
      expect(result).toContain('12');
    });
  });

  describe('Performance', () => {
    it('should format dates quickly', () => {
      const date = new Date('2024-06-15T12:00:00Z');
      const startTime = performance.now();

      formatDateByLanguage(date, 'en');

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete in less than 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should handle multiple rapid calls efficiently', () => {
      const date = new Date('2024-06-15T12:00:00Z');
      const languages: ('en' | 'es' | 'fr' | 'it' | 'de')[] = ['en', 'es', 'fr', 'it', 'de'];

      const startTime = performance.now();

      languages.forEach((lang) => {
        for (let i = 0; i < 10; i++) {
          formatDateByLanguage(date, lang);
        }
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // 50 calls should complete in less than 500ms
      expect(duration).toBeLessThan(500);
    });
  });
});
