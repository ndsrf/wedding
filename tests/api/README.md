# API Integration Tests

This directory contains API integration tests using Playwright's request fixture.

## Overview

API tests verify backend endpoints directly without going through the UI. They're useful for:
- Testing API authentication and authorization
- Verifying data validation and error handling
- Testing edge cases and error scenarios
- Performance testing API responses

## Usage

Tests in this directory can be run using Playwright's request context:

```typescript
import { test, expect } from '@playwright/test';

test('GET /api/guest/family', async ({ request }) => {
  const response = await request.get('/api/guest/family?token=magic-token-here');
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  expect(data).toHaveProperty('family');
});
```

## Test Files

Currently, API tests are placeholders. Tests can be added to:
- `tests/api/guest.spec.ts` - Guest-facing API endpoints
- `tests/api/admin.spec.ts` - Admin API endpoints
- `tests/api/planner.spec.ts` - Wedding planner API endpoints

## Running API Tests

```bash
# Run all API tests
npm run test:e2e -- --grep "api"

# Run specific API test file
npm run test:e2e tests/api/guest.spec.ts
```

## Authentication

API tests can use authenticated requests by leveraging storage state:

```typescript
test.use({ storageState: 'playwright/.auth/master-admin.json' });

test('authenticated API call', async ({ request }) => {
  const response = await request.get('/api/weddings');
  expect(response.ok()).toBeTruthy();
});
```
