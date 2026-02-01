/**
 * API Tests - Guests Endpoints
 *
 * Tests API endpoints directly via HTTP requests (Playwright request fixture)
 * These are black-box tests that validate the API surface without internal knowledge
 */

import { test, expect } from '@playwright/test';

test.describe('API Tests - Guests Endpoints', () => {
  let weddingAdminContext: any;
  let weddingId: string;

  // Setup: Authenticate and get wedding ID
  test.beforeAll(async ({ browser }) => {
    // Create a new context with wedding admin auth
    weddingAdminContext = await browser.newContext({
      storageState: 'playwright/.auth/wedding-admin.json',
    });

    // Get wedding ID from the wedding details endpoint
    const page = await weddingAdminContext.newPage();
    const response = await page.request.get('/api/admin/wedding');
    const data = await response.json();

    if (data.success && data.data?.id) {
      weddingId = data.data.id;
    }

    await page.close();
  });

  test.afterAll(async () => {
    await weddingAdminContext?.close();
  });

  test('GET /api/admin/guests - should return guest list with pagination', async () => {
    const page = await weddingAdminContext.newPage();

    const response = await page.request.get('/api/admin/guests');

    // Verify response status
    expect(response.status()).toBe(200);

    // Parse response
    const data = await response.json();

    // Verify response structure
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('data');
    expect(data.data).toHaveProperty('items');
    expect(data.data).toHaveProperty('pagination');

    // Verify pagination structure
    expect(data.data.pagination).toHaveProperty('page');
    expect(data.data.pagination).toHaveProperty('limit');
    expect(data.data.pagination).toHaveProperty('total');
    expect(data.data.pagination).toHaveProperty('totalPages');

    // Verify items is an array
    expect(Array.isArray(data.data.items)).toBeTruthy();

    // If there are items, verify structure of first item
    if (data.data.items.length > 0) {
      const firstGuest = data.data.items[0];
      expect(firstGuest).toHaveProperty('id');
      expect(firstGuest).toHaveProperty('wedding_id', weddingId);
      expect(firstGuest).toHaveProperty('name');
      expect(firstGuest).toHaveProperty('members');
      expect(firstGuest).toHaveProperty('rsvp_status');
      expect(firstGuest).toHaveProperty('attending_count');
      expect(firstGuest).toHaveProperty('total_members');
      expect(Array.isArray(firstGuest.members)).toBeTruthy();
    }

    await page.close();
  });

  test('GET /api/admin/guests - should support filtering by search query', async () => {
    const page = await weddingAdminContext.newPage();

    // First, get all guests to find one to search for
    const allGuestsResponse = await page.request.get('/api/admin/guests');
    const allGuestsData = await allGuestsResponse.json();

    if (allGuestsData.data.items.length > 0) {
      const firstGuestName = allGuestsData.data.items[0].name;
      const searchTerm = firstGuestName.split(' ')[0]; // Use first word of name

      // Search for the guest
      const searchResponse = await page.request.get(
        `/api/admin/guests?search=${encodeURIComponent(searchTerm)}`
      );

      expect(searchResponse.status()).toBe(200);

      const searchData = await searchResponse.json();
      expect(searchData.success).toBeTruthy();
      expect(Array.isArray(searchData.data.items)).toBeTruthy();

      // Should have at least one result
      expect(searchData.data.items.length).toBeGreaterThan(0);

      // At least one result should contain the search term
      const foundMatch = searchData.data.items.some((guest: any) =>
        guest.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      expect(foundMatch).toBeTruthy();
    }

    await page.close();
  });

  test('GET /api/admin/guests - should support pagination parameters', async () => {
    const page = await weddingAdminContext.newPage();

    // Request first page with limit of 5
    const response = await page.request.get('/api/admin/guests?page=1&limit=5');

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.success).toBeTruthy();
    expect(data.data.pagination.page).toBe(1);
    expect(data.data.pagination.limit).toBe(5);

    // Items should not exceed the limit
    expect(data.data.items.length).toBeLessThanOrEqual(5);

    await page.close();
  });

  test('POST /api/admin/guests - should create a new guest family', async () => {
    const page = await weddingAdminContext.newPage();

    const newFamily = {
      name: 'API Test Family',
      email: 'apitest@example.com',
      phone: '+34600123456',
      preferred_language: 'EN',
      channel_preference: 'EMAIL',
      members: [
        {
          name: 'John API Test',
          type: 'ADULT',
          age: 35,
        },
        {
          name: 'Jane API Test',
          type: 'ADULT',
          age: 32,
        },
      ],
    };

    const response = await page.request.post('/api/admin/guests', {
      data: newFamily,
    });

    // Verify response status (201 Created)
    expect(response.status()).toBe(201);

    // Parse response
    const data = await response.json();

    // Verify response structure
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('data');

    // Verify created family
    expect(data.data).toHaveProperty('id');
    expect(data.data).toHaveProperty('name', 'API Test Family');
    expect(data.data).toHaveProperty('email', 'apitest@example.com');
    expect(data.data).toHaveProperty('wedding_id', weddingId);
    expect(data.data).toHaveProperty('magic_token'); // Should have a magic token
    expect(data.data).toHaveProperty('reference_code'); // Should have a reference code
    expect(data.data).toHaveProperty('members');
    expect(Array.isArray(data.data.members)).toBeTruthy();
    expect(data.data.members.length).toBe(2);

    // Verify members
    expect(data.data.members[0].name).toBe('John API Test');
    expect(data.data.members[1].name).toBe('Jane API Test');

    // Clean up: Delete the created family
    await page.request.delete(`/api/admin/guests/${data.data.id}`);

    await page.close();
  });

  test('POST /api/admin/guests - should return validation error for invalid data', async () => {
    const page = await weddingAdminContext.newPage();

    const invalidFamily = {
      // Missing required 'name' field
      email: 'invalid-email', // Invalid email format
      preferred_language: 'INVALID', // Invalid language code
    };

    const response = await page.request.post('/api/admin/guests', {
      data: invalidFamily,
    });

    // Should return 400 Bad Request
    expect(response.status()).toBe(400);

    const data = await response.json();

    // Should have error response
    expect(data).toHaveProperty('success', false);
    expect(data).toHaveProperty('error');
    expect(data.error).toHaveProperty('code', 'VALIDATION_ERROR');
    expect(data.error).toHaveProperty('message');
    expect(data.error).toHaveProperty('details');

    // Should have validation errors
    expect(Array.isArray(data.error.details)).toBeTruthy();
    expect(data.error.details.length).toBeGreaterThan(0);

    await page.close();
  });

  test('GET /api/admin/guests - should return 401 for unauthenticated requests', async ({ browser }) => {
    // Create a new context WITHOUT authentication
    const unauthContext = await browser.newContext();
    const page = await unauthContext.newPage();

    const response = await page.request.get('/api/admin/guests');

    // Should return 401 Unauthorized
    expect(response.status()).toBe(401);

    const data = await response.json();
    expect(data).toHaveProperty('success', false);
    expect(data).toHaveProperty('error');
    expect(data.error.code).toBe('UNAUTHORIZED');

    await page.close();
    await unauthContext.close();
  });
});
