/**
 * Planner Template image upload API endpoints
 * POST /api/planner/templates/[id]/image - Upload image for template
 * PUT /api/planner/templates/[id]/image - Apply image to all templates
 * DELETE /api/planner/templates/[id]/image - Remove image from template
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { processTemplateImage, isValidImageType } from '@/lib/images/processor';
import { uploadFile, deleteFile } from '@/lib/storage';
import { prisma } from '@/lib/db/prisma';

/**
 * POST /api/planner/templates/[id]/image
 * Upload and process an image for a template
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify planner access
    const user = await requireRole('planner');
    if (!user || !user.planner_id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const resolvedParams = await params;

    // Get the template and verify ownership
    const template = await prisma.plannerMessageTemplate.findUnique({
      where: { id: resolvedParams.id },
    });

    if (!template) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Template not found' } },
        { status: 404 }
      );
    }

    if (template.planner_id !== user.planner_id) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const applyToAll = formData.get('applyToAll') === 'true';

    if (!file) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_REQUEST', message: 'No file provided' } },
        { status: 400 }
      );
    }

    // Validate file type
    if (!isValidImageType(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_FILE_TYPE',
            message: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are supported.',
          },
        },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Process the image
    const result = await processTemplateImage(buffer, file.type);

    if (!result.success || !result.buffer) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'IMAGE_PROCESSING_FAILED',
            message: result.error || 'Failed to process image',
          },
        },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const filename = `planner-templates/${user.planner_id}/${template.type.toLowerCase()}-${template.language.toLowerCase()}-${timestamp}-${randomString}.png`;

    // Upload to storage
    const uploadResult = await uploadFile(filename, result.buffer, {
      contentType: 'image/png',
    });

    const imageUrl = uploadResult.url;

    // If applyToAll is true, check for existing images and require confirmation
    if (applyToAll) {
      const templatesWithImages = await prisma.plannerMessageTemplate.findMany({
        where: {
          planner_id: user.planner_id,
          image_url: { not: null },
        },
        select: {
          id: true,
          language: true,
          channel: true,
        },
      });

      if (templatesWithImages.length > 0) {
        // Return confirmation required
        return NextResponse.json({
          success: true,
          requiresConfirmation: true,
          message: `${templatesWithImages.length} template(s) already have images. Do you want to replace them?`,
          templatesWithImages,
          imageUrl,
          processedImage: {
            width: result.width!,
            height: result.height!,
            detectedAspectRatio: result.detectedAspectRatio!,
          },
        });
      }

      // Apply to all templates
      await prisma.plannerMessageTemplate.updateMany({
        where: {
          planner_id: user.planner_id,
        },
        data: {
          image_url: imageUrl,
        },
      });
    } else {
      // Update only this template
      await prisma.plannerMessageTemplate.update({
        where: { id: resolvedParams.id },
        data: { image_url: imageUrl },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        imageUrl,
        width: result.width,
        height: result.height,
        detectedAspectRatio: result.detectedAspectRatio,
      },
    });
  } catch (error) {
    console.error('[POST /api/planner/templates/:id/image] Error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to upload image' } },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/planner/templates/[id]/image
 * Apply uploaded image to all templates (confirmation step)
 */
export async function PUT(
  request: NextRequest,
  _context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole('planner');
    if (!user || !user.planner_id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_REQUEST', message: 'Image URL required' } },
        { status: 400 }
      );
    }

    // Update all planner templates
    await prisma.plannerMessageTemplate.updateMany({
      where: {
        planner_id: user.planner_id,
      },
      data: {
        image_url: imageUrl,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[PUT /api/planner/templates/:id/image] Error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to apply image' } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/planner/templates/[id]/image
 * Remove image from template(s)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole('planner');
    if (!user || !user.planner_id) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const resolvedParams = await params;

    // Get the template
    const template = await prisma.plannerMessageTemplate.findUnique({
      where: { id: resolvedParams.id },
    });

    if (!template) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Template not found' } },
        { status: 404 }
      );
    }

    if (template.planner_id !== user.planner_id) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    // Check if removeFromAll query param is set
    const { searchParams } = new URL(request.url);
    const removeFromAll = searchParams.get('removeFromAll') === 'true';

    if (removeFromAll) {
      // Remove image from all templates
      await prisma.plannerMessageTemplate.updateMany({
        where: {
          planner_id: user.planner_id,
        },
        data: {
          image_url: null,
        },
      });
    } else {
      // Remove image from only this template
      await prisma.plannerMessageTemplate.update({
        where: { id: resolvedParams.id },
        data: { image_url: null },
      });
    }

    // Optionally delete the file from storage
    if (template.image_url) {
      try {
        await deleteFile(template.image_url);
      } catch (error) {
        console.error('Failed to delete file from storage:', error);
        // Don't fail the request if file deletion fails
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/planner/templates/:id/image] Error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to delete image' } },
      { status: 500 }
    );
  }
}
