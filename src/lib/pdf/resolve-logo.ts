import path from 'path';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

/**
 * Resolves a logo URL to a base64 data URI so that @react-pdf/renderer can
 * embed it without making any runtime HTTP requests.
 *
 * - Relative URLs (e.g. "/company-profile/xxx/logo.png") are read directly
 *   from the local public directory — this is the filesystem storage path.
 * - Absolute https:// URLs (Vercel Blob, S3, …) are fetched and converted.
 * - Returns undefined if the logo cannot be loaded, so the PDF falls back to
 *   the brand-name text gracefully.
 */
export async function resolveLogoDataUri(
  logoUrl: string | null | undefined,
): Promise<string | undefined> {
  if (!logoUrl) return undefined;

  try {
    let buffer: Buffer;
    let mimeType = 'image/png';

    if (logoUrl.startsWith('http://') || logoUrl.startsWith('https://')) {
      // Remote URL — fetch the image bytes
      const response = await fetch(logoUrl, { cache: 'no-store' });
      if (!response.ok) return undefined;
      const contentType = response.headers.get('content-type');
      if (contentType) mimeType = contentType.split(';')[0].trim();
      buffer = Buffer.from(await response.arrayBuffer());
    } else {
      // Relative path — read from the local filesystem (public directory)
      const filePath = path.join(process.cwd(), 'public', logoUrl);
      if (!existsSync(filePath)) return undefined;
      buffer = await readFile(filePath);
      // Infer MIME type from extension
      const ext = path.extname(logoUrl).toLowerCase();
      if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
      else if (ext === '.webp') mimeType = 'image/webp';
      else if (ext === '.gif') mimeType = 'image/gif';
    }

    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  } catch {
    return undefined;
  }
}
