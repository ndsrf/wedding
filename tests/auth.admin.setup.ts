/**
 * Authentication Setup for Wedding Admin (Couple)
 *
 * This setup script authenticates specifically as the Wedding Admin
 * and saves the storage state for reuse in functional tests.
 *
 * Runs after the full wedding database seed (db_seed_full).
 */

import { test as setup } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// Storage state file paths
const authDir = path.join(__dirname, '../playwright/.auth');
const authFile = path.join(authDir, 'wedding-admin.json');

// Ensure auth directory exists
if (!fs.existsSync(authDir)) {
  fs.mkdirSync(authDir, { recursive: true });
}

// Test user credentials (must match those seeded in prisma/seed.ts)
const adminEmail = process.env.WEDDING_ADMIN_EMAIL || 'admin@example.com';

/**
 * Authenticate as Wedding Admin
 */
setup('authenticate as wedding admin', async ({ page, context }) => {
  console.log('💕 [Auth] Authenticating Wedding Admin (couple)...');

  // Go to signin page
  await page.goto('/auth/signin');

  // Check if E2E credentials provider is available
  const emailInput = page.getByLabel(/email|enter your email|e2e login/i).first();
  
  // Wait for the input to appear (it might take a moment for hydration)
  await emailInput.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {
    console.log('   (Timeout waiting for email input, checking visibility...)');
  });

  if (await emailInput.isVisible()) {
    console.log('   Using E2E credentials provider');
    await emailInput.fill(adminEmail);

    const signInButton = page.getByRole('button', { name: /sign in|login/i }).first();
    await signInButton.click();

    // Wait for redirect to wedding admin dashboard
    // Couples are usually redirected to /admin
    await page.waitForURL(/(admin|planner)?$/, { timeout: 15000 });
  } else {
    console.warn('   ⚠️ E2E credentials provider not available');
    throw new Error('E2E auth provider not configured');
  }

  // Wait for page to be ready
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
    // Network idle might timeout, but page should be loaded
  });

  // Save authentication state
  await context.storageState({ path: authFile });
  console.log(`   ✓ Wedding Admin authenticated and saved\n`);
});
