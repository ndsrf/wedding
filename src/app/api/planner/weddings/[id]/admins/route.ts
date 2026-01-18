/**
 * Wedding Planner - Wedding Admins API Routes
 *
 * POST /api/planner/weddings/:id/admins - Invite wedding admin
 * DELETE /api/planner/weddings/:id/admins/:admin_id - Remove wedding admin (via query param)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireRole } from '@/lib/auth/middleware';
import { sendAdminInvitation } from '@/lib/email/resend';
import type { Language } from '@/lib/i18n/config';
import type {
  APIResponse,
  InviteWeddingAdminResponse,
  RemoveWeddingAdminResponse,
  InviteWeddingAdminRequest,
} from '@/types/api';
import { API_ERROR_CODES } from '@/types/api';

// Validation schema for inviting wedding admin
const inviteAdminSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required'),
});

/**
 * POST /api/planner/weddings/:id/admins
 * Invite a wedding admin to manage a specific wedding
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

    // Check if wedding exists and belongs to this planner
    const wedding = await prisma.wedding.findUnique({
      where: { id: weddingId },
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

    if (wedding.planner_id !== user.planner_id) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'You do not have access to this wedding',
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData: InviteWeddingAdminRequest = inviteAdminSchema.parse(body);

    // Check if admin with this email is already invited to this wedding
    const existingAdmin = await prisma.weddingAdmin.findUnique({
      where: {
        email_wedding_id: {
          email: validatedData.email,
          wedding_id: weddingId,
        },
      },
    });

    if (existingAdmin) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.ALREADY_EXISTS,
          message: 'This admin is already invited to this wedding',
        },
      };
      return NextResponse.json(response, { status: 409 });
    }

    // Create wedding admin invitation
    const weddingAdmin = await prisma.weddingAdmin.create({
      data: {
        email: validatedData.email,
        name: validatedData.name,
        wedding_id: weddingId,
        invited_by: user.id,
        auth_provider: 'GOOGLE', // Default, will be updated on first login
        preferred_language: wedding.default_language,
      },
    });

    // Send invitation email
    const language = wedding.default_language.toLowerCase() as Language;
    const weddingDateFormatted = wedding.wedding_date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const oauthLink = `${process.env.APP_URL || 'http://localhost:3000'}/auth/signin?callbackUrl=/admin/weddings/${weddingId}`;

    console.log('[EMAIL DEBUG] Attempting to send admin invitation email:', {
      to: validatedData.email,
      language,
      adminName: validatedData.name,
      coupleNames: wedding.couple_names,
      weddingDate: weddingDateFormatted,
      oauthLink,
    });

    const emailResult = await sendAdminInvitation(
      validatedData.email,
      language,
      validatedData.name,
      wedding.couple_names,
      weddingDateFormatted,
      oauthLink
    );

    console.log('[EMAIL DEBUG] Email result:', emailResult);

    if (!emailResult.success) {
      console.error('Failed to send admin invitation email:', emailResult.error);
      // Note: We don't fail the request if email fails - admin is still created
    }

    const response: InviteWeddingAdminResponse = {
      success: true,
      data: weddingAdmin,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error: unknown) {
    // Handle authentication errors
    const errorMessage = error instanceof Error ? error.message : '';
    if (errorMessage.includes('UNAUTHORIZED')) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.UNAUTHORIZED,
          message: 'Authentication required',
        },
      };
      return NextResponse.json(response, { status: 401 });
    }

    if (errorMessage.includes('FORBIDDEN')) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'Planner role required',
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Handle validation errors
    if (error instanceof z.ZodError) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid request data',
          details: error.errors,
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Handle unexpected errors
    console.error('Error inviting wedding admin:', error);
    const response: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to invite wedding admin',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * DELETE /api/planner/weddings/:id/admins?admin_id=xxx
 * Remove a wedding admin from a wedding
 */
export async function DELETE(
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
    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get('admin_id');

    if (!adminId) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.VALIDATION_ERROR,
          message: 'admin_id query parameter is required',
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Check if wedding exists and belongs to this planner
    const wedding = await prisma.wedding.findUnique({
      where: { id: weddingId },
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

    if (wedding.planner_id !== user.planner_id) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'You do not have access to this wedding',
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Check if admin exists
    const admin = await prisma.weddingAdmin.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.NOT_FOUND,
          message: 'Wedding admin not found',
        },
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Verify admin belongs to this wedding
    if (admin.wedding_id !== weddingId) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'This admin does not belong to this wedding',
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Delete the wedding admin
    await prisma.weddingAdmin.delete({
      where: { id: adminId },
    });

    const response: RemoveWeddingAdminResponse = {
      success: true,
      data: { success: true },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    // Handle authentication errors
    const errorMessage = error instanceof Error ? error.message : '';
    if (errorMessage.includes('UNAUTHORIZED')) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.UNAUTHORIZED,
          message: 'Authentication required',
        },
      };
      return NextResponse.json(response, { status: 401 });
    }

    if (errorMessage.includes('FORBIDDEN')) {
      const response: APIResponse = {
        success: false,
        error: {
          code: API_ERROR_CODES.FORBIDDEN,
          message: 'Planner role required',
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Handle unexpected errors
    console.error('Error removing wedding admin:', error);
    const response: APIResponse = {
      success: false,
      error: {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        message: 'Failed to remove wedding admin',
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
