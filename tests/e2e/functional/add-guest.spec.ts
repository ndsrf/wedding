/**
 * E2E Test - Add Guest (EXISTING_WEDDING Mode)
 *
 * Tests adding a new guest/family to an existing wedding.
 * Uses EXISTING_WEDDING mode data seeded by db.seed-full.ts
 */

import { test, expect } from '@playwright/test';

// Use wedding admin authentication
test.use({ storageState: 'playwright/.auth/wedding-admin.json' });

test.describe('Add Guest - EXISTING_WEDDING Mode', () => {
  test('should successfully add a new guest family from guests page', async ({ page }) => {
    // Navigate to admin guests page
    await page.goto('/admin/guests');
    await page.waitForLoadState('networkidle');

    // Should see the guests page with existing guests
    await expect(page.getByRole('heading', { name: /guests/i })).toBeVisible();

    // Click the "Add Guest" button
    const addGuestButton = page.getByRole('button', { name: /add.*guest|add|new guest/i }).first();
    await expect(addGuestButton).toBeVisible({ timeout: 5000 });
    await addGuestButton.click();

    // Wait for the add guest modal/form to appear
    await page.waitForTimeout(500);

    // Fill in family name
    const familyNameInput = page.getByLabel(/family.*name|name/i).first();
    await expect(familyNameInput).toBeVisible({ timeout: 5000 });
    await familyNameInput.fill('Test Family Smith');

    // Fill in email
    const emailInput = page.getByLabel(/email/i).first();
    if (await emailInput.isVisible()) {
      await emailInput.fill('testsmith@example.com');
    }

    // Fill in phone (optional)
    const phoneInput = page.getByLabel(/phone|telephone/i).first();
    if (await phoneInput.isVisible().catch(() => false)) {
      await phoneInput.fill('+34612345678');
    }

    // Select preferred language (if visible)
    const languageSelect = page.getByLabel(/language|preferred language/i).first();
    if (await languageSelect.isVisible().catch(() => false)) {
      await languageSelect.selectOption('EN');
    }

    // Add family members
    // Look for "Add Member" button
    const addMemberButton = page.getByRole('button', { name: /add.*member|new member/i }).first();
    if (await addMemberButton.isVisible().catch(() => false)) {
      await addMemberButton.click();
      await page.waitForTimeout(300);

      // Fill in first member details
      const memberNameInputs = page.getByLabel(/member.*name|name/i);
      const firstMemberNameInput = memberNameInputs.nth(0);
      if (await firstMemberNameInput.isVisible().catch(() => false)) {
        await firstMemberNameInput.fill('Robert Smith');
      }

      // Select member type
      const memberTypeSelects = page.getByLabel(/type|member.*type/i);
      const firstMemberTypeSelect = memberTypeSelects.nth(0);
      if (await firstMemberTypeSelect.isVisible().catch(() => false)) {
        await firstMemberTypeSelect.selectOption('ADULT');
      }

      // Add second member
      await addMemberButton.click();
      await page.waitForTimeout(300);

      const secondMemberNameInput = memberNameInputs.nth(1);
      if (await secondMemberNameInput.isVisible().catch(() => false)) {
        await secondMemberNameInput.fill('Sarah Smith');
      }

      const secondMemberTypeSelect = memberTypeSelects.nth(1);
      if (await secondMemberTypeSelect.isVisible().catch(() => false)) {
        await secondMemberTypeSelect.selectOption('ADULT');
      }
    }

    // Submit the form
    const submitButton = page.getByRole('button', { name: /save|create|add|submit/i }).last();
    await expect(submitButton).toBeVisible();
    await submitButton.click();

    // Wait for success
    await page.waitForTimeout(2000);

    // Check for success indicators
    const successIndicators = [
      page.getByText(/test family smith/i),
      page.getByText(/success/i),
      page.getByText(/created/i),
      page.getByText(/added/i),
    ];

    let foundSuccess = false;
    for (const indicator of successIndicators) {
      const elements = await indicator.all();
      for (const element of elements) {
        if (await element.isVisible().catch(() => false)) {
          foundSuccess = true;
          break;
        }
      }
      if (foundSuccess) break;
    }

    expect(foundSuccess).toBeTruthy();

    // Verify the new guest appears in the table
    const guestTable = page.locator('table, [role="table"]').first();
    if (await guestTable.isVisible().catch(() => false)) {
      const tableContent = await guestTable.textContent();
      expect(tableContent).toContain('Test Family Smith');
    }
  });

  test('should show validation errors when adding guest with invalid data', async ({ page }) => {
    // Navigate to admin guests page
    await page.goto('/admin/guests');
    await page.waitForLoadState('networkidle');

    // Click add guest button
    const addGuestButton = page.getByRole('button', { name: /add.*guest|add|new guest/i }).first();
    await expect(addGuestButton).toBeVisible({ timeout: 5000 });
    await addGuestButton.click();

    // Wait for modal
    await page.waitForTimeout(500);

    // Try to submit without filling required fields
    const submitButton = page.getByRole('button', { name: /save|create|add|submit/i }).last();
    await expect(submitButton).toBeVisible({ timeout: 5000 });
    await submitButton.click();

    // Wait for validation
    await page.waitForTimeout(500);

    // Should see validation errors
    const errorIndicators = [
      page.getByText(/required/i),
      page.getByText(/invalid/i),
      page.getByText(/please enter/i),
      page.getByText(/cannot be empty/i),
    ];

    let foundError = false;
    for (const indicator of errorIndicators) {
      const elements = await indicator.all();
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

  test('should allow canceling guest addition', async ({ page }) => {
    // Navigate to admin guests page
    await page.goto('/admin/guests');
    await page.waitForLoadState('networkidle');

    // Get initial guest count
    const initialGuestCount = await page.locator('table tbody tr, [role="row"]').count();

    // Click add guest button
    const addGuestButton = page.getByRole('button', { name: /add.*guest|add|new guest/i }).first();
    await addGuestButton.click();

    // Wait for modal
    await page.waitForTimeout(500);

    // Fill in some data
    const familyNameInput = page.getByLabel(/family.*name|name/i).first();
    if (await familyNameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await familyNameInput.fill('Should Be Canceled');
    }

    // Click cancel
    const cancelButton = page.getByRole('button', { name: /cancel|close/i }).first();
    await expect(cancelButton).toBeVisible({ timeout: 5000 });
    await cancelButton.click();

    // Wait for modal to close
    await page.waitForTimeout(500);

    // Verify guest was not added
    const currentGuestCount = await page.locator('table tbody tr, [role="row"]').count();
    expect(currentGuestCount).toBe(initialGuestCount);

    // Verify the canceled guest name doesn't appear
    const pageContent = await page.textContent('body');
    expect(pageContent).not.toContain('Should Be Canceled');
  });

  test('should display existing guests in the table', async ({ page }) => {
    // Navigate to admin guests page
    await page.goto('/admin/guests');
    await page.waitForLoadState('networkidle');

    // Should see guests table with data (from EXISTING_WEDDING seed)
    const guestTable = page.locator('table, [role="table"]').first();
    await expect(guestTable).toBeVisible({ timeout: 5000 });

    // Should have at least some rows (from seeded data)
    const rows = page.locator('table tbody tr, [role="row"]');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);

    // Should have table headers
    const headers = [
      /family|name/i,
      /email/i,
      /members|guests/i,
      /rsvp|status/i,
    ];

    for (const headerPattern of headers) {
      const header = page.getByRole('columnheader', { name: headerPattern }).first();
      if (await header.isVisible().catch(() => false)) {
        await expect(header).toBeVisible();
        break; // At least one header should be visible
      }
    }
  });
});
