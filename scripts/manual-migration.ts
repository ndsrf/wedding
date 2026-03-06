
import { prisma } from '../src/lib/db/prisma';

async function main() {
  try {
    console.log('Adding is_selected column to tasting_dishes...');
    await prisma.$executeRawUnsafe('ALTER TABLE "tasting_dishes" ADD COLUMN IF NOT EXISTS "is_selected" BOOLEAN NOT NULL DEFAULT false;');
    console.log('Column added successfully or already exists.');
  } catch (e) {
    console.error('Failed to add column:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
