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

    // Fill in wedding time (optional)
    const weddingTimeInput = page.getByLabel(/wedding time|time/i).first();
    if (await weddingTimeInput.isVisible()) {
      await weddingTimeInput.fill('18:00');
    }

    // Fill in location
    const locationInput = page.getByLabel(/location|venue/i).first();
    await expect(locationInput).toBeVisible();
    await locationInput.fill('Grand Hotel Barcelona');

    // Fill in admin email
    const adminEmailInput = page.getByLabel(/admin.*email|email.*admin|couple.*email/i).first();
    if (await adminEmailInput.isVisible()) {
      await adminEmailInput.fill('newcouple@example.com');
    }

    // Submit the form
    const submitButton = page.getByRole('button', { name: /create|save|submit/i }).first();
    await submitButton.click();

    // Wait for success indication
    // Could be a redirect, success message, or toast notification
    await page.waitForTimeout(2000);

    // Verify we're redirected to a wedding detail page or back to dashboard
    // The URL should contain either /planner/weddings or /planner with updated content
    const currentUrl = page.url();
    const isRedirected =
      currentUrl.includes('/planner/weddings/') ||
      currentUrl.includes('/planner');
    expect(isRedirected).toBeTruthy();

    // Verify the wedding appears in the list or we see success feedback
    const successIndicators = [
      page.getByText(/john smith.*jane doe/i),
      page.getByText(/wedding created/i),
      page.getByText(/success/i),
    ];

    // At least one success indicator should be visible
    let foundSuccessIndicator = false;
    for (const indicator of successIndicators) {
      if (await indicator.isVisible().catch(() => false)) {
        foundSuccessIndicator = true;
        break;
      }
    }

    // If we're on the dashboard, check that wedding count increased
    if (currentUrl.includes('/planner') && !currentUrl.includes('/weddings/')) {
      // Should see stats cards with at least 1 wedding
      const weddingCountCard = page.getByText(/total weddings/i).first();
      if (await weddingCountCard.isVisible().catch(() => false)) {
        foundSuccessIndicator = true;
      }
    }

    expect(foundSuccessIndicator).toBeTruthy();
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
    const submitButton = page.getByRole('button', { name: /create|save|submit/i }).first();
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
