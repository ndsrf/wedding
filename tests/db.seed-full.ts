/**
 * Full Wedding Database Seed for E2E Tests
 *
 * This setup script:
 * 1. Resets the database (truncates all tables)
 * 2. Seeds EXISTING_WEDDING mode data (complete wedding scenario)
 *
 * Runs after onboarding tests, before functional test suite.
 * This ensures functional tests have a realistic wedding with data.
 *
 * Usage: npm run test:e2e -- --project=db_seed_full
 */

import { test as setup } from '@playwright/test';
import { execSync } from 'child_process';

setup('seed EXISTING_WEDDING data', async () => {
  console.log('\n🎉 [DB Seed Full] Seeding complete wedding data...');
  try {
    // Reset database - truncate all tables
    console.log('   🔄 Resetting database...');
    execSync('npx tsx scripts/reset-database.ts', {
      stdio: 'inherit',
      env: { ...process.env, ALLOW_RESET: 'true' }
    });

    // Seed EXISTING_WEDDING mode
    console.log('   📋 Seeding EXISTING_WEDDING mode...');
    execSync('npx tsx prisma/seed.ts', {
      stdio: 'inherit',
      env: {
        ...process.env,
        SEED_MODE: 'EXISTING_WEDDING'
      }
    });

    console.log('\n✅ [DB Seed Full] Full wedding data seeded!\n');
  } catch (error) {
    console.error('\n❌ [DB Seed Full] Failed:', error);
    throw error;
  }
});
