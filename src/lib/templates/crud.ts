/**
 * Template CRUD operations
 */

import { prisma } from "@/lib/db";
import { Language, TemplateType, Channel } from "@prisma/client";
import {
  CreateTemplateRequest,
  UpdateTemplateRequest,
  ListTemplatesQuery,
} from "./validation";

/**
 * Create a new message template
 */
export async function createTemplate(request: CreateTemplateRequest) {
  return prisma.messageTemplate.create({
    data: {
      wedding_id: request.wedding_id,
      type: request.type,
      language: request.language,
      channel: request.channel,
      subject: request.subject,
      body: request.body,
    },
  });
}

/**
 * Get a template by ID
 */
export async function getTemplateById(id: string) {
  return prisma.messageTemplate.findUnique({
    where: { id },
  });
}

/**
 * Get template by wedding_id, type, language, and channel
 */
export async function getTemplateForSending(
  wedding_id: string,
  type: TemplateType,
  language: Language,
  channel: Channel
) {
  return prisma.messageTemplate.findUnique({
    where: {
      wedding_id_type_language_channel: {
        wedding_id,
        type,
        language,
        channel,
      },
    },
  });
}

/**
 * Update a template
 */
export async function updateTemplate(
  id: string,
  request: UpdateTemplateRequest
) {
  return prisma.messageTemplate.update({
    where: { id },
    data: {
      ...(request.subject && { subject: request.subject }),
      ...(request.body && { body: request.body }),
    },
  });
}

/**
 * Delete a template
 */
export async function deleteTemplate(id: string) {
  return prisma.messageTemplate.delete({
    where: { id },
  });
}

/**
 * List templates with filtering and pagination
 */
export async function listTemplates(query: ListTemplatesQuery) {
  const {
    wedding_id,
    type,
    language,
    channel,
    page = 1,
    limit = 50,
  } = query;

  const skip = (page - 1) * limit;

  const where = {
    wedding_id,
    ...(type && { type }),
    ...(language && { language }),
    ...(channel && { channel }),
  };

  const [templates, total] = await Promise.all([
    prisma.messageTemplate.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ type: "asc" }, { language: "asc" }, { channel: "asc" }],
    }),
    prisma.messageTemplate.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    items: templates,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

/**
 * Check if templates exist for a wedding
 */
export async function hasTemplatesForWedding(wedding_id: string) {
  const count = await prisma.messageTemplate.count({
    where: { wedding_id },
  });
  return count > 0;
}

/**
 * Get all templates for a wedding
 */
export async function getWeddingTemplates(wedding_id: string) {
  return prisma.messageTemplate.findMany({
    where: { wedding_id },
    orderBy: [{ type: "asc" }, { language: "asc" }, { channel: "asc" }],
  });
}

/**
 * Delete all templates for a wedding (called on cascading delete)
 */
export async function deleteWeddingTemplates(wedding_id: string) {
  return prisma.messageTemplate.deleteMany({
    where: { wedding_id },
  });
}

/**
 * Check if a specific template exists and belongs to the wedding
 */
export async function verifyTemplateOwnership(
  templateId: string,
  wedding_id: string
) {
  const template = await getTemplateById(templateId);
  return template && template.wedding_id === wedding_id;
}
