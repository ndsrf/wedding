/**
 * API Tests - Wedding Configuration Endpoints
 *
 * Tests wedding configuration API endpoints via HTTP requests
 */

import { test, expect } from '@playwright/test';

test.describe('API Tests - Wedding Configuration Endpoints', () => {
  let weddingAdminContext: any;

  test.beforeAll(async ({ browser }) => {
    // Create context with wedding admin auth
    weddingAdminContext = await browser.newContext({
      storageState: 'playwright/.auth/wedding-admin.json',
    });
  });

  test.afterAll(async () => {
    await weddingAdminContext?.close();
  });

  test('GET /api/admin/wedding - should return wedding details', async () => {
    const page = await weddingAdminContext.newPage();

    const response = await page.request.get('/api/admin/wedding');

    // Verify response status
    expect(response.status()).toBe(200);

    // Parse response
    const data = await response.json();

    // Verify response structure
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('data');

    // Verify wedding details
    const wedding = data.data;
    expect(wedding).toHaveProperty('id');
    expect(wedding).toHaveProperty('planner_id');
    expect(wedding).toHaveProperty('couple_names');
    expect(wedding).toHaveProperty('wedding_date');
    expect(wedding).toHaveProperty('wedding_time');
    expect(wedding).toHaveProperty('location');
    expect(wedding).toHaveProperty('status');
    expect(wedding).toHaveProperty('default_language');

    // Verify stats
    expect(wedding).toHaveProperty('guest_count');
    expect(wedding).toHaveProperty('rsvp_count');
    expect(wedding).toHaveProperty('rsvp_completion_percentage');
    expect(wedding).toHaveProperty('attending_count');

    // Verify numeric stats are numbers
    expect(typeof wedding.guest_count).toBe('number');
    expect(typeof wedding.rsvp_count).toBe('number');
    expect(typeof wedding.rsvp_completion_percentage).toBe('number');

    // Verify RSVP configuration fields
    expect(wedding).toHaveProperty('transportation_question_enabled');
    expect(wedding).toHaveProperty('dietary_restrictions_enabled');
    expect(wedding).toHaveProperty('save_the_date_enabled');

    await page.close();
  });

  test('PATCH /api/admin/wedding - should update wedding configuration', async () => {
    const page = await weddingAdminContext.newPage();

    // Get current wedding details
    const getResponse = await page.request.get('/api/admin/wedding');
    const currentData = await getResponse.json();
    const currentDressCode = currentData.data.dress_code;

    // Update dress code
    const newDressCode = currentDressCode === 'Formal Attire' ? 'Casual Chic' : 'Formal Attire';

    const updateData = {
      dress_code: newDressCode,
      additional_info: 'Updated via API test',
    };

    const patchResponse = await page.request.patch('/api/admin/wedding', {
      data: updateData,
    });

    // Verify response status
    expect(patchResponse.status()).toBe(200);

    // Parse response
    const data = await patchResponse.json();

    // Verify response structure
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('data');

    // Verify updated fields
    expect(data.data.dress_code).toBe(newDressCode);
    expect(data.data.additional_info).toBe('Updated via API test');

    // Restore original dress code
    await page.request.patch('/api/admin/wedding', {
      data: { dress_code: currentDressCode },
    });

    await page.close();
  });

  test('PATCH /api/admin/wedding - should update RSVP configuration', async () => {
    const page = await weddingAdminContext.newPage();

    // Get current state
    const getResponse = await page.request.get('/api/admin/wedding');
    const currentData = await getResponse.json();
    const currentTransportationEnabled = currentData.data.transportation_question_enabled;

    // Toggle transportation question
    const updateData = {
      transportation_question_enabled: !currentTransportationEnabled,
      transportation_question_text: 'Do you need transportation to the venue?',
    };

    const patchResponse = await page.request.patch('/api/admin/wedding', {
      data: updateData,
    });

    expect(patchResponse.status()).toBe(200);

    const data = await patchResponse.json();
    expect(data.success).toBeTruthy();
    expect(data.data.transportation_question_enabled).toBe(!currentTransportationEnabled);

    // Restore original state
    await page.request.patch('/api/admin/wedding', {
      data: {
        transportation_question_enabled: currentTransportationEnabled,
      },
    });

    await page.close();
  });

  test('PATCH /api/admin/wedding - should return validation error for invalid data', async () => {
    const page = await weddingAdminContext.newPage();

    const invalidData = {
      payment_tracking_mode: 'INVALID_MODE', // Invalid enum value
      rsvp_cutoff_date: 'not-a-date', // Invalid date format
    };

    const response = await page.request.patch('/api/admin/wedding', {
      data: invalidData,
    });

    // Should return 400 Bad Request
    expect(response.status()).toBe(400);

    const data = await response.json();

    // Should have error response
    expect(data).toHaveProperty('success', false);
    expect(data).toHaveProperty('error');
    expect(data.error).toHaveProperty('code', 'VALIDATION_ERROR');
    expect(data.error).toHaveProperty('details');

    await page.close();
  });

  test('GET /api/admin/wedding - should include available themes', async () => {
    const page = await weddingAdminContext.newPage();

    const response = await page.request.get('/api/admin/wedding');
    const data = await response.json();

    expect(data.success).toBeTruthy();

    // Should have available themes
    expect(data.data).toHaveProperty('available_themes');
    expect(Array.isArray(data.data.available_themes)).toBeTruthy();

    // Should have at least system themes
    expect(data.data.available_themes.length).toBeGreaterThan(0);

    // Verify theme structure
    if (data.data.available_themes.length > 0) {
      const firstTheme = data.data.available_themes[0];
      expect(firstTheme).toHaveProperty('id');
      expect(firstTheme).toHaveProperty('name');
      expect(firstTheme).toHaveProperty('config');
    }

    await page.close();
  });

  test('GET /api/admin/wedding - should return 401 for unauthenticated requests', async ({ browser }) => {
    // Create context without authentication
    const unauthContext = await browser.newContext();
    const page = await unauthContext.newPage();

    const response = await page.request.get('/api/admin/wedding');

    // Should return 401 Unauthorized
    expect(response.status()).toBe(401);

    const data = await response.json();
    expect(data).toHaveProperty('success', false);
    expect(data.error.code).toBe('UNAUTHORIZED');

    await page.close();
    await unauthContext.close();
  });

  test('PATCH /api/admin/wedding - should update extra questions configuration', async () => {
    const page = await weddingAdminContext.newPage();

    // Enable and set extra question
    const updateData = {
      extra_question_1_enabled: true,
      extra_question_1_text: 'Will you attend the welcome dinner?',
      extra_info_1_enabled: true,
      extra_info_1_label: 'Hotel Name',
    };

    const response = await page.request.patch('/api/admin/wedding', {
      data: updateData,
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.success).toBeTruthy();
    expect(data.data.extra_question_1_enabled).toBe(true);
    expect(data.data.extra_question_1_text).toBe('Will you attend the welcome dinner?');
    expect(data.data.extra_info_1_enabled).toBe(true);
    expect(data.data.extra_info_1_label).toBe('Hotel Name');

    await page.close();
  });
});
