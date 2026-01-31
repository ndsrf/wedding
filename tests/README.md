# Tests

This directory contains all test files for the wedding management platform.

## Directory Structure

```
tests/
├── unit/               - Unit tests for utilities and services (Jest)
├── integration/        - Integration tests for API routes (Jest)
├── e2e/               - End-to-end tests (Playwright)
│   ├── onboarding/    - Onboarding flow tests
│   └── functional/    - Main application feature tests
├── api/               - API integration tests (Playwright request fixture)
├── db.setup.ts        - Database reset and NEW_USER seed (Playwright setup)
├── db.seed-full.ts    - Full wedding seed (Playwright setup)
└── auth.setup.ts      - Authentication setup for all roles (Playwright setup)
```

## Testing Strategy

- **Unit Tests** (Jest): Test individual functions and utilities
- **Integration Tests** (Jest): Test API routes with database
- **E2E Tests** (Playwright): Test complete workflows in browser
- **API Tests** (Playwright): Test API endpoints directly without UI

## E2E Testing Flow

The E2E tests run in a specific sequence to maintain database state:

1. **db_setup** - Reset database and seed NEW_USER mode
2. **auth_setup** - Authenticate as all three user roles
3. **onboarding_suite** - Test onboarding flows (uses NEW_USER data)
4. **db_seed_full** - Reset database and seed EXISTING_WEDDING mode
5. **functional_suite** - Test main features (uses full wedding data)

### User Roles for Testing

Three test user accounts are seeded:
- **Master Admin** (`master@example.com`) - Platform administration
- **Wedding Planner** (`planner@example.com`) - Wedding creation and management
- **Wedding Admin** (`admin@example.com`) - Couple's wedding account

Override these with environment variables:
```bash
MASTER_ADMIN_EMAIL=custom@example.com \
PLANNER_EMAIL=custom-planner@example.com \
WEDDING_ADMIN_EMAIL=custom-couple@example.com \
npm run test:e2e
```

## Running Tests

```bash
# Run all tests (unit + integration + e2e)
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run all E2E tests (sequential)
npm run test:e2e

# Run specific E2E project
npm run test:e2e -- --project=auth_setup
npm run test:e2e -- --project=onboarding_suite
npm run test:e2e -- --project=functional_suite

# Run tests with coverage
npm run test:coverage

# Run E2E tests in debug mode
npm run test:e2e -- --debug

# View E2E test report
npm run test:e2e
# Then: npx playwright show-report
```

## Environment Variables for E2E Testing

```bash
# Enable E2E authentication bypass (REQUIRED for E2E tests)
NEXT_PUBLIC_IS_E2E=true

# Database URL (test database)
DATABASE_URL=postgresql://wedding:wedding@localhost:5432/wedding_test

# NextAuth configuration
NEXTAUTH_SECRET=test-secret
NEXTAUTH_URL=http://localhost:3000

# Playwright configuration
PLAYWRIGHT_BASE_URL=http://localhost:3000

# Test user emails
MASTER_ADMIN_EMAIL=master@example.com
PLANNER_EMAIL=planner@example.com
WEDDING_ADMIN_EMAIL=admin@example.com
```

## Authentication Setup

The `auth.setup.ts` file handles authentication for all test suites:

1. Logs in as Master Admin and saves auth state to `playwright/.auth/master-admin.json`
2. Logs in as Wedding Planner and saves auth state to `playwright/.auth/planner.json`
3. Logs in as Wedding Admin and saves auth state to `playwright/.auth/wedding-admin.json`

These auth states are then reused in test files via `storageState` option:

```typescript
test.use({ storageState: 'playwright/.auth/master-admin.json' });

test('master admin feature', async ({ page }) => {
  // User is already authenticated as master admin
});
```

## Database Setup

### NEW_USER Mode (Onboarding Tests)
Minimal setup with:
- 1 Master Admin
- 1 Wedding Planner
- System themes
- Provider categories

### EXISTING_WEDDING Mode (Functional Tests)
Complete wedding scenario with:
- All NEW_USER data
- 1 Complete Wedding
- 40-50 families with 120+ members
- Realistic RSVP data (~75% completion)
- 8-10 tables with seating assignments
- Message templates for all channels/languages
- Tracking events
- Checklist with sections and tasks
- Providers and payments

## Coverage Target

Aim for 80% code coverage across the application (unit + integration tests).

## CI/CD Integration

E2E tests are automatically run in GitHub Actions on every push to `main`:
- See `.github/workflows/e2e-deploy.yml`
- Docker image only builds if E2E tests pass
- Successful builds are deployed via Watchtower auto-update
