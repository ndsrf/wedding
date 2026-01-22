/**
 * Template Management Service for Checklist Feature
 *
 * Manages checklist templates for wedding planners.
 * Includes CRUD operations and template-to-wedding copying with date conversion.
 */

import { prisma } from '@/lib/db/prisma';
import { convertRelativeDateToAbsolute } from './date-converter';
import type {
  CreateTemplateData,
  ChecklistTemplateWithSections,
  RelativeDateFormat,
} from '@/types/checklist';

// ============================================================================
// TEMPLATE CRUD OPERATIONS
// ============================================================================

/**
 * Get a planner's checklist template with all sections and tasks
 *
 * @param planner_id - The wedding planner's ID
 * @returns Template with sections and tasks, or null if not found
 */
export async function getTemplate(
  planner_id: string
): Promise<ChecklistTemplateWithSections | null> {
  const template = await prisma.checklistTemplate.findUnique({
    where: { planner_id },
    include: {
      sections: {
        where: { template_id: { not: null } }, // Only template sections
        include: {
          tasks: {
            where: { template_id: { not: null } }, // Only template tasks
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { order: 'asc' },
      },
    },
  });

  return template as ChecklistTemplateWithSections | null;
}

/**
 * Save (create or update) a planner's checklist template
 *
 * This operation is idempotent and will replace the entire template structure.
 * Uses a transaction to ensure atomicity.
 *
 * @param planner_id - The wedding planner's ID
 * @param data - Template data with sections and tasks
 * @returns The created/updated template with sections and tasks
 */
export async function saveTemplate(
  planner_id: string,
  data: CreateTemplateData
): Promise<ChecklistTemplateWithSections> {
  // Validate template structure
  if (!data.sections || data.sections.length === 0) {
    throw new Error('Template must have at least one section');
  }

  // Validate that all tasks have valid relative dates
  for (const section of data.sections) {
    for (const task of section.tasks) {
      if (task.due_date_relative) {
        // Basic validation - the date-converter service will validate more thoroughly
        if (!task.due_date_relative.startsWith('WEDDING_DATE')) {
          throw new Error(`Invalid relative date format: ${task.due_date_relative}`);
        }
      }
    }
  }

  // Use transaction to ensure all-or-nothing operation
  const result = await prisma.$transaction(async (tx) => {
    // Check if template exists
    const existingTemplate = await tx.checklistTemplate.findUnique({
      where: { planner_id },
      select: { id: true },
    });

    let templateId: string;

    if (existingTemplate) {
      // Delete existing sections and tasks (cascade will handle tasks)
      await tx.checklistSection.deleteMany({
        where: {
          template_id: existingTemplate.id,
        },
      });
      templateId = existingTemplate.id;
    } else {
      // Create new template
      const newTemplate = await tx.checklistTemplate.create({
        data: { planner_id },
        select: { id: true },
      });
      templateId = newTemplate.id;
    }

    // Create sections and tasks
    for (const sectionData of data.sections) {
      const section = await tx.checklistSection.create({
        data: {
          template_id: templateId,
          name: sectionData.name,
          order: sectionData.order,
        },
      });

      // Create tasks for this section
      for (const taskData of sectionData.tasks) {
        await tx.checklistTask.create({
          data: {
            section_id: section.id,
            template_id: templateId,
            wedding_id: null, // Template tasks don't belong to a wedding
            title: taskData.title,
            description: taskData.description,
            assigned_to: taskData.assigned_to,
            due_date: null, // Templates use relative dates
            due_date_relative: taskData.due_date_relative,
            order: taskData.order,
            status: 'PENDING',
            completed: false,
          },
        });
      }
    }

    // Fetch and return the complete template
    const template = await tx.checklistTemplate.findUnique({
      where: { id: templateId },
      include: {
        sections: {
          where: { template_id: templateId },
          include: {
            tasks: {
              where: { template_id: templateId },
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!template) {
      throw new Error('Failed to create template');
    }

    return template;
  });

  return result as ChecklistTemplateWithSections;
}

/**
 * Copy a planner's template to a wedding's checklist with date conversion
 *
 * Converts all relative dates (e.g., "WEDDING_DATE-90") to absolute dates
 * based on the wedding's wedding_date. Uses a transaction for atomicity.
 *
 * This operation is idempotent - if called multiple times, it will only copy once.
 *
 * @param planner_id - The wedding planner's ID
 * @param wedding_id - The wedding ID to copy the template to
 * @returns Number of tasks created
 * @throws Error if wedding not found or doesn't belong to planner
 */
export async function copyTemplateToWedding(
  planner_id: string,
  wedding_id: string
): Promise<number> {
  // Fetch the template
  const template = await getTemplate(planner_id);

  if (!template) {
    // No template exists - this is not an error, just skip
    return 0;
  }

  // Fetch the wedding to get wedding_date
  const wedding = await prisma.wedding.findUnique({
    where: { id: wedding_id },
    select: { wedding_date: true, planner_id: true },
  });

  if (!wedding) {
    throw new Error(`Wedding with ID ${wedding_id} not found`);
  }

  // Verify planner owns this wedding
  if (wedding.planner_id !== planner_id) {
    throw new Error('Wedding does not belong to this planner');
  }

  const weddingDate = wedding.wedding_date;

  if (!weddingDate || !(weddingDate instanceof Date)) {
    throw new Error('Wedding must have a valid wedding_date');
  }

  // Check if checklist already exists for this wedding
  const existingTasks = await prisma.checklistTask.count({
    where: { wedding_id },
  });

  if (existingTasks > 0) {
    // Checklist already exists, don't overwrite
    return 0;
  }

  // Use transaction to copy all sections and tasks atomically
  const tasksCreated = await prisma.$transaction(
    async (tx) => {
      let taskCount = 0;

      for (const section of template.sections) {
        // Create section for the wedding
        const newSection = await tx.checklistSection.create({
          data: {
            wedding_id,
            template_id: null, // Wedding sections don't reference template
            name: section.name,
            order: section.order,
          },
        });

        // Create tasks for this section
        for (const task of section.tasks) {
          // Convert relative date to absolute date
          let absoluteDueDate: Date | null = null;

          if (task.due_date_relative) {
            try {
              absoluteDueDate = convertRelativeDateToAbsolute(
                task.due_date_relative as RelativeDateFormat,
                weddingDate
              );
            } catch (error) {
              // Log error but continue - skip invalid dates
              console.warn(
                `Failed to convert relative date "${task.due_date_relative}" for task "${task.title}":`,
                error
              );
            }
          }

          await tx.checklistTask.create({
            data: {
              section_id: newSection.id,
              wedding_id,
              template_id: null, // Wedding tasks don't reference template
              title: task.title,
              description: task.description,
              assigned_to: task.assigned_to,
              due_date: absoluteDueDate,
              due_date_relative: null, // Wedding tasks use absolute dates
              status: 'PENDING',
              completed: false,
              order: task.order,
            },
          });

          taskCount++;
        }
      }

      return taskCount;
    },
    {
      timeout: 10000, // 10 second timeout for large templates
    }
  );

  return tasksCreated;
}

/**
 * Delete a planner's checklist template
 *
 * Cascade deletes all sections and tasks associated with the template.
 *
 * @param planner_id - The wedding planner's ID
 * @returns true if template was deleted, false if it didn't exist
 */
export async function deleteTemplate(planner_id: string): Promise<boolean> {
  const result = await prisma.checklistTemplate.deleteMany({
    where: { planner_id },
  });

  return result.count > 0;
}
