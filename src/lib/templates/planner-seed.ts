/**
 * Template seeding for planners - copies from master templates
 */

import { prisma } from "@/lib/db";

/**
 * Seed planner templates from master templates
 * Called when a new planner is created
 */
export async function seedPlannerTemplatesFromMaster(planner_id: string) {
  try {
    // Check if planner already has templates
    const existingCount = await prisma.plannerMessageTemplate.count({
      where: { planner_id },
    });

    if (existingCount > 0) {
      console.log(`Planner ${planner_id} already has ${existingCount} templates, skipping seed`);
      return { success: true, count: existingCount, skipped: true };
    }

    // Get all master templates
    const masterTemplates = await prisma.masterMessageTemplate.findMany();

    if (masterTemplates.length === 0) {
      console.warn("No master templates found to copy!");
      return { success: false, error: "No master templates available" };
    }

    // Copy all master templates to planner
    await prisma.$transaction(
      masterTemplates.map((template) =>
        prisma.plannerMessageTemplate.create({
          data: {
            planner_id,
            type: template.type,
            language: template.language,
            channel: template.channel,
            subject: template.subject,
            body: template.body,
          },
        })
      )
    );

    console.log(`✓ Seeded ${masterTemplates.length} templates for planner ${planner_id}`);
    return { success: true, count: masterTemplates.length };
  } catch (error) {
    console.error(`✗ Failed to seed templates for planner ${planner_id}:`, error);
    throw error;
  }
}

/**
 * Seed wedding templates from planner templates
 * Called when a new wedding is created
 */
export async function seedWeddingTemplatesFromPlanner(
  wedding_id: string,
  planner_id: string
) {
  try {
    // Check if wedding already has templates
    const existingCount = await prisma.messageTemplate.count({
      where: { wedding_id },
    });

    if (existingCount > 0) {
      console.log(`Wedding ${wedding_id} already has ${existingCount} templates, skipping seed`);
      return { success: true, count: existingCount, skipped: true };
    }

    // Get all planner templates
    const plannerTemplates = await prisma.plannerMessageTemplate.findMany({
      where: { planner_id },
    });

    if (plannerTemplates.length === 0) {
      console.warn(`No planner templates found for planner ${planner_id}!`);
      return { success: false, error: "No planner templates available" };
    }

    // Copy all planner templates to wedding
    await prisma.$transaction(
      plannerTemplates.map((template) =>
        prisma.messageTemplate.create({
          data: {
            wedding_id,
            type: template.type,
            language: template.language,
            channel: template.channel,
            subject: template.subject,
            body: template.body,
            image_url: template.image_url,
            content_template_id: template.content_template_id,
          },
        })
      )
    );

    console.log(`✓ Seeded ${plannerTemplates.length} templates for wedding ${wedding_id}`);
    return { success: true, count: plannerTemplates.length };
  } catch (error) {
    console.error(`✗ Failed to seed templates for wedding ${wedding_id}:`, error);
    throw error;
  }
}

/**
 * Reset planner templates back to master defaults
 */
export async function resetPlannerTemplatesToMaster(planner_id: string) {
  try {
    // Delete existing planner templates
    await prisma.plannerMessageTemplate.deleteMany({
      where: { planner_id },
    });

    // Seed new ones from master
    const result = await seedPlannerTemplatesFromMaster(planner_id);
    console.log(`✓ Reset planner templates for ${planner_id} to master defaults`);
    return result;
  } catch (error) {
    console.error(`✗ Failed to reset planner templates for ${planner_id}:`, error);
    throw error;
  }
}
