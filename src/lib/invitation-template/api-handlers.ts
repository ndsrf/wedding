/**
 * Shared Invitation Template API Handlers
 *
 * Business logic for all invitation-template operations, shared between the
 * admin (/api/admin/invitation-template/...) and planner
 * (/api/planner/weddings/[id]/invitation-template/...) routes.
 *
 * Each handler accepts a resolved `weddingId: string`. The route files are
 * responsible for auth and access-control only; they delegate all DB work here.
 *
 * See CONSOLIDATION_PLAN.md for the full consolidation strategy.
 */

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/db/prisma';
import { getAllSystemSeeds } from '@/lib/invitation-template/seeds';
import { invalidateWeddingPageCache } from '@/lib/cache/rsvp-page';
import { revalidateWeddingRSVPPages } from '@/lib/cache/revalidate-rsvp';
import { exportInvitationTemplate, importInvitationTemplate } from '@/lib/invitation-template/export-import';
import { processTemplateImage, isValidImageType } from '@/lib/images/processor';
import { uploadFile, isUsingBlobStorage } from '@/lib/storage';
import { list } from '@vercel/blob';
import { Prisma } from '@prisma/client';
import type { TemplateDesign } from '@/types/invitation-template';
import type { ImageFile } from '@/types/invitation-template';

// ============================================================================
// LIST — GET /invitation-template
// ============================================================================

export async function listInvitationTemplatesHandler(weddingId: string): Promise<NextResponse> {
  const systemSeeds = getAllSystemSeeds();

  const userTemplates = await prisma.invitationTemplate.findMany({
    where: { wedding_id: weddingId },
    orderBy: { created_at: 'desc' },
  });

  return NextResponse.json({ systemSeeds, userTemplates });
}

// ============================================================================
// CREATE — POST /invitation-template
// ============================================================================

export async function createInvitationTemplateHandler(
  weddingId: string,
  body: unknown,
): Promise<NextResponse> {
  const { name, design, based_on_preset } = body as Record<string, unknown>;

  if (!name || typeof name !== 'string' || (name as string).trim().length === 0) {
    return NextResponse.json(
      { error: 'Template name is required and must be a non-empty string' },
      { status: 400 },
    );
  }

  if (!design || typeof design !== 'object') {
    return NextResponse.json({ error: 'Template design is required' }, { status: 400 });
  }

  const d = design as Record<string, unknown>;
  if (!d.globalStyle || !Array.isArray(d.blocks)) {
    return NextResponse.json(
      { error: 'Design must have globalStyle and blocks array' },
      { status: 400 },
    );
  }

  let pre_rendered_html = null;
  try {
    const { preRenderTemplate } = await import('@/lib/invitation-template/pre-renderer');
    pre_rendered_html = preRenderTemplate(design as TemplateDesign);
  } catch (err) {
    console.error('Failed to pre-render template:', err);
  }

  const template = await prisma.invitationTemplate.create({
    data: {
      wedding_id: weddingId,
      name: (name as string).trim(),
      design: design as unknown as Prisma.InputJsonValue,
      pre_rendered_html: pre_rendered_html as unknown as Prisma.InputJsonValue,
      based_on_preset: (based_on_preset as string | null) || null,
      is_system_template: false,
    },
  });

  invalidateWeddingPageCache(weddingId);
  void revalidateWeddingRSVPPages(weddingId);

  return NextResponse.json(template, { status: 201 });
}

// ============================================================================
// GET ONE — GET /invitation-template/[id]
// ============================================================================

export async function getInvitationTemplateHandler(
  weddingId: string,
  templateId: string,
): Promise<NextResponse> {
  const template = await prisma.invitationTemplate.findUnique({ where: { id: templateId } });

  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  if (template.wedding_id !== weddingId) {
    return NextResponse.json(
      { error: 'Forbidden: Template does not belong to this wedding' },
      { status: 403 },
    );
  }

  return NextResponse.json(template);
}

// ============================================================================
// UPDATE — PUT /invitation-template/[id]
// ============================================================================

export async function updateInvitationTemplateHandler(
  weddingId: string,
  templateId: string,
  body: unknown,
): Promise<NextResponse> {
  const existing = await prisma.invitationTemplate.findUnique({ where: { id: templateId } });

  if (!existing) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  if (existing.wedding_id !== weddingId) {
    return NextResponse.json(
      { error: 'Forbidden: Template does not belong to this wedding' },
      { status: 403 },
    );
  }

  const { name, design } = body as Record<string, unknown>;
  const updateData: Prisma.InvitationTemplateUpdateInput = {};

  if (name !== undefined) {
    if (typeof name !== 'string' || (name as string).trim().length === 0) {
      return NextResponse.json(
        { error: 'Template name must be a non-empty string' },
        { status: 400 },
      );
    }
    updateData.name = (name as string).trim();
  }

  if (design !== undefined) {
    const d = design as Record<string, unknown>;
    if (typeof design !== 'object' || !d.globalStyle || !Array.isArray(d.blocks)) {
      return NextResponse.json(
        { error: 'Design must have globalStyle and blocks array' },
        { status: 400 },
      );
    }
    updateData.design = design as unknown as Prisma.InputJsonValue;

    try {
      const { preRenderTemplate } = await import('@/lib/invitation-template/pre-renderer');
      updateData.pre_rendered_html = preRenderTemplate(
        design as TemplateDesign,
      ) as unknown as Prisma.InputJsonValue;
    } catch (err) {
      console.error('Failed to pre-render template during update:', err);
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const updated = await prisma.invitationTemplate.update({
    where: { id: templateId },
    data: updateData,
  });

  invalidateWeddingPageCache(weddingId);
  void revalidateWeddingRSVPPages(weddingId);

  return NextResponse.json(updated);
}

// ============================================================================
// DELETE — DELETE /invitation-template/[id]
// ============================================================================

export async function deleteInvitationTemplateHandler(
  weddingId: string,
  templateId: string,
): Promise<NextResponse> {
  const template = await prisma.invitationTemplate.findUnique({ where: { id: templateId } });

  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  if (template.wedding_id !== weddingId) {
    return NextResponse.json(
      { error: 'Forbidden: Template does not belong to this wedding' },
      { status: 403 },
    );
  }

  await prisma.invitationTemplate.delete({ where: { id: templateId } });

  invalidateWeddingPageCache(weddingId);
  void revalidateWeddingRSVPPages(weddingId);

  return NextResponse.json({ success: true }, { status: 200 });
}

// ============================================================================
// DUPLICATE — POST /invitation-template/[id]/duplicate
// ============================================================================

export async function duplicateInvitationTemplateHandler(
  weddingId: string,
  templateId: string,
): Promise<NextResponse> {
  const template = await prisma.invitationTemplate.findUnique({ where: { id: templateId } });

  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  if (template.wedding_id !== weddingId) {
    return NextResponse.json(
      { error: 'Forbidden: Template does not belong to this wedding' },
      { status: 403 },
    );
  }

  const duplicate = await prisma.invitationTemplate.create({
    data: {
      wedding_id: weddingId,
      name: `Copy of ${template.name}`,
      design: template.design as Prisma.InputJsonValue,
      pre_rendered_html: template.pre_rendered_html as Prisma.InputJsonValue,
      based_on_preset: template.based_on_preset,
      is_system_template: false,
    },
  });

  invalidateWeddingPageCache(weddingId);
  void revalidateWeddingRSVPPages(weddingId);

  return NextResponse.json(duplicate, { status: 201 });
}

// ============================================================================
// EXPORT — GET /invitation-template/[id]/export
// ============================================================================

export async function exportInvitationTemplateHandler(
  weddingId: string,
  templateId: string,
): Promise<NextResponse> {
  const template = await prisma.invitationTemplate.findUnique({ where: { id: templateId } });

  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  if (template.wedding_id !== weddingId) {
    return NextResponse.json(
      { error: 'Forbidden: Template does not belong to this wedding' },
      { status: 403 },
    );
  }

  const archive = await exportInvitationTemplate(
    template.design as unknown as TemplateDesign,
    template.name,
  );

  const safeName = template.name.replace(/[^a-z0-9_\-\s]/gi, '_').trim() || 'invitation';
  const filename = `${safeName}.nupcinv`;

  return new NextResponse(
    archive.buffer.slice(
      archive.byteOffset,
      archive.byteOffset + archive.byteLength,
    ) as ArrayBuffer,
    {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(archive.length),
      },
    },
  );
}

// ============================================================================
// IMPORT — POST /invitation-template/import
// ============================================================================

export async function importInvitationTemplateHandler(
  weddingId: string,
  req: NextRequest,
): Promise<NextResponse> {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (
    file.name &&
    !file.name.toLowerCase().endsWith('.nupcinv') &&
    file.type !== 'application/octet-stream' &&
    file.type !== ''
  ) {
    return NextResponse.json(
      { error: 'Invalid file type. Please upload a .nupcinv file.' },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { design, templateName, warnings } = await importInvitationTemplate(buffer, weddingId);

  if (warnings.length > 0) {
    console.warn('[InvitationImport] Warnings during import:', warnings);
  }

  let pre_rendered_html = null;
  try {
    const { preRenderTemplate } = await import('@/lib/invitation-template/pre-renderer');
    pre_rendered_html = preRenderTemplate(design);
  } catch (err) {
    console.error('Failed to pre-render imported template:', err);
  }

  const template = await prisma.invitationTemplate.create({
    data: {
      wedding_id: weddingId,
      name: templateName,
      design: design as unknown as Prisma.InputJsonValue,
      pre_rendered_html: pre_rendered_html as unknown as Prisma.InputJsonValue,
      based_on_preset: null,
      is_system_template: false,
    },
  });

  invalidateWeddingPageCache(weddingId);
  void revalidateWeddingRSVPPages(weddingId);

  return NextResponse.json({ template, warnings }, { status: 201 });
}

// ============================================================================
// LIST IMAGES — GET /invitation-template/images
// ============================================================================

export async function listInvitationImagesHandler(weddingId: string): Promise<NextResponse> {
  let images: ImageFile[] = [];

  if (isUsingBlobStorage()) {
    const prefix = `uploads/invitation-images/${weddingId}/`;
    const { blobs } = await list({ prefix });
    images = blobs.map((blob) => ({
      url: blob.url,
      filename: blob.pathname.split('/').pop() || '',
    }));
  } else {
    const uploadDir = path.join(
      process.cwd(),
      'public',
      'uploads',
      'invitation-images',
      weddingId,
    );
    let files: string[] = [];
    try {
      files = await fs.readdir(uploadDir);
    } catch {
      files = [];
    }
    images = files.map((filename) => ({
      url: `/uploads/invitation-images/${weddingId}/${filename}`,
      filename,
    }));
  }

  return NextResponse.json(images);
}

// ============================================================================
// UPLOAD IMAGE — POST /invitation-template/images
// ============================================================================

export async function uploadInvitationImageHandler(
  weddingId: string,
  req: NextRequest,
): Promise<NextResponse> {
  const formData = await req.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (!isValidImageType(file.type)) {
    return NextResponse.json(
      { error: 'Invalid image type. Supported types: JPEG, PNG, WebP, GIF' },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await processTemplateImage(buffer, file.type);

  if (!result.success || !result.buffer) {
    return NextResponse.json(
      { error: result.error || 'Failed to process image' },
      { status: 400 },
    );
  }

  const timestamp = Date.now();
  const randomId = randomUUID().split('-')[0];
  const filename = `invitation_${weddingId}_${timestamp}_${randomId}.png`;
  const filepath = `uploads/invitation-images/${weddingId}/${filename}`;

  const uploadResult = await uploadFile(filepath, result.buffer, { contentType: 'image/png' });

  return NextResponse.json({ url: uploadResult.url }, { status: 201 });
}

// ============================================================================
// SHARED ERROR HANDLER
// ============================================================================

export function handleInvitationTemplateApiError(error: unknown): NextResponse {
  console.error('Invitation template API error:', error);
  const message = error instanceof Error ? error.message : 'Unknown error';

  if (message.includes('UNAUTHORIZED') || message.includes('FORBIDDEN')) {
    return NextResponse.json({ error: message }, { status: 403 });
  }

  if (
    message.startsWith('Invalid .nupcinv') ||
    message.startsWith('Failed to parse .nupcinv')
  ) {
    return NextResponse.json({ error: message }, { status: 422 });
  }

  return NextResponse.json({ error: message || 'Internal server error' }, { status: 500 });
}
