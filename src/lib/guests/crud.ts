/**
 * Guest Management - CRUD Service
 *
 * Service layer for guest family CRUD operations with validation and audit logging
 */

import { prisma } from '@/lib/db/prisma';
import { logAuditEvent } from './audit';
import {
  createFamilySchema,
  updateFamilySchema,
  type CreateFamilyInput,
  type UpdateFamilyInput,
} from './validation';
import type { Family, FamilyMember, Prisma } from '@prisma/client';

export interface FamilyWithMembers extends Family {
  members: FamilyMember[];
}

export interface DeleteFamilyResult {
  success: boolean;
  had_rsvp: boolean;
  deleted_members_count: number;
  deleted_events_count: number;
  deleted_gifts_count: number;
}

/**
 * Generate reference code for automated payment mode
 */
function generateReferenceCode(): string {
  // Generate a 6-character alphanumeric code
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding similar-looking characters
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Create a new family with members and generate magic token
 */
export async function createFamily(
  input: CreateFamilyInput,
  admin_id: string
): Promise<FamilyWithMembers> {
  // Validate input
  const validatedInput = createFamilySchema.parse(input);

  // Check if wedding exists and get payment mode
  const wedding = await prisma.wedding.findUnique({
    where: { id: validatedInput.wedding_id },
    select: { payment_tracking_mode: true },
  });

  if (!wedding) {
    throw new Error('Wedding not found');
  }

  // Generate magic token
  const magic_token = crypto.randomUUID();

  // Generate reference code if automated payment mode
  const reference_code =
    wedding.payment_tracking_mode === 'AUTOMATED' ? generateReferenceCode() : null;

  // Create family with members in a transaction
  const family = await prisma.$transaction(async (tx) => {
    // Create family
    const newFamily = await tx.family.create({
      data: {
        wedding_id: validatedInput.wedding_id,
        name: validatedInput.name,
        email: validatedInput.email || null,
        phone: validatedInput.phone || null,
        whatsapp_number: validatedInput.whatsapp_number || null,
        magic_token,
        reference_code,
        channel_preference: validatedInput.channel_preference || null,
        preferred_language: validatedInput.preferred_language,
      },
      include: {
        members: true,
      },
    });

    // Create family members if provided
    if (validatedInput.members && validatedInput.members.length > 0) {
      await tx.familyMember.createMany({
        data: validatedInput.members.map((member) => ({
          family_id: newFamily.id,
          name: member.name,
          type: member.type,
          age: member.age || null,
          dietary_restrictions: member.dietary_restrictions || null,
          accessibility_needs: member.accessibility_needs || null,
          added_by_guest: false,
        })),
      });

      // Fetch family with members
      const familyWithMembers = await tx.family.findUnique({
        where: { id: newFamily.id },
        include: { members: true },
      });

      return familyWithMembers!;
    }

    return newFamily;
  });

  // Log audit event
  await logAuditEvent({
    action: 'create',
    family_id: family.id,
    wedding_id: validatedInput.wedding_id,
    admin_id,
    details: {
      family_name: family.name,
      members_count: family.members.length,
      has_reference_code: !!reference_code,
    },
  });

  return family;
}

/**
 * Get family with all members
 */
export async function getFamilyWithMembers(
  family_id: string,
  wedding_id: string
): Promise<FamilyWithMembers | null> {
  const family = await prisma.family.findFirst({
    where: {
      id: family_id,
      wedding_id,
    },
    include: {
      members: {
        orderBy: { created_at: 'asc' },
      },
    },
  });

  return family;
}

/**
 * Update family and members
 */
export async function updateFamily(
  family_id: string,
  wedding_id: string,
  input: UpdateFamilyInput,
  admin_id: string
): Promise<FamilyWithMembers> {
  // Validate input
  const validatedInput = updateFamilySchema.parse(input);

  // Verify family exists and belongs to wedding
  const existingFamily = await prisma.family.findFirst({
    where: {
      id: family_id,
      wedding_id,
    },
    include: {
      members: true,
    },
  });

  if (!existingFamily) {
    throw new Error('Family not found');
  }

  // Update family and members in a transaction
  const family = await prisma.$transaction(async (tx) => {
    // Update family fields
    const familyUpdateData: Prisma.FamilyUpdateInput = {};
    if (validatedInput.name !== undefined) familyUpdateData.name = validatedInput.name;
    if (validatedInput.email !== undefined) familyUpdateData.email = validatedInput.email;
    if (validatedInput.phone !== undefined) familyUpdateData.phone = validatedInput.phone;
    if (validatedInput.whatsapp_number !== undefined)
      familyUpdateData.whatsapp_number = validatedInput.whatsapp_number;
    if (validatedInput.channel_preference !== undefined)
      familyUpdateData.channel_preference = validatedInput.channel_preference;
    if (validatedInput.preferred_language !== undefined)
      familyUpdateData.preferred_language = validatedInput.preferred_language;

    await tx.family.update({
      where: { id: family_id },
      data: familyUpdateData,
    });

    // Handle member updates if provided
    if (validatedInput.members) {
      for (const memberInput of validatedInput.members) {
        if (memberInput._delete && memberInput.id) {
          // Delete member
          await tx.familyMember.delete({
            where: { id: memberInput.id },
          });
        } else if (memberInput.id) {
          // Update existing member
          const memberUpdateData: Prisma.FamilyMemberUpdateInput = {};
          if (memberInput.name !== undefined) memberUpdateData.name = memberInput.name;
          if (memberInput.type !== undefined) memberUpdateData.type = memberInput.type;
          if (memberInput.age !== undefined) memberUpdateData.age = memberInput.age;
          if (memberInput.dietary_restrictions !== undefined)
            memberUpdateData.dietary_restrictions = memberInput.dietary_restrictions;
          if (memberInput.accessibility_needs !== undefined)
            memberUpdateData.accessibility_needs = memberInput.accessibility_needs;

          await tx.familyMember.update({
            where: { id: memberInput.id },
            data: memberUpdateData,
          });
        } else {
          // Create new member
          await tx.familyMember.create({
            data: {
              family_id: family_id,
              name: memberInput.name!,
              type: memberInput.type!,
              age: memberInput.age || null,
              dietary_restrictions: memberInput.dietary_restrictions || null,
              accessibility_needs: memberInput.accessibility_needs || null,
              added_by_guest: false,
            },
          });
        }
      }
    }

    // Fetch updated family with members
    const familyWithMembers = await tx.family.findUnique({
      where: { id: family_id },
      include: {
        members: {
          orderBy: { created_at: 'asc' },
        },
      },
    });

    return familyWithMembers!;
  });

  // Log audit event
  await logAuditEvent({
    action: 'update',
    family_id,
    wedding_id,
    admin_id,
    details: {
      family_name: family.name,
      updated_fields: Object.keys(validatedInput),
      members_count: family.members.length,
    },
  });

  return family;
}

/**
 * Delete family and all related data
 */
export async function deleteFamily(
  family_id: string,
  wedding_id: string,
  admin_id: string
): Promise<DeleteFamilyResult> {
  // Verify family exists and belongs to wedding
  const existingFamily = await prisma.family.findFirst({
    where: {
      id: family_id,
      wedding_id,
    },
    include: {
      members: true,
      tracking_events: true,
      gifts: true,
    },
  });

  if (!existingFamily) {
    throw new Error('Family not found');
  }

  // Check if family has submitted RSVP
  const had_rsvp = existingFamily.members.some((m) => m.attending !== null);

  // Count related records before deletion
  const deleted_members_count = existingFamily.members.length;
  const deleted_events_count = existingFamily.tracking_events.length;
  const deleted_gifts_count = existingFamily.gifts.length;

  // Delete family (cascade will handle members, events, gifts)
  await prisma.family.delete({
    where: { id: family_id },
  });

  // Log audit event
  await logAuditEvent({
    action: 'delete',
    family_id,
    wedding_id,
    admin_id,
    details: {
      family_name: existingFamily.name,
      had_rsvp,
      deleted_members_count,
      deleted_events_count,
      deleted_gifts_count,
    },
  });

  return {
    success: true,
    had_rsvp,
    deleted_members_count,
    deleted_events_count,
    deleted_gifts_count,
  };
}
