/**
 * Template image upload API endpoints
 * POST /api/admin/templates/[id]/image - Upload image for template
 * DELETE /api/admin/templates/[id]/image - Remove image from template
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { verifyTemplateOwnership, updateTemplate, getTemplateById } from '@/lib/templates/crud';
import { processTemplateImage, isValidImageType } from '@/lib/images/processor';
import { writeFile, unlink, mkdir, stat } from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/db/prisma';

/**
 * POST /api/admin/templates/[id]/image
 * Upload and process an image for a template
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin access
    const user = await requireRole('wedding_admin');
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const resolvedParams = await params;

    // Verify ownership
    const isOwner = await verifyTemplateOwnership(resolvedParams.id, user.wedding_id!);
    if (!isOwner) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Forbidden' } },
        { status: 403 }
      );
    }

    // Get the template to access its properties
    const template = await getTemplateById(resolvedParams.id);
    if (!template) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Template not found' } },
        { status: 404 }
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

    // Process the image (validate aspect ratio, convert to PNG, resize)
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
    const filename = `template_${template.wedding_id}_${timestamp}_${randomString}.png`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'templates');
    const filePath = path.join(uploadDir, filename);

    console.log('[Upload] Writing file to:', filePath);

    // Ensure the upload directory exists
    await mkdir(uploadDir, { recursive: true });

    // Save the processed image
    await writeFile(filePath, result.buffer);

    // Verify file existence and size
    try {
      const stats = await stat(filePath);
      console.log(`[Upload] File written successfully. Size: ${stats.size} bytes`);
    } catch (e) {
      console.error('[Upload] Error verifying file after write:', e);
    }

    const imageUrl = `/uploads/templates/${filename}`;

    // If applyToAll is true, check if there are existing images
    if (applyToAll) {
      // Get all templates for this wedding (all types, languages, and channels)
      const templatesWithImages = await prisma.messageTemplate.findMany({
        where: {
          wedding_id: template.wedding_id,
          image_url: {
            not: null,
          },
        },
        select: {
          id: true,
          type: true,
          language: true,
          channel: true,
        },
      });

      // Return confirmation request if there are existing images
      if (templatesWithImages.length > 0) {
        return NextResponse.json({
          success: true,
          requiresConfirmation: true,
          message: `There are ${templatesWithImages.length} templates with existing images. Do you want to replace them?`,
          templatesWithImages,
          imageUrl,
          processedImage: {
            width: result.width,
            height: result.height,
            aspectRatio: result.detectedAspectRatio,
          },
        });
      }

      // Apply to all templates for this wedding (all types, languages, and channels)
      await prisma.messageTemplate.updateMany({
        where: {
          wedding_id: template.wedding_id,
        },
        data: {
          image_url: imageUrl,
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          imageUrl,
          appliedToAll: true,
          updatedCount: await prisma.messageTemplate.count({
            where: {
              wedding_id: template.wedding_id,
            },
          }),
          processedImage: {
            width: result.width,
            height: result.height,
            aspectRatio: result.detectedAspectRatio,
          },
        },
      });
    }

    // Update only this template
    const updated = await updateTemplate(resolvedParams.id, {
      image_url: imageUrl,
    });

    return NextResponse.json({
      success: true,
      data: {
        template: updated,
        imageUrl,
        processedImage: {
          width: result.width,
          height: result.height,
          aspectRatio: result.detectedAspectRatio,
        },
      },
    });
  } catch (error) {
    console.error('[POST /api/admin/templates/[id]/image] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to upload image',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/templates/[id]/image/confirm
 * Confirm applying image to all templates (after user confirmation)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin access
    const user = await requireRole('wedding_admin');
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const resolvedParams = await params;

    // Verify ownership
    const isOwner = await verifyTemplateOwnership(resolvedParams.id, user.wedding_id!);
    if (!isOwner) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Forbidden' } },
        { status: 403 }
      );
    }

    // Get the template
    const template = await getTemplateById(resolvedParams.id);
    if (!template) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Template not found' } },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_REQUEST', message: 'No image URL provided' } },
        { status: 400 }
      );
    }

    // Apply to all templates for this wedding (all types, languages, and channels)
    const updateResult = await prisma.messageTemplate.updateMany({
      where: {
        wedding_id: template.wedding_id,
      },
      data: {
        image_url: imageUrl,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        imageUrl,
        appliedToAll: true,
        updatedCount: updateResult.count,
      },
    });
  } catch (error) {
    console.error('[PUT /api/admin/templates/[id]/image] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to confirm image upload',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/templates/[id]/image
 * Remove image from a template
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin access
    const user = await requireRole('wedding_admin');
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const resolvedParams = await params;

    // Verify ownership
    const isOwner = await verifyTemplateOwnership(resolvedParams.id, user.wedding_id!);
    if (!isOwner) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Forbidden' } },
        { status: 403 }
      );
    }

    // Get the template to access the image URL
    const template = await getTemplateById(resolvedParams.id);
    if (!template) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Template not found' } },
        { status: 404 }
      );
    }

    // Parse query parameters for removeFromAll option
    const searchParams = request.nextUrl.searchParams;
    const removeFromAll = searchParams.get('removeFromAll') === 'true';

    if (template.image_url) {
      // Delete the image file from disk
      const imagePath = path.join(process.cwd(), 'public', template.image_url);
      try {
        await unlink(imagePath);
      } catch (error) {
        console.error('Failed to delete image file:', error);
        // Continue even if file deletion fails
      }
    }

    if (removeFromAll) {
      // Remove image from all templates with the same type
      await prisma.messageTemplate.updateMany({
        where: {
          wedding_id: template.wedding_id,
          type: template.type,
        },
        data: {
          image_url: null,
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          removedFromAll: true,
          updatedCount: await prisma.messageTemplate.count({
            where: {
              wedding_id: template.wedding_id,
              type: template.type,
            },
          }),
        },
      });
    }

    // Remove image from only this template
    const updated = await updateTemplate(resolvedParams.id, {
      image_url: null,
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('[DELETE /api/admin/templates/[id]/image] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to remove image',
        },
      },
      { status: 500 }
    );
  }
}
