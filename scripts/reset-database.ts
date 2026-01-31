/**
 * Database Reset Utility
 *
 * Fast database reset by truncating all tables except migrations.
 * This is used in test environments to quickly reset state between test runs.
 *
 * Usage: npx tsx scripts/reset-database.ts
 *
 * SECURITY: This script should ONLY be available in test environments.
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Initialize Prisma with the same adapter configuration as the app
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prismaClientOptions: Prisma.PrismaClientOptions = {
  adapter,
};

const prisma = new PrismaClient(prismaClientOptions);

async function resetDatabase() {
  console.log('🔄 Resetting database...');

  // Security check - prevent accidental production resets
  const isTestDatabase =
    process.env.DATABASE_URL?.includes('test') ||
    process.env.DATABASE_URL?.includes('localhost') ||
    process.env.DATABASE_URL?.includes('127.0.0.1') ||
    process.env.DATABASE_URL?.includes('wed5') ||
    process.env.DATABASE_URL?.includes('wed');

  const isProduction = process.env.NODE_ENV === 'production';
  const hasAllowReset = process.env.ALLOW_RESET === 'true';

  if (isProduction) {
    throw new Error(
      '❌ Safety check failed: Cannot run reset on production (NODE_ENV=production). '
    );
  }

  if (!isTestDatabase && !hasAllowReset) {
    throw new Error(
      '❌ Safety check failed: This script can only run on test/dev databases. ' +
      'Detected database does not match test patterns (test, localhost, 127.0.0.1, wed*). ' +
      'If you understand the risks and this IS a test database, set ALLOW_RESET=true'
    );
  }

  try {
    // Get all table names except migrations
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename != '_prisma_migrations'
    `;

    if (tables.length === 0) {
      console.log('✅ No tables found to reset');
      return;
    }

    console.log(`📋 Found ${tables.length} tables to truncate`);

    // Try to disable foreign key checks (requires superuser, optional)
    try {
      await prisma.$executeRawUnsafe('SET session_replication_role = replica;');
      console.log('  ℹ️ Disabled foreign key checks');
    } catch (error) {
      console.log('  ⚠️  Cannot disable foreign key checks (requires superuser, skipping)');
      // Continue anyway - truncate with cascade will handle constraints
    }

    // Truncate all tables
    for (const { tablename } of tables) {
      try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE;`);
        console.log(`  ✓ Truncated ${tablename}`);
      } catch (error: any) {
        // Skip tables that can't be truncated (e.g., protected system tables)
        console.log(`  ⚠️ Could not truncate ${tablename}: ${error.message}`);
      }
    }

    // Try to re-enable foreign key checks
    try {
      await prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT;');
      console.log('  ℹ️ Re-enabled foreign key checks');
    } catch (error) {
      console.log('  ⚠️  Could not re-enable foreign key checks (already at default)');
    }

    console.log('✅ Database reset complete!');
  } catch (error) {
    console.error('❌ Reset failed:', error);
    throw error;
  }
}

resetDatabase()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
