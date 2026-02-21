/**
 * E2E Test Helpers
 *
 * Common helper functions for e2e tests
 */

import { Page } from '@playwright/test';

/**
 * Skip the wedding setup wizard if it appears
 *
 * When an admin user first accesses the dashboard, they may be redirected
 * to the wizard. This helper checks if we're on the wizard page and skips it
 * by clicking the "Skip wizard and go to dashboard" button.
 *
 * @param page - Playwright page object
 * @param timeout - Maximum time to wait for wizard elements (default: 5000ms)
 */
export async function skipWizardIfPresent(page: Page, timeout = 5000): Promise<void> {
  try {
    // Check if we're on the wizard page
    const currentUrl = page.url();

    if (currentUrl.includes('/admin/wizard')) {
      console.log('Wizard detected, attempting to skip...');

      // Look for the skip wizard button
      const skipButton = page.getByRole('button', { name: /skip.*wizard|skip.*and.*go.*to.*dashboard/i });

      // Wait a short time for the button to be visible
      const isSkipButtonVisible = await skipButton.isVisible({ timeout: 2000 }).catch(() => false);

      if (isSkipButtonVisible) {
        // Click the skip button
        await skipButton.click();
        console.log('Clicked skip wizard button');

        // Wait for navigation away from wizard
        await page.waitForURL(url => !url.toString().includes('/admin/wizard'), { timeout });
        console.log('Successfully skipped wizard, navigated to:', page.url());
      } else {
        // If no skip button, look for alternative: link to dashboard
        const dashboardLink = page.getByRole('link', { name: /go.*to.*dashboard|dashboard/i });
        const isDashboardLinkVisible = await dashboardLink.isVisible({ timeout: 2000 }).catch(() => false);

        if (isDashboardLinkVisible) {
          await dashboardLink.click();
          await page.waitForURL(url => !url.toString().includes('/admin/wizard'), { timeout });
          console.log('Used dashboard link to skip wizard');
        } else {
          console.log('No skip option found, wizard might already be completed');
        }
      }
    } else {
      console.log('Not on wizard page, skipping wizard check');
    }
  } catch (error) {
    // If wizard skip fails, log but don't fail the test
    // The wizard might already be completed or skipped
    console.log('Wizard skip attempt encountered an issue (this may be okay):', error);
  }
}

/**
 * Navigate to admin page and handle wizard if it appears
 *
 * @param page - Playwright page object
 * @param path - Path to navigate to (e.g., '/admin/guests')
 */
export async function navigateToAdminPage(page: Page, path: string): Promise<void> {
  // Navigate to the desired page
  await page.goto(path);

  // Wait for initial load
  await page.waitForLoadState('domcontentloaded');

  // Check if we were redirected to wizard
  await skipWizardIfPresent(page);

  // If we skipped wizard, navigate to the original destination again
  const currentUrl = page.url();
  if (!currentUrl.includes(path)) {
    console.log(`Redirected away from ${path}, navigating again...`);
    await page.goto(path);
    await page.waitForLoadState('networkidle');
  }
}
