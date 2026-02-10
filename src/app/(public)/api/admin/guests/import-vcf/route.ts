/**
 * Wedding Admin - VCF Import API Route
 *
 * POST /api/admin/guests/import-vcf - Upload and import guest list from VCF file
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
 * POST /api/admin/guests/import-vcf
 * Import guest list from VCF file
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and require wedding_admin role
    const user = await requireRole('wedding_admin');

    if (!user.wedding_id) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'Wedding ID not found in session',
        },
      };
      return NextResponse.json(response, { status: 403 });
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
      where: { id: user.wedding_id },
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
          message: 'Wedding admin access required',
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
