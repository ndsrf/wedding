/**
 * Template seeding logic - creates default templates for weddings
 */

import { prisma } from "@/lib/db";
import { getAllDefaultTemplates } from "./defaults";
import { Language, TemplateType, Channel } from "@prisma/client";

/**
 * Seed default templates for a new wedding
 * Creates 30 templates (5 languages × 2 types × 3 channels: EMAIL, WHATSAPP, SMS)
 *
 * @param wedding_id - The wedding ID to seed templates for
 */
export async function seedTemplatesForWedding(wedding_id: string) {
  try {
    const templates = getAllDefaultTemplates();

    // Create all templates in a transaction for consistency
    await prisma.$transaction(
      templates.map((template) =>
        prisma.messageTemplate.create({
          data: {
            wedding_id,
            type: template.type as TemplateType,
            language: template.language as Language,
            channel: template.channel as Channel,
            subject: template.subject,
            body: template.body,
          },
        })
      )
    );

    console.log(
      `✓ Seeded ${templates.length} templates for wedding ${wedding_id}`
    );
    return { success: true, count: templates.length };
  } catch (error) {
    console.error(`✗ Failed to seed templates for wedding ${wedding_id}:`, error);
    throw error;
  }
}

/**
 * Seed templates for all weddings that don't have them (for backfilling)
 * Useful for migrating existing weddings to use the new template system
 */
export async function seedMissingTemplates() {
  try {
    // Get all weddings
    const weddings = await prisma.wedding.findMany({
      select: { id: true },
    });

    let totalSeeded = 0;
    let alreadyHad = 0;

    for (const wedding of weddings) {
      // Check if wedding already has templates
      const count = await prisma.messageTemplate.count({
        where: { wedding_id: wedding.id },
      });

      if (count === 0) {
        const result = await seedTemplatesForWedding(wedding.id);
        totalSeeded += result.count;
      } else {
        alreadyHad++;
      }
    }

    console.log(
      `\nTemplate seeding complete: ${totalSeeded} templates seeded, ${alreadyHad} weddings already had templates`
    );
    return { success: true, totalSeeded, alreadyHad };
  } catch (error) {
    console.error("Failed to seed missing templates:", error);
    throw error;
  }
}

/**
 * Reset templates for a wedding back to defaults
 * (Useful for testing or if user wants to start fresh)
 */
export async function resetTemplatesToDefaults(wedding_id: string) {
  try {
    // Delete existing templates
    await prisma.messageTemplate.deleteMany({
      where: { wedding_id },
    });

    // Seed new ones
    const result = await seedTemplatesForWedding(wedding_id);
    console.log(`✓ Reset templates for wedding ${wedding_id} to defaults`);
    return result;
  } catch (error) {
    console.error(
      `✗ Failed to reset templates for wedding ${wedding_id}:`,
      error
    );
    throw error;
  }
}

/**
 * Check if a wedding needs template seeding
 */
export async function weddingNeedsTemplateSeeding(wedding_id: string) {
  const count = await prisma.messageTemplate.count({
    where: { wedding_id },
  });
  return count === 0;
}

/**
 * Get template seeding status for a wedding
 */
export async function getTemplatesSeedingStatus(wedding_id: string) {
  const total = await prisma.messageTemplate.count({
    where: { wedding_id },
  });

  const languages = ["ES", "EN", "FR", "IT", "DE"];
  const types = ["INVITATION", "REMINDER"];
  const channels = ["EMAIL", "WHATSAPP", "SMS"];

  const expected = languages.length * types.length * channels.length;

  return {
    wedding_id,
    seeded: total,
    expected,
    complete: total === expected,
    missing: expected - total,
  };
}
