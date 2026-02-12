/**
 * Wedding Planner - VCF Import API Route
 *
 * POST /api/planner/weddings/:id/guests/import-vcf - Upload and import guest list from VCF file
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/middleware';
import { importVCF } from '@/lib/vcf/import';
import { validateVCF } from '@/lib/vcf/parser';
import type { APIResponse } from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';
import { prisma } from '@/lib/db/prisma';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Helper to validate planner access to wedding
 */
async function validatePlannerAccess(plannerId: string, weddingId: string) {
  const wedding = await prisma.wedding.findUnique({
    where: { id: weddingId },
    select: { planner_id: true },
  });

  if (!wedding) {
    return { valid: false, error: 'Wedding not found', status: 404 };
  }

  if (wedding.planner_id !== plannerId) {
    return { valid: false, error: 'You do not have access to this wedding', status: 403 };
  }

  return { valid: true };
}

/**
 * POST /api/planner/weddings/:id/guests/import-vcf
 * Import guest list from VCF file
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and require planner role
    const user = await requireRole('planner');

    if (!user.planner_id) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'Planner ID not found in session',
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    const { id: weddingId } = await params;

    // Validate planner access to wedding
    const accessCheck = await validatePlannerAccess(user.planner_id, weddingId);
    if (!accessCheck.valid) {
      const response: APIResponse = {
        success: false,
        error: {
          code: accessCheck.status === 404 ? API_ERROR_CODES.NOT_FOUND : API_ERROR_CODES.FORBIDDEN,
          message: accessCheck.error!,
        },
      };
      return NextResponse.json(response, { status: accessCheck.status });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: 'No file provided',
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate file type (VCF files can be text/vcard, text/x-vcard, or text/plain)
    const validTypes = ['text/vcard', 'text/x-vcard', 'text/plain', 'text/directory'];

    if (!validTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.vcf')) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid file type. Please upload a VCF file (.vcf)',
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Get wedding details
    const wedding = await prisma.wedding.findUnique({
      where: { id: weddingId },
      select: {
        id: true,
        default_language: true,
        wedding_country: true,
      },
    });

    if (!wedding) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.NOT_FOUND,
          message: 'Wedding not found',
        },
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Convert file to text
    const vcfContent = await file.text();

    // Validate VCF format
    const validationError = validateVCF(vcfContent);
    if (validationError) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: validationError,
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Import VCF contacts
    const result = await importVCF(vcfContent, {
      weddingId: wedding.id,
      adminId: user.id,
      adminName: user.name,
      defaultLanguage: wedding.default_language,
      weddingCountry: wedding.wedding_country,
    });

    if (!result.success) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: result.message,
          details: {
            errors: result.errors,
          },
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    const response: APIResponse = {
      success: true,
      data: {
        familiesCreated: result.familiesCreated,
        membersCreated: result.membersCreated,
        errors: result.errors,
        message: result.message,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('VCF import error:', error);

    // Handle authentication/authorization errors
    if (error instanceof Error && error.message.startsWith('UNAUTHORIZED')) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.UNAUTHORIZED,
          message: 'Authentication required',
        },
      };
      return NextResponse.json(response, { status: 401 });
    }

    if (error instanceof Error && error.message.startsWith('FORBIDDEN')) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'Planner access required',
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Generic error
    const response: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to import VCF file',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
