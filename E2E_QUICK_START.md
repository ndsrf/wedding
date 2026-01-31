# E2E Testing & Deployment - Quick Start Guide

Quick reference for getting started with the new E2E testing and auto-deployment infrastructure.

## 30-Second Setup

```bash
# 1. Set environment variables
export NEXT_PUBLIC_IS_E2E=true
export DATABASE_URL=postgresql://wedding:wedding@localhost:5432/wed5
export NEXTAUTH_SECRET=test-secret
export NEXTAUTH_URL=http://localhost:3000

# 2. Reset and seed database (one-time)
npx ts-node scripts/reset-database.ts
SEED_MODE=NEW_USER npx ts-node prisma/seed.ts

# 3. Start dev server (in one terminal)
npm run dev

# 4. Run E2E tests (in another terminal)
npm run test:e2e
```

## 5-Minute Tasks

### Reset Database and Start Fresh
```bash
npx ts-node scripts/reset-database.ts
SEED_MODE=NEW_USER npx ts-node prisma/seed.ts
npm run db:studio  # View data in Prisma Studio
```

### Seed Complete Wedding Data
```bash
npx ts-node scripts/reset-database.ts
SEED_MODE=EXISTING_WEDDING npx ts-node prisma/seed.ts
```

### Run Specific Test Suite
```bash
npm run test:e2e -- --project=auth_setup      # Just auth
npm run test:e2e -- --project=onboarding_suite # Just onboarding
npm run test:e2e -- --project=functional_suite # Just functional
```

### Debug a Specific Test
```bash
npm run test:e2e -- --debug tests/e2e/onboarding/my-test.spec.ts
```

### View Test Report
```bash
npm run test:e2e
npx playwright show-report
```

## Test User Accounts

Use these accounts when logging in via E2E bypass:

| Role | Email | Use Case |
|------|-------|----------|
| Master Admin | master@example.com | Platform configuration |
| Wedding Planner | planner@example.com | Create and manage weddings |
| Wedding Admin (Couple) | admin@example.com | Manage their own wedding |

## Environment Variables Cheat Sheet

```bash
# REQUIRED for E2E tests
NEXT_PUBLIC_IS_E2E=true

# Database (test DB)
DATABASE_URL=postgresql://wedding:wedding@localhost:5432/wed5

# NextAuth
NEXTAUTH_SECRET=test-secret
NEXTAUTH_URL=http://localhost:3000

# Playwright
PLAYWRIGHT_BASE_URL=http://localhost:3000

# Test users (override defaults)
MASTER_ADMIN_EMAIL=custom@example.com
PLANNER_EMAIL=custom-planner@example.com
WEDDING_ADMIN_EMAIL=custom-couple@example.com
```

## Test Database Setup

```bash
# Create test database (if it doesn't exist)
createdb -U wedding wedding_test -h localhost

# Run migrations
DATABASE_URL=postgresql://wedding:wedding@localhost:5432/wedding_test npx prisma migrate deploy

# View data
DATABASE_URL=postgresql://wedding:wedding@localhost:5432/wedding_test npx prisma studio
```

## Troubleshooting

### E2E Tests Won't Run
```bash
# Check 1: NEXT_PUBLIC_IS_E2E is set
echo $NEXT_PUBLIC_IS_E2E  # Should be: true

# Check 2: Dev server is running
curl http://localhost:3000  # Should return HTML

# Check 3: Database is accessible
psql postgresql://wedding:wedding@localhost:5432/wedding_test -c "SELECT 1"
```

### Auth Setup Fails
```bash
# Check auth page has email input
curl -s http://localhost:3000/auth/signin | grep -i email

# Run auth setup only
npm run test:e2e -- --project=auth_setup

# Check created auth files
ls -la playwright/.auth/
```

### Database Reset Fails
```bash
# Check test database exists
psql -l | grep wedding_test

# Check database URL
echo $DATABASE_URL  # Should contain "wedding_test"

# Reset with permission
ALLOW_RESET=true npx ts-node scripts/reset-database.ts
```

### Playwright Timeout
```bash
# Check dev server logs
npm run dev  # In separate terminal

# Increase timeout if needed in playwright.config.ts
# Change: timeout: 60 * 1000
# To: timeout: 120 * 1000 (2 minutes)
```

## Seed Data Overview

### NEW_USER Mode (Default)
Best for: Testing onboarding flows

**Created**:
- 1 Master Admin (from MASTER_ADMIN_EMAIL env var)
- 1 Wedding Planner (from PLANNER_EMAIL env var)
- 5 Provider Categories (Venue, Catering, Photography, Music/DJ, Flowers)
- System Themes
- Empty Checklist Template

**Time**: ~5 seconds

### EXISTING_WEDDING Mode
Best for: Testing main features with realistic data

**Created**:
- All NEW_USER data
- 1 Complete Wedding (August 15, 2025)
- 45 Families with 120+ Members
- 8 Tables with seating assignments
- 24 Message Templates (SAVE_THE_DATE, INVITATION, REMINDER, CONFIRMATION)
- Tracking events for 30 families
- 3 Checklist sections with 9 tasks
- 5 Provider Categories × 2-3 Providers each = 15 Providers
- 15-30 Payments with various statuses

**Time**: ~15-30 seconds

## CI/CD Workflow

When you push to `main` branch:

1. **GitHub Actions triggered** (within seconds)
2. **E2E tests run** (2-3 minutes)
   - PostgreSQL service starts
   - Database migrations run
   - Tests execute sequentially
3. **Docker build** (1-2 minutes)
   - Only if tests pass
   - Image pushed to GHCR with tag `latest`
4. **Watchtower auto-update** (within 5-10 minutes)
   - Detects new image
   - Pulls and restarts container
   - Zero downtime via rolling restart

Monitor progress: https://github.com/ndsrf/wedding/actions

## Local vs CI/CD Differences

| Aspect | Local | CI/CD |
|--------|-------|-------|
| Database | Your test DB (wed5) | PostgreSQL service container |
| Dev Server | Your local server | Started by Playwright |
| Auth Provider | E2E bypass (config.ts) | Same E2E bypass |
| Duration | 2-5 min | 5-10 min |
| Results | Playwright report | GitHub Actions artifacts |

## Next Steps

1. **Write your first test**:
   ```bash
   # Create: tests/e2e/onboarding/signup.spec.ts
   # Use: playwright/.auth/master-admin.json for authenticated tests
   ```

2. **Run tests frequently**:
   ```bash
   npm run test:e2e
   ```

3. **Commit and push**:
   ```bash
   git add .
   git commit -m "test: add signup flow tests"
   git push origin main
   ```

4. **Monitor GitHub Actions**:
   ```
   https://github.com/ndsrf/wedding/actions
   ```

## Common Patterns

### Use Pre-Authenticated Session
```typescript
import { test, expect } from '@playwright/test';

test.use({ storageState: 'playwright/.auth/master-admin.json' });

test('master admin can create wedding', async ({ page }) => {
  await page.goto('/master/weddings');
  // User is already logged in
});
```

### Test with Different Roles
```typescript
test('wedding admin sees different menu than planner', async ({ test }) => {
  // Test 1: Planner view
  test.use({ storageState: 'playwright/.auth/planner.json' });

  // Test 2: Wedding admin view
  test.use({ storageState: 'playwright/.auth/wedding-admin.json' });
});
```

### Test API Endpoints
```typescript
test('API returns family data', async ({ request }) => {
  const response = await request.get(
    '/api/guest/family?token=magic-token-here'
  );
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  expect(data.family).toBeDefined();
});
```

## Performance Tips

1. **Use selective test mode**:
   ```bash
   npm run test:e2e -- --grep "signup"  # Only tests matching "signup"
   ```

2. **Skip setup stages if needed**:
   ```bash
   npm run test:e2e -- --project=functional_suite  # Skip db_setup, auth_setup
   # (only works if those have already run)
   ```

3. **Parallel testing not recommended**:
   - Sequential mode (1 worker) maintains clean database state
   - If you need parallelism, use separate test databases

## Resources

- 📖 [Full Implementation Guide](./IMPLEMENTATION_SUMMARY.md)
- ✅ [Implementation Checklist](./IMPLEMENTATION_CHECKLIST.md)
- 🧪 [Testing Documentation](./tests/README.md)
- 🎭 [Playwright Docs](https://playwright.dev)
- 🐋 [Watchtower Docs](https://containrrr.dev/watchtower/)

---

**Last Updated**: January 31, 2026
**Status**: Ready for use ✅
