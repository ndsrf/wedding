
import { prisma } from '../src/lib/db/prisma';

async function main() {
  try {
    console.log('Adding show_iban_on_rsvp column to weddings...');
    await prisma.$executeRawUnsafe('ALTER TABLE "weddings" ADD COLUMN IF NOT EXISTS "show_iban_on_rsvp" BOOLEAN NOT NULL DEFAULT true;');
    console.log('Column added successfully or already exists.');
  } catch (e) {
    console.error('Failed to add column:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
