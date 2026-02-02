/**
 * Authentication Setup for E2E Tests
 *
 * This setup script authenticates as each of the three user roles and saves
 * storage state (cookies, localStorage) for reuse in test suites.
 *
 * Storage states are saved to:
 * - playwright/.auth/master-admin.json
 * - playwright/.auth/planner.json
 * - playwright/.auth/wedding-admin.json
 *
 * Runs after database setup, before all other tests.
 *
 * Usage: npm run test:e2e -- --project=auth_setup
 */

import { test as setup } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// Storage state file paths
const authDir = path.join(__dirname, '../playwright/.auth');
const authFiles = {
  masterAdmin: path.join(authDir, 'master-admin.json'),
  planner: path.join(authDir, 'planner.json'),
  weddingAdmin: path.join(authDir, 'wedding-admin.json'),
};

// Ensure auth directory exists
if (!fs.existsSync(authDir)) {
  fs.mkdirSync(authDir, { recursive: true });
  console.log(`📁 Created auth directory: ${authDir}`);
}

// Test user credentials (must match those seeded in db.setup.ts)
const testUsers = {
  masterAdmin: process.env.MASTER_ADMIN_EMAIL || 'master@example.com',
  planner: process.env.PLANNER_EMAIL || 'planner@example.com',
  weddingAdmin: process.env.WEDDING_ADMIN_EMAIL || 'admin@example.com',
};

console.log('\n📋 [Auth Setup] User credentials:');
console.log(`   Master Admin: ${testUsers.masterAdmin}`);
console.log(`   Planner: ${testUsers.planner}`);
console.log(`   Wedding Admin: ${testUsers.weddingAdmin}\n`);

/**
 * Authenticate as Master Admin
 */
setup('authenticate as master admin', async ({ page, context }) => {
  console.log('👤 [Auth] Authenticating Master Admin...');

  // Go to signin page
  await page.goto('/auth/signin');

  // Check if E2E credentials provider is available
  const emailInput = page.getByLabel(/email|enter your email|e2e login/i).first();
  
  // Wait for the input to appear (it might take a moment for hydration)
  await emailInput.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
    console.log('   (Timeout waiting for email input, checking visibility...)');
  });

  if (await emailInput.isVisible()) {
    // Use E2E credentials provider (email-only login)
    console.log('   Using E2E credentials provider');
    await emailInput.fill(testUsers.masterAdmin);

    const signInButton = page.getByRole('button', { name: /sign in|login/i }).first();
    await signInButton.click();

    // Wait for redirect to master dashboard or home
    await page.waitForURL(/\/(master|admin|planner)?$/, { timeout: 10000 });
  } else {
    // If E2E provider not available, manual OAuth login would be needed
    // For now, we'll skip if not in E2E mode
    console.warn('   ⚠️ E2E credentials provider not available');
    console.warn('   Make sure NEXT_PUBLIC_IS_E2E=true is set');
    throw new Error('E2E auth provider not configured');
  }

  // Wait for page to be ready
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
    // Network idle might timeout, but page should be loaded
  });

  // Save authentication state
  await context.storageState({ path: authFiles.masterAdmin });
  console.log(`   ✓ Master Admin authenticated and saved\n`);
});

/**
 * Authenticate as Wedding Planner
 */
setup('authenticate as planner', async ({ page, context }) => {
  console.log('💼 [Auth] Authenticating Wedding Planner...');

  // Go to signin page
  await page.goto('/auth/signin');

  // Check if E2E credentials provider is available
  const emailInput = page.getByLabel(/email|enter your email|e2e login/i).first();
  
  // Wait for the input to appear (it might take a moment for hydration)
  await emailInput.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {
    console.log('   (Timeout waiting for email input, checking visibility...)');
  });

  if (await emailInput.isVisible()) {
    console.log('   Using E2E credentials provider');
    await emailInput.fill(testUsers.planner);

    const signInButton = page.getByRole('button', { name: /sign in|login/i }).first();
    await signInButton.click();

    // Wait for redirect to planner dashboard
    await page.waitForURL(/\/(planner|admin)?$/, { timeout: 10000 });
  } else {
    console.warn('   ⚠️ E2E credentials provider not available');
    throw new Error('E2E auth provider not configured');
  }

  // Wait for page to be ready
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
    // Network idle might timeout, but page should be loaded
  });

  // Save authentication state
  await context.storageState({ path: authFiles.planner });
  console.log(`   ✓ Wedding Planner authenticated and saved\n`);
});
