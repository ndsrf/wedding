/**
 * Unit Tests - Climate / WMO Code Parsing
 *
 * Tests wmoToCondition from src/lib/astro-weather/climate.ts and
 * extractCoordsFromGoogleMapsUrl from src/lib/astro-weather/geocoding.ts.
 */

import { wmoToCondition } from '@/lib/astro-weather/climate';
import { extractCoordsFromGoogleMapsUrl } from '@/lib/astro-weather/geocoding';

// ── wmoToCondition ────────────────────────────────────────────────────────────

describe('wmoToCondition', () => {
  it('maps code 0 to sunny', () => {
    const { condition, emoji } = wmoToCondition(0);
    expect(condition).toBe('sunny');
    expect(emoji).toBe('☀️');
  });

  it('maps codes 1–3 to partlyCloudy', () => {
    [1, 2, 3].forEach((code) => {
      expect(wmoToCondition(code).condition).toBe('partlyCloudy');
    });
  });

  it('maps fog codes (45, 48) to foggy', () => {
    [45, 48].forEach((code) => {
      expect(wmoToCondition(code).condition).toBe('foggy');
    });
  });

  it('maps drizzle codes (51–57) to drizzle', () => {
    [51, 53, 55, 56, 57].forEach((code) => {
      expect(wmoToCondition(code).condition).toBe('drizzle');
    });
  });

  it('maps rain codes (61–69) to rainy', () => {
    [61, 63, 65, 66, 67].forEach((code) => {
      expect(wmoToCondition(code).condition).toBe('rainy');
    });
  });

  it('maps snow codes (71–79) to snowy', () => {
    [71, 73, 75, 77].forEach((code) => {
      expect(wmoToCondition(code).condition).toBe('snowy');
    });
  });

  it('maps shower codes (80–82) to rainy', () => {
    [80, 81, 82].forEach((code) => {
      expect(wmoToCondition(code).condition).toBe('rainy');
    });
  });

  it('maps thunderstorm codes (95–99) to stormy', () => {
    [95, 96, 99].forEach((code) => {
      expect(wmoToCondition(code).condition).toBe('stormy');
    });
  });

  it('always returns a non-empty emoji', () => {
    const codes = [0, 1, 3, 45, 51, 61, 71, 80, 95];
    codes.forEach((code) => {
      const { emoji } = wmoToCondition(code);
      expect(emoji.length).toBeGreaterThan(0);
    });
  });
});

// ── extractCoordsFromGoogleMapsUrl ────────────────────────────────────────────

describe('extractCoordsFromGoogleMapsUrl', () => {
  it('extracts coordinates from @lat,lon format', () => {
    const url = 'https://www.google.com/maps/place/Madrid/@40.4168,-3.7038,15z';
    const coords = extractCoordsFromGoogleMapsUrl(url);
    expect(coords).not.toBeNull();
    expect(coords!.lat).toBeCloseTo(40.4168, 3);
    expect(coords!.lon).toBeCloseTo(-3.7038, 3);
  });

  it('extracts coordinates from ?q=lat,lon format', () => {
    const url = 'https://maps.google.com/?q=48.8566,2.3522';
    const coords = extractCoordsFromGoogleMapsUrl(url);
    expect(coords).not.toBeNull();
    expect(coords!.lat).toBeCloseTo(48.8566, 3);
    expect(coords!.lon).toBeCloseTo(2.3522, 3);
  });

  it('extracts coordinates from ?ll=lat,lon format', () => {
    const url = 'https://maps.google.com/?ll=51.5074,-0.1278&z=12';
    const coords = extractCoordsFromGoogleMapsUrl(url);
    expect(coords).not.toBeNull();
    expect(coords!.lat).toBeCloseTo(51.5074, 3);
    expect(coords!.lon).toBeCloseTo(-0.1278, 3);
  });

  it('handles negative coordinates (southern/western hemispheres)', () => {
    const url = 'https://www.google.com/maps/place/Buenos+Aires/@-34.6037,-58.3816,12z';
    const coords = extractCoordsFromGoogleMapsUrl(url);
    expect(coords).not.toBeNull();
    expect(coords!.lat).toBeLessThan(0);
    expect(coords!.lon).toBeLessThan(0);
  });

  it('returns null for a URL with no coordinates', () => {
    const url = 'https://www.google.com/maps/place/SomePlace/';
    expect(extractCoordsFromGoogleMapsUrl(url)).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(extractCoordsFromGoogleMapsUrl('')).toBeNull();
  });

  it('returns null for a non-Google-Maps URL', () => {
    expect(extractCoordsFromGoogleMapsUrl('https://example.com/page?q=hello')).toBeNull();
  });

  it('prioritises @lat,lon over ?q= when both are present', () => {
    // Unusual but valid: @-format takes priority (first regex wins)
    const url = 'https://www.google.com/maps/place/Foo/@10.0,20.0,15z?q=99.0,99.0';
    const coords = extractCoordsFromGoogleMapsUrl(url);
    expect(coords!.lat).toBeCloseTo(10.0, 1);
    expect(coords!.lon).toBeCloseTo(20.0, 1);
  });
});
