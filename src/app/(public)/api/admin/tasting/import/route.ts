/**
 * Admin Tasting Menu Import API
 * POST /api/admin/tasting/import
 *
 * Accepts a PDF or image file and uses AI vision to extract the menu structure.
 * Returns sections and dishes — does NOT persist anything.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { parseMenuFromFile } from '@/lib/ai/menu-parser';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export async function POST(request: NextRequest) {
  const user = await requireRole('wedding_admin');
  if (!user.wedding_id) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN' } }, { status: 403 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid form data' } }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ success: false, error: { code: 'BAD_REQUEST', message: 'No file provided' } }, { status: 400 });
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json(
      { success: false, error: { code: 'UNSUPPORTED_FILE_TYPE', message: `Unsupported file type: ${file.type}` } },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { success: false, error: { code: 'FILE_TOO_LARGE', message: 'File exceeds 20 MB limit' } },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const parsed = await parseMenuFromFile(buffer, file.type);

  if (!parsed) {
    return NextResponse.json(
      { success: false, error: { code: 'PARSE_FAILED', message: 'Could not extract menu structure from file' } },
      { status: 422 }
    );
  }

  return NextResponse.json({ success: true, data: parsed });
}
