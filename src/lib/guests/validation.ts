/**
 * Guest Management - Validation Schemas
 *
 * Zod schemas for validating family and member data
 */

import { z } from 'zod';

// Language enum
export const languageSchema = z.enum(['ES', 'EN', 'FR', 'IT', 'DE']);

// Channel enum
export const channelSchema = z.enum(['WHATSAPP', 'EMAIL', 'SMS']);

// Member type enum
export const memberTypeSchema = z.enum(['ADULT', 'CHILD', 'INFANT']);

// Create member input schema
export const createMemberSchema = z.object({
  name: z.string().min(1, 'Member name is required'),
  type: memberTypeSchema,
  age: z.number().int().min(0).max(150).nullable().optional(),
  dietary_restrictions: z.string().nullable().optional(),
  accessibility_needs: z.string().nullable().optional(),
});

// Update member input schema
export const updateMemberSchema = z.object({
  id: z.string().uuid().optional(), // If present, update existing; if absent, create new
  name: z.string().min(1, 'Member name is required').optional(),
  type: memberTypeSchema.optional(),
  age: z.number().int().min(0).max(150).nullable().optional(),
  dietary_restrictions: z.string().nullable().optional(),
  accessibility_needs: z.string().nullable().optional(),
  _delete: z.boolean().optional(), // If true, delete this member
});

// Create family input schema
export const createFamilySchema = z.object({
  wedding_id: z.string().uuid(),
  name: z.string().min(1, 'Family name is required'),
  email: z.string().email('Invalid email format').nullable().optional(),
  phone: z.string().nullable().optional(),
  whatsapp_number: z.string().nullable().optional(),
  channel_preference: channelSchema.nullable().optional(),
  preferred_language: languageSchema.default('ES'),
  members: z.array(createMemberSchema).default([]),
});

// Update family input schema
export const updateFamilySchema = z.object({
  name: z.string().min(1, 'Family name is required').optional(),
  email: z.string().email('Invalid email format').nullable().optional(),
  phone: z.string().nullable().optional(),
  whatsapp_number: z.string().nullable().optional(),
  channel_preference: channelSchema.nullable().optional(),
  preferred_language: languageSchema.optional(),
  members: z.array(updateMemberSchema).optional(),
});

// Export types
export type CreateFamilyInput = z.infer<typeof createFamilySchema>;
export type UpdateFamilyInput = z.infer<typeof updateFamilySchema>;
export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;

/**
 * Validate family data
 */
export function validateFamilyData(
  input: unknown,
  isUpdate: boolean = false
): { success: boolean; data?: CreateFamilyInput | UpdateFamilyInput; errors?: z.ZodError } {
  try {
    const schema = isUpdate ? updateFamilySchema : createFamilySchema;
    const data = schema.parse(input);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}
