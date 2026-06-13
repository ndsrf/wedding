/**
 * URL utility functions for image processing
 * Kept separate from processor.ts to avoid unnecessary sharp imports
 */

/**
 * Converts a relative or absolute URL to an absolute URL
 * If the URL is already absolute (starts with http:// or https://), returns it as-is
 * Otherwise, prepends the base URL
 *
 * @param url - The URL to convert (can be relative or absolute)
 * @param baseUrl - The base URL to prepend if the URL is relative (default: process.env.APP_URL || 'http://localhost:3000')
 * @returns The absolute URL, or undefined if input is null/undefined
 */
export function toAbsoluteUrl(url: string | null | undefined, baseUrl?: string): string | undefined {
  if (!url) {
    return undefined;
  }

  // If the URL is already absolute, return it as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Otherwise, prepend the base URL
  const base = baseUrl || process.env.APP_URL || 'http://localhost:3000';
  return `${base}${url}`;
}
