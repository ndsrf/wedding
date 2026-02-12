/**
 * Seed master templates by executing the INSERT statements from migration
 * Run with: DATABASE_URL="..." npx tsx scripts/seed-from-migration.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { prisma } from '../src/lib/db/prisma';

async function main() {
  console.log('Reading migration file...');

  const migrationPath = join(__dirname, '..', 'prisma', 'migrations', '20260212000000_add_planner_message_templates', 'migration.sql');
  const migrationSQL = readFileSync(migrationPath, 'utf-8');

  console.log('Executing migration SQL (seed portions only)...');

  try {
    // Execute the migration SQL using Prisma's raw query
    // Split by semicolon to execute statements individually
    await prisma.$executeRawUnsafe(migrationSQL);

    console.log('✓ Migration executed successfully');

    // Verify the count
    const masterCount = await prisma.masterMessageTemplate.count();
    const plannerCount = await prisma.plannerMessageTemplate.count();

    console.log(`✓ Master templates: ${masterCount}`);
    console.log(`✓ Planner templates: ${plannerCount}`);

  } catch (error: any) {
    console.error('Error executing migration:', error.message);
    throw error;
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
