/**
 * E2E Test - Create Wedding (NEW_USER Mode)
 *
 * Tests the wedding creation flow for a planner in NEW_USER mode
 * where no wedding exists yet.
 */

import { test, expect } from '@playwright/test';

// Use planner authentication
test.use({ storageState: 'playwright/.auth/planner.json' });

test.describe('Create Wedding - NEW_USER Mode', () => {
  test('should successfully create a new wedding from planner dashboard', async ({ page }) => {
    // Capture the POST /api/planner/weddings response for diagnostics on failure
    let weddingApiStatus: number | null = null;
    let weddingApiBody: string | null = null;
    page.on('response', async (response) => {
      if (
        response.url().includes('/api/planner/weddings') &&
        response.request().method() === 'POST'
      ) {
        weddingApiStatus = response.status();
        weddingApiBody = await response.text().catch(() => '<unreadable>');
      }
    });

    // Navigate to planner dashboard
    await page.goto('/planner');
    await page.waitForLoadState('networkidle');

    // Should see the "Create Wedding" button in the header
    const createWeddingButton = page.getByRole('link', { name: /create wedding/i }).first();
    await expect(createWeddingButton).toBeVisible();

    // Click the create wedding button
    await createWeddingButton.click();

    // Should navigate to the weddings page with action=create
    await page.waitForURL(/\/planner\/weddings\?action=create/);

    // Wait for the create wedding form/modal to be visible
    // The form might be in a modal or on the page itself
    await page.waitForTimeout(500); // Brief wait for modal animation

    // Fill in wedding details
    const coupleNamesInput = page.getByLabel(/couple.*names?|names? of.*couple/i).first();
    await expect(coupleNamesInput).toBeVisible({ timeout: 5000 });
    await coupleNamesInput.fill('John Smith & Jane Doe');

    // Fill in wedding date
    const weddingDateInput = page.getByLabel(/wedding date|date/i).first();
    await expect(weddingDateInput).toBeVisible();

    // Set date to 6 months in the future
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 6);
    const dateString = futureDate.toISOString().split('T')[0]; // YYYY-MM-DD format
    await weddingDateInput.fill(dateString);

    // Fill in wedding time (required — use stable ID selector)
    await expect(page.locator('#wedding_time')).toBeVisible({ timeout: 5000 });
    await page.locator('#wedding_time').fill('18:00');

    // Fill in location (now a dropdown of pre-configured locations; optional field)
    const locationSelect = page.locator('#main_event_location_id');
    if (await locationSelect.isVisible().catch(() => false)) {
      const optionCount = await locationSelect.locator('option').count();
      if (optionCount > 1) {
        await locationSelect.selectOption({ index: 1 });
      }
    }

    // Fill in RSVP cutoff date (required)
    const rsvpCutoffInput = page.getByLabel(/rsvp cutoff/i).first();
    await expect(rsvpCutoffInput).toBeVisible();
    
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() + 5); // 1 month before wedding
    const cutoffString = cutoffDate.toISOString().split('T')[0];
    await rsvpCutoffInput.fill(cutoffString);

    // Fill in admin email
    const adminEmailInput = page.getByLabel(/admin.*email|email.*admin|couple.*email/i).first();
    if (await adminEmailInput.isVisible()) {
      await adminEmailInput.fill('newcouple@example.com');
    }

    // Submit the form
    const submitButton = page.locator('form').getByRole('button', { name: /create|save|submit/i });
    await submitButton.click();

    // Wait for the modal to close and URL to change after successful creation.
    // On failure, throw a descriptive error with the API response and any UI error.
    await page.waitForURL(
      (url) => url.pathname.includes('/planner') && url.searchParams.get('action') !== 'create',
      { timeout: 15000 }
    ).catch(async (_timeoutErr) => {
      // Collect diagnostics: API response and any error shown in the form
      const submitErrorEl = page.locator('div.bg-red-50 p');
      const submitErrorText = await submitErrorEl.first().textContent().catch(() => '');
      const anyRedText = await page.locator('.text-red-700,.text-red-600,.text-red-500').first().textContent().catch(() => '');
      throw new Error(
        `URL did not leave ?action=create after 15s.\n` +
        `  API POST status: ${weddingApiStatus ?? 'no request observed'}\n` +
        `  API POST body: ${weddingApiBody ?? 'n/a'}\n` +
        `  submitError shown: "${submitErrorText}"\n` +
        `  any red text: "${anyRedText}"\n` +
        `  current URL: ${page.url()}`
      );
    });

    // Verify the new wedding appears in the list
    await expect(page.getByText(/john smith.*jane doe/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('should show validation errors for invalid wedding data', async ({ page }) => {
    // Navigate to planner dashboard
    await page.goto('/planner');
    await page.waitForLoadState('networkidle');

    // Click create wedding button
    const createWeddingButton = page.getByRole('link', { name: /create wedding/i }).first();
    await createWeddingButton.click();

    // Wait for form
    await page.waitForURL(/\/planner\/weddings\?action=create/);
    await page.waitForTimeout(500);

    // Try to submit empty form
    const submitButton = page.locator('form').getByRole('button', { name: /create|save|submit/i });
    await expect(submitButton).toBeVisible({ timeout: 5000 });
    await submitButton.click();

    // Should see validation errors
    await page.waitForTimeout(500);

    // Check for error messages
    const errorMessages = [
      page.getByText(/required/i),
      page.getByText(/invalid/i),
      page.getByText(/please.*enter/i),
      page.getByText(/cannot be empty/i),
    ];

    let foundError = false;
    for (const errorMsg of errorMessages) {
      const elements = await errorMsg.all();
      if (elements.length > 0) {
        for (const element of elements) {
          if (await element.isVisible().catch(() => false)) {
            foundError = true;
            break;
          }
        }
        if (foundError) break;
      }
    }

    expect(foundError).toBeTruthy();
  });

  test('should allow canceling wedding creation', async ({ page }) => {
    // Navigate to planner dashboard
    await page.goto('/planner');
    await page.waitForLoadState('networkidle');

    // Click create wedding button
    const createWeddingButton = page.getByRole('link', { name: /create wedding/i }).first();
    await createWeddingButton.click();

    // Wait for form
    await page.waitForURL(/\/planner\/weddings\?action=create/);
    await page.waitForTimeout(500);

    // Look for cancel button
    const cancelButton = page.getByRole('button', { name: /cancel|close/i }).first();

    if (await cancelButton.isVisible().catch(() => false)) {
      await cancelButton.click();
      await page.waitForTimeout(500);

      // Should return to weddings list or dashboard
      const currentUrl = page.url();
      const isCanceled =
        !currentUrl.includes('action=create') ||
        currentUrl === '/planner' ||
        currentUrl === '/planner/weddings';
      expect(isCanceled).toBeTruthy();
    } else {
      // If no cancel button, try navigating back
      await page.goBack();
      await page.waitForLoadState('networkidle');

      // Should be back at planner dashboard
      expect(page.url()).toContain('/planner');
    }
  });
});
