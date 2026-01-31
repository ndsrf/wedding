/**
 * Database Setup for E2E Tests
 *
 * This setup script:
 * 1. Resets the database (truncates all tables)
 * 2. Seeds NEW_USER mode data (Master Admin, Planner)
 *
 * Runs before auth setup and all other tests.
 *
 * Usage: npm run test:e2e -- --project=db_setup
 */

import { test as setup } from '@playwright/test';
import { execSync } from 'child_process';

setup('reset database and seed NEW_USER', async () => {
  console.log('\n🔄 [DB Setup] Resetting database...');
  try {
    // Reset database - truncate all tables
    execSync('npx ts-node scripts/reset-database.ts', {
      stdio: 'inherit',
      env: { ...process.env, ALLOW_RESET: 'true' }
    });

    console.log('\n📋 [DB Setup] Seeding NEW_USER data...');
    // Seed NEW_USER mode
    execSync('npx ts-node prisma/seed.ts', {
      stdio: 'inherit',
      env: {
        ...process.env,
        SEED_MODE: 'NEW_USER'
      }
    });

    console.log('\n✅ [DB Setup] Database setup complete!');
  } catch (error) {
    console.error('\n❌ [DB Setup] Failed:', error);
    throw error;
  }
});
