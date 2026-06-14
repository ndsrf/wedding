
import { prisma } from '../src/lib/db/prisma';

async function main() {
  try {
    const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'weddings' AND column_name = 'show_iban_on_rsvp';
    `;
    console.log('Column check result:', result);
  } catch (e) {
    console.error('Failed to check column:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
