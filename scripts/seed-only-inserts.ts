/**
 * Seed master templates by extracting only INSERT statements from migration
 * Run with: DATABASE_URL="..." npx tsx scripts/seed-only-inserts.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { prisma } from '../src/lib/db/prisma';

async function main() {
  console.log('Reading migration file...');

  const migrationPath = join(__dirname, '..', 'prisma', 'migrations', '20260212000000_add_planner_message_templates', 'migration.sql');
  const migrationSQL = readFileSync(migrationPath, 'utf-8');

  console.log('Extracting seed statements...');

  // Extract only the parts after "CREATE EXTENSION IF NOT EXISTS"
  const parts = migrationSQL.split('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

  if (parts.length < 2) {
    throw new Error('Could not find uuid-ossp extension declaration');
  }

  // Get everything after the extension declaration
  // This includes all the INSERT statements and the DO block
  const seedStatements = parts[1];

  // Remove the CREATE TABLE and extension statements
  const cleanedSQL = seedStatements
    .replace(/CREATE EXTENSION[^;]+;/gs, '')
    .replace(/CREATE TABLE[^;]+;/gs, '')
    .replace(/CREATE UNIQUE INDEX[^;]+;/gs, '')
    .replace(/CREATE INDEX[^;]+;/gs, '')
    .replace(/ALTER TABLE[^;]+;/gs, '')
    .replace(/uuid_generate_v4\(\)/g, 'gen_random_uuid()'); // Use built-in function

  console.log('Executing seed statements...');

  try {
    // Execute the cleaned SQL
    await prisma.$executeRawUnsafe(cleanedSQL);

    console.log('✓ Seed executed successfully');

    // Verify the count
    const masterCount = await prisma.masterMessageTemplate.count();
    const plannerCount = await prisma.plannerMessageTemplate.count();

    console.log(`✓ Master templates: ${masterCount}`);
    console.log(`✓ Planner templates seeded: ${plannerCount}`);

  } catch (error: any) {
    console.error('Error executing seed:', error.message);

    // Check if it's a duplicate key error (already seeded)
    if (error.message.includes('duplicate key') || error.message.includes('already exists')) {
      console.log('ℹ️  Templates may already be seeded. Checking...');
      const masterCount = await prisma.masterMessageTemplate.count();
      const plannerCount = await prisma.plannerMessageTemplate.count();
      console.log(`  Master templates: ${masterCount}`);
      console.log(`  Planner templates: ${plannerCount}`);

      if (masterCount > 0) {
        console.log('✓ Templates already exist, skipping seed');
        return;
      }
    }

    throw error;
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
