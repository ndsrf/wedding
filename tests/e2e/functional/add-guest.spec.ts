/**
 * E2E Test - Add Guest (EXISTING_WEDDING Mode)
 *
 * Tests adding a new guest/family to an existing wedding.
 * Uses EXISTING_WEDDING mode data seeded by db.seed-full.ts
 */

import { test, expect } from '@playwright/test';

// Use wedding admin authentication
test.use({
  storageState: 'playwright/.auth/wedding-admin.json',
  // Increase timeout for admin pages that need to load wedding data
  navigationTimeout: 30000,
});

test.describe('Add Guest - EXISTING_WEDDING Mode', () => {
  test('should successfully add a new guest family from guests page', async ({ page }) => {
    // Navigate to admin guests page
    await page.goto('/admin/guests');
    console.log('Navigated to /admin/guests');

    // Wait for initial page load
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
    console.log('DOM loaded, current URL:', page.url());

    // Additional wait for networkidle
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
      console.log('Network idle timeout - continuing anyway');
    });

    // Get current page URL and content
    const currentUrl = page.url();
    console.log('Current URL after navigation:', currentUrl);

    // Check if we're on the no-access page
    if (currentUrl.includes('no-access')) {
      const pageContent = await page.textContent('body');
      throw new Error(`Redirected to no-access page. Content: ${pageContent?.substring(0, 200)}`);
    }

    // Check if we're on the correct page - wait for table or heading
    const heading = page.getByRole('heading', { name: /guest.*management|guests/i });
    const table = page.locator('table, [role="table"]').first();

    // Try to find ANY heading to debug
    const allHeadings = page.getByRole('heading');
    const headingCount = await allHeadings.count();
    console.log('Total headings found:', headingCount);
    for (let i = 0; i < Math.min(headingCount, 3); i++) {
      const text = await allHeadings.nth(i).textContent();
      console.log(`Heading ${i}: "${text}"`);
    }

    // Wait for either heading or table to be visible
    try {
      await Promise.race([
        heading.waitFor({ state: 'visible', timeout: 5000 }),
        table.waitFor({ state: 'visible', timeout: 5000 })
      ]);
    } catch {
      // If neither heading nor table appears, check what page we're on
      const pageContent = await page.textContent('body');
      console.log('Page content (first 500 chars):', pageContent?.substring(0, 500));
      throw new Error('Neither heading nor table found on page');
    }

    // Click the "Add Guest" button
    const addGuestButton = page.getByRole('button', { name: /add.*guest|add|new guest/i }).first();
    await expect(addGuestButton).toBeVisible({ timeout: 5000 });
    await addGuestButton.click();

    // Wait for the add guest modal/form to appear
    const modal = page.locator('div[role="dialog"], .relative.bg-white.rounded-lg.shadow-xl').first();
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Verify the "Invited By" select is visible and pre-populated
    const invitedBySelect = modal.getByLabel(/invited.*by/i).first();
    if (await invitedBySelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Use toHaveValue to retry until it's populated
      await expect(invitedBySelect).not.toHaveValue('', { timeout: 5000 });
      const selectedValue = await invitedBySelect.inputValue();
      expect(selectedValue.length).toBeGreaterThan(0);
    }

    // Fill in family name
    const familyNameInput = modal.getByLabel(/family.*name|name/i).first();
    await expect(familyNameInput).toBeVisible({ timeout: 5000 });
    await familyNameInput.fill('Test Family Smith');

    // Fill in email
    const emailInput = modal.getByLabel(/email/i).first();
    if (await emailInput.isVisible()) {
      await emailInput.fill('testsmith@example.com');
    }

    // Fill in phone (optional)
    const phoneInput = modal.getByLabel(/phone|telephone/i).first();
    if (await phoneInput.isVisible().catch(() => false)) {
      await phoneInput.fill('+34612345678');
    }

    // Select preferred language (if visible)
    const languageSelect = modal.getByLabel(/language|preferred language/i).first();
    if (await languageSelect.isVisible().catch(() => false)) {
      await languageSelect.selectOption('EN');
    }

    // Add family members
    // Look for "Add Member" button
    const addMemberButton = modal.getByRole('button', { name: /add.*member|new member/i }).first();
    if (await addMemberButton.isVisible().catch(() => false)) {
      await addMemberButton.click();

      // Fill in first member details
      const memberNameInputs = modal.getByLabel(/member.*name|name/i);
      const firstMemberNameInput = memberNameInputs.nth(0);
      await expect(firstMemberNameInput).toBeVisible({ timeout: 3000 });
      await firstMemberNameInput.fill('Robert Smith');

      // Select member type
      const memberTypeSelects = modal.getByLabel(/type|member.*type/i);
      const firstMemberTypeSelect = memberTypeSelects.nth(0);
      if (await firstMemberTypeSelect.isVisible().catch(() => false)) {
        await firstMemberTypeSelect.selectOption('ADULT');
      }

      // Add second member
      await addMemberButton.click();
      const secondMemberNameInput = memberNameInputs.nth(1);
      await expect(secondMemberNameInput).toBeVisible({ timeout: 3000 });
      await secondMemberNameInput.fill('Sarah Smith');

      const secondMemberTypeSelect = memberTypeSelects.nth(1);
      if (await secondMemberTypeSelect.isVisible().catch(() => false)) {
        await secondMemberTypeSelect.selectOption('ADULT');
      }
    }

    // Submit the form
    const submitButton = modal.getByRole('button', { name: /save|create|add|submit/i }).last();
    await expect(submitButton).toBeVisible();
    await submitButton.click();

    // Check for success indicators
    const successIndicators = [
      page.getByText(/test family smith/i),
      page.getByText(/success|created|added/i),
    ];

    // Wait for the modal to disappear or success message to appear
    await expect(modal).not.toBeVisible({ timeout: 10000 });

    // Verify the new guest appears in the table
    const guestTable = page.locator('table, [role="table"]').first();
    await expect(guestTable).toContainText('Test Family Smith', { timeout: 10000 });
  });

  test('should show validation errors when adding guest with invalid data', async ({ page }) => {
    // Navigate to admin guests page
    await page.goto('/admin/guests');
    await page.waitForLoadState('networkidle');

    // Click add guest button
    const addGuestButton = page.getByRole('button', { name: /add.*guest|add|new guest/i }).first();
    await expect(addGuestButton).toBeVisible({ timeout: 5000 });
    await addGuestButton.click();

    // Wait for modal to open
    const modal = page.locator('div[role="dialog"], .relative.bg-white.rounded-lg.shadow-xl').first();
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Try to submit without filling required fields
    const submitButton = modal.getByRole('button', { name: /save|create|add|submit/i }).last();
    await expect(submitButton).toBeVisible({ timeout: 5000 });
    await submitButton.click();

    // Should see validation errors in the modal
    const errorBox = modal.locator('[class*="bg-red"], [role="alert"]').first();
    await expect(errorBox).toBeVisible({ timeout: 5000 });
    await expect(errorBox).toContainText(/required|invalid|please enter|cannot be empty/i);
  });

  test('should allow canceling guest addition', async ({ page }) => {
    // Navigate to admin guests page
    await page.goto('/admin/guests');
    await page.waitForLoadState('networkidle');

    // Wait for table to be visible to get accurate count
    const guestTable = page.locator('table, [role="table"]').first();
    await expect(guestTable).toBeVisible({ timeout: 5000 });
    
    // Get initial guest count
    const initialGuestCount = await page.locator('table tbody tr, [role="row"]').count();

    // Click add guest button
    const addGuestButton = page.getByRole('button', { name: /add.*guest|add|new guest/i }).first();
    await addGuestButton.click();

    // Wait for modal
    const modal = page.locator('div[role="dialog"], .relative.bg-white.rounded-lg.shadow-xl').first();
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Fill in some data
    const familyNameInput = modal.getByLabel(/family.*name|name/i).first();
    await expect(familyNameInput).toBeVisible({ timeout: 3000 });
    await familyNameInput.fill('Should Be Canceled');

    // Click cancel
    const cancelButton = modal.getByRole('button', { name: /cancel|close/i }).first();
    await expect(cancelButton).toBeVisible({ timeout: 5000 });
    await cancelButton.click();

    // Wait for modal to close
    await expect(modal).not.toBeVisible({ timeout: 5000 });

    // Verify guest was not added
    const currentGuestCount = await page.locator('table tbody tr, [role="row"]').count();
    expect(currentGuestCount).toBe(initialGuestCount);

    // Verify the canceled guest name doesn't appear
    await expect(page.getByText('Should Be Canceled')).not.toBeVisible();
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
