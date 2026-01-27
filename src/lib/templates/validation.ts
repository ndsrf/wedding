/**
 * Zod schemas for template validation
 */

import { z } from "zod";

// Common validations
const languageEnum = z.enum(["ES", "EN", "FR", "IT", "DE"]);
const templateTypeEnum = z.enum(["INVITATION", "REMINDER"]);
const channelEnum = z.enum(["EMAIL", "WHATSAPP", "SMS"]);

/**
 * Schema for creating a new message template
 */
export const createTemplateSchema = z.object({
  wedding_id: z.string().uuid("Wedding ID must be a valid UUID"),
  type: templateTypeEnum,
  language: languageEnum,
  channel: channelEnum,
  subject: z
    .string()
    .min(1, "Subject is required")
    .max(200, "Subject must be 200 characters or less"),
  body: z
    .string()
    .min(10, "Body must be at least 10 characters")
    .max(5000, "Body must be 5000 characters or less"),
});

export type CreateTemplateRequest = z.infer<typeof createTemplateSchema>;

/**
 * Schema for updating an existing template
 */
export const updateTemplateSchema = z.object({
  subject: z
    .string()
    .min(1, "Subject is required")
    .max(200, "Subject must be 200 characters or less")
    .optional(),
  body: z
    .string()
    .min(10, "Body must be at least 10 characters")
    .max(5000, "Body must be 5000 characters or less")
    .optional(),
  image_url: z.string().url("Invalid image URL").nullable().optional(),
});

export type UpdateTemplateRequest = z.infer<typeof updateTemplateSchema>;

/**
 * Schema for listing templates with filters
 */
export const listTemplatesQuerySchema = z.object({
  wedding_id: z.string().uuid("Wedding ID must be a valid UUID"),
  type: templateTypeEnum.optional(),
  language: languageEnum.optional(),
  channel: channelEnum.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export type ListTemplatesQuery = z.infer<typeof listTemplatesQuerySchema>;

/**
 * Schema for previewing a template with sample data
 */
export const previewTemplateSchema = z.object({
  wedding_id: z.string().uuid("Wedding ID must be a valid UUID"),
  template_id: z.string().uuid("Template ID must be a valid UUID").optional(),
  type: templateTypeEnum.optional(),
  language: languageEnum.optional(),
  channel: channelEnum.optional(),
  subject: z.string().optional(),
  body: z.string().optional(),
  image_url: z.string().url("Invalid image URL").nullable().optional(),
  sampleData: z
    .object({
      familyName: z.string().default("Smith"),
      coupleNames: z.string().default("John & Jane"),
      weddingDate: z.string().default("Saturday, June 15, 2024"),
      weddingTime: z.string().default("4:00 PM"),
      location: z.string().default("Grand Ballroom"),
      magicLink: z
        .string()
        .default("https://wedding.com/rsvp/example"),
      rsvpCutoffDate: z.string().default("Friday, May 31, 2024"),
      referenceCode: z.string().default("REF-12345-67890"),
    })
    .optional(),
});

export type PreviewTemplateRequest = z.infer<typeof previewTemplateSchema>;

/**
 * Validate template request data
 */
export function validateCreateTemplate(data: unknown) {
  try {
    return { data: createTemplateSchema.parse(data), error: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: error.errors[0]?.message || "Validation failed",
          details: error.errors,
        },
      };
    }
    return { data: null, error: { code: "ERROR", message: "Validation failed" } };
  }
}

/**
 * Validate template update request
 */
export function validateUpdateTemplate(data: unknown) {
  try {
    return { data: updateTemplateSchema.parse(data), error: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: error.errors[0]?.message || "Validation failed",
          details: error.errors,
        },
      };
    }
    return { data: null, error: { code: "ERROR", message: "Validation failed" } };
  }
}

/**
 * Validate list templates query
 */
export function validateListTemplatesQuery(data: unknown) {
  try {
    return { data: listTemplatesQuerySchema.parse(data), error: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: error.errors[0]?.message || "Validation failed",
          details: error.errors,
        },
      };
    }
    return { data: null, error: { code: "ERROR", message: "Validation failed" } };
  }
}

/**
 * Validate preview template request
 */
export function validatePreviewTemplate(data: unknown) {
  try {
    return { data: previewTemplateSchema.parse(data), error: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: error.errors[0]?.message || "Validation failed",
          details: error.errors,
        },
      };
    }
    return { data: null, error: { code: "ERROR", message: "Validation failed" } };
  }
}
