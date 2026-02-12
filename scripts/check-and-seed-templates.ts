/**
 * Check and seed master templates if needed
 * Run with: npx tsx scripts/check-and-seed-templates.ts
 */

import { prisma } from '../src/lib/db/prisma';
import { seedPlannerTemplatesFromMaster } from '../src/lib/templates/planner-seed';

async function main() {
  console.log('Checking master templates...');

  const masterCount = await prisma.masterMessageTemplate.count();
  console.log(`Found ${masterCount} master templates`);

  if (masterCount === 0) {
    console.log('⚠️  No master templates found. Please run the migration SQL to seed them.');
    console.log('   You can run: DATABASE_URL="..." psql $DATABASE_URL -f prisma/migrations/20260212000000_add_planner_message_templates/migration.sql');
    process.exit(1);
  }

  console.log('✓ Master templates exist');

  // Check planner templates
  console.log('\nChecking planner templates...');
  const planners = await prisma.weddingPlanner.findMany({
    select: { id: true, name: true },
  });

  console.log(`Found ${planners.length} planners`);

  for (const planner of planners) {
    const plannerTemplateCount = await prisma.plannerMessageTemplate.count({
      where: { planner_id: planner.id },
    });

    if (plannerTemplateCount === 0) {
      console.log(`  Seeding templates for planner: ${planner.name}`);
      await seedPlannerTemplatesFromMaster(planner.id);
    } else {
      console.log(`  ✓ Planner ${planner.name} already has ${plannerTemplateCount} templates`);
    }
  }

  console.log('\n✓ All done!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
