# Wedding Planner E2E Testing & Auto-Deployment Implementation Summary

This document summarizes the comprehensive testing and deployment infrastructure implemented for the Wedding Planner application.

## Implementation Overview

The implementation is divided into three major phases:

### Phase 1: Database Exploration & Seeding ✅ COMPLETED

Created scripts and seed data infrastructure to support flexible database states for testing.

**Files Created:**
- `scripts/analyze-databases.ts` - Analyzes wed4 and wed5 databases to understand data patterns
- `scripts/reset-database.ts` - Fast database reset by truncating all tables (except migrations)
- `prisma/seed.ts` - Comprehensive seed script with two modes:
  - `SEED_MODE=NEW_USER` - Minimal platform setup (Master Admin, Planner, themes, categories)
  - `SEED_MODE=EXISTING_WEDDING` - Complete wedding scenario (45 families, 120+ members, full features)

**Key Features:**
- Deterministic seed data using consistent patterns
- Realistic Spanish/English names and data
- Configurable via environment variables
- Safety checks to prevent production database damage
- Support for both test and production environments

**Usage:**
```bash
# Reset database and seed NEW_USER mode
npx ts-node scripts/reset-database.ts
SEED_MODE=NEW_USER npx ts-node prisma/seed.ts

# Reset database and seed EXISTING_WEDDING mode
npx ts-node scripts/reset-database.ts
SEED_MODE=EXISTING_WEDDING npx ts-node prisma/seed.ts
```

### Phase 2: Authentication & Testing Infrastructure ✅ COMPLETED

Implemented E2E testing with authentication bypass and Playwright configuration for sequential test execution.

**Files Created/Modified:**

1. **src/lib/auth/config.ts** - Modified
   - Added `CredentialsProvider` for E2E testing
   - Only enabled when `NEXT_PUBLIC_IS_E2E=true`
   - Uses existing `detectUserRole` function for role detection
   - Security: NEVER enabled in production

2. **playwright.config.ts** - Modified
   - Changed from parallel to sequential execution (1 worker)
   - Added 5-project workflow with dependencies:
     1. `db_setup` - Reset and seed NEW_USER
     2. `auth_setup` - Authenticate all roles (depends on db_setup)
     3. `onboarding_suite` - Onboarding tests (depends on auth_setup)
     4. `db_seed_full` - Seed EXISTING_WEDDING (depends on onboarding_suite)
     5. `functional_suite` - Main features (depends on db_seed_full)

3. **tests/db.setup.ts** - New
   - Runs before all tests
   - Resets database and seeds NEW_USER mode
   - Ensures clean state for auth setup

4. **tests/auth.setup.ts** - New
   - Authenticates as all three user roles
   - Saves storage state for reuse in test suites
   - Uses E2E credentials provider
   - Creates auth files:
     - `playwright/.auth/master-admin.json`
     - `playwright/.auth/planner.json`
     - `playwright/.auth/wedding-admin.json`

5. **tests/db.seed-full.ts** - New
   - Runs after onboarding tests
   - Resets database and seeds EXISTING_WEDDING mode
   - Provides realistic data for functional tests

6. **tests/e2e/onboarding/** - New Directory
   - Placeholder for onboarding flow tests
   - Tests with NEW_USER data (minimal setup)
   - Examples: signup, wedding creation, initial configuration

7. **tests/e2e/functional/** - New Directory
   - Placeholder for main feature tests
   - Tests with EXISTING_WEDDING data (45 families, full features)
   - Examples: RSVP management, seating, messaging, payments

8. **tests/api/** - New Directory
   - Placeholder for API integration tests
   - Uses Playwright's request fixture
   - Examples: guest endpoints, admin endpoints, planner endpoints

9. **.gitignore** - Modified
   - Added `playwright-report/` and `playwright/.auth/` to ignore list

10. **tests/README.md** - Updated
    - Comprehensive guide to testing infrastructure
    - Environment variables and configuration
    - Usage examples for different test scenarios
    - E2E testing flow documentation

**Test User Accounts:**
```
Master Admin: master@example.com
Wedding Planner: planner@example.com
Wedding Admin: admin@example.com
```

Override with environment variables:
```bash
MASTER_ADMIN_EMAIL=custom@example.com \
PLANNER_EMAIL=custom-planner@example.com \
WEDDING_ADMIN_EMAIL=custom-couple@example.com \
npm run test:e2e
```

**Usage:**
```bash
# Run all E2E tests (sequential)
NEXT_PUBLIC_IS_E2E=true npm run test:e2e

# Run specific E2E project
npm run test:e2e -- --project=auth_setup
npm run test:e2e -- --project=onboarding_suite
npm run test:e2e -- --project=functional_suite

# Debug mode
npm run test:e2e -- --debug

# View report
npx playwright show-report
```

### Phase 3: CI/CD & Auto-Deployment ✅ COMPLETED

Implemented GitHub Actions workflow for automated testing and deployment with Watchtower auto-updates.

**Files Created/Modified:**

1. **.github/workflows/e2e-deploy.yml** - New
   - Two-job workflow:
     - **e2e-tests** - Run Playwright E2E tests in CI
       - Spins up PostgreSQL service container
       - Runs full test suite with sequential projects
       - Uploads Playwright report on failure
       - Fails fast if tests don't pass
     - **build-and-push** - Build and push Docker image (only if tests pass)
       - Only runs if e2e-tests succeeds
       - Uses Docker buildx for multi-arch builds
       - Pushes to GHCR (GitHub Container Registry)
       - Tags: branch, commit SHA, latest

2. **docker-compose.yml** - Modified
   - Added label to app service: `com.centurylinklabs.watchtower.enable=true`
   - Added Watchtower service:
     - Checks for new images every 5 minutes
     - Only updates labeled containers
     - Auto-cleanup of old images
     - Rolling restart (one container at a time)
     - Non-root user with security options

**Workflow Flow:**
```
Push to main
    ↓
Run E2E Tests (PostgreSQL service)
    ├─ db_setup
    ├─ auth_setup
    ├─ onboarding_suite
    ├─ db_seed_full
    └─ functional_suite
    ↓ (only if passing)
Build Docker Image
    ↓
Push to GHCR (tagged as latest)
    ↓ (5-minute interval)
Watchtower detects new image
    ↓
Pull image
    ↓
Rolling restart (wedding-app container)
    ↓
Old image cleanup
```

**Setup Instructions:**

1. **GitHub Container Registry Authentication** (on Proxmox LXC):
   ```bash
   # Create personal access token in GitHub
   # Settings → Developer settings → Personal access tokens
   # Scopes: read:packages, write:packages

   docker login ghcr.io -u YOUR_GITHUB_USERNAME -p YOUR_GITHUB_TOKEN
   ```

2. **Watchtower Configuration**:
   - Docker credentials are read from `/root/.docker/config.json`
   - Set appropriate permissions: `chmod 600 /root/.docker/config.json`
   - Watchtower checks every 5 minutes for new images
   - Rolling restart ensures zero-downtime updates

**Verification Steps:**

1. **Local E2E Testing:**
   ```bash
   # Set environment variables in .env.local
   NEXT_PUBLIC_IS_E2E=true
   DATABASE_URL=postgresql://wedding:wedding@localhost:5432/wed5
   NEXTAUTH_SECRET=test-secret
   NEXTAUTH_URL=http://localhost:3000

   # Run tests
   npm run test:e2e
   ```

2. **GitHub Actions Workflow:**
   - Push to main branch
   - Monitor workflow in GitHub Actions UI
   - View E2E test results and artifacts
   - Verify Docker image pushed to GHCR

3. **Watchtower Auto-Update:**
   - Verify Watchtower container is running: `docker ps | grep watchtower`
   - Check logs: `docker logs wedding-watchtower`
   - Wait 5-10 minutes for next check
   - Verify application restarted: `docker ps | grep wedding-app`
   - Check image hash before/after update

## Security Considerations

### E2E Auth Bypass
- ✅ **Only enabled when** `NEXT_PUBLIC_IS_E2E=true`
- ✅ **Never set in production** environment
- ✅ Uses existing `detectUserRole` function
- ✅ Clear error messages if not configured
- ✅ Could add middleware check to block if accidentally enabled

### Database Safety
- ✅ **Reset script checks** for test database patterns
- ✅ **Safety flag** `ALLOW_RESET=true` required to bypass
- ✅ **Production databases** protected by connection string validation
- ✅ **Migrations** table preserved during reset

### Container Registry
- ✅ **GitHub Token** should have minimal scopes (`read:packages` for pulling)
- ✅ **Docker credentials** stored in `/root/.docker/config.json` with 600 permissions
- ✅ **Watchtower** runs as non-root user
- ✅ **Label-based updates** prevent accidental updates of other containers

### Testing Infrastructure
- ✅ **Sequential execution** (1 worker) prevents race conditions
- ✅ **Isolated auth states** saved per role
- ✅ **Deterministic seed data** for reproducibility
- ✅ **Database cleanup** between test suites

## Environment Variables

### Required for Local E2E Testing
```bash
# Enable E2E auth bypass (CRITICAL)
NEXT_PUBLIC_IS_E2E=true

# Database
DATABASE_URL=postgresql://wedding:wedding@localhost:5432/wed5

# Authentication
NEXTAUTH_SECRET=test-secret-for-local-testing
NEXTAUTH_URL=http://localhost:3000

# Playwright
PLAYWRIGHT_BASE_URL=http://localhost:3000

# Test users
MASTER_ADMIN_EMAIL=master@example.com
PLANNER_EMAIL=planner@example.com
WEDDING_ADMIN_EMAIL=admin@example.com
```

### Provided by GitHub Actions
```bash
NEXTAUTH_SECRET=test-secret-for-ci-e2e-${GITHUB_RUN_ID}
GITHUB_TOKEN=<automatically provided>
```

### Set in Production (docker-compose.yml)
```bash
NEXTAUTH_SECRET=<strong-random-secret>
NEXTAUTH_URL=https://your-domain.com
MASTER_ADMIN_EMAILS=admin1@example.com,admin2@example.com
# ... other production variables
```

## File Structure Summary

```
wedding/
├── .github/
│   └── workflows/
│       └── e2e-deploy.yml           # CI/CD workflow
├── .gitignore                        # Updated with playwright rules
├── docker-compose.yml                # Updated with Watchtower service
├── playwright.config.ts              # Updated with sequential projects
├── IMPLEMENTATION_SUMMARY.md         # This file
├── prisma/
│   └── seed.ts                       # New: comprehensive seed script
├── scripts/
│   ├── analyze-databases.ts          # New: database analysis
│   └── reset-database.ts             # New: database reset utility
├── src/
│   └── lib/
│       └── auth/
│           └── config.ts             # Modified: added E2E provider
├── tests/
│   ├── README.md                     # Updated with comprehensive guide
│   ├── db.setup.ts                   # New: database setup
│   ├── db.seed-full.ts               # New: full seed setup
│   ├── auth.setup.ts                 # New: authentication setup
│   ├── api/
│   │   └── README.md                 # New: API tests guide
│   └── e2e/
│       ├── onboarding/
│       │   └── .gitkeep              # Placeholder for onboarding tests
│       └── functional/
│           └── .gitkeep              # Placeholder for functional tests
└── playwright/
    └── .auth/                        # Gitignored: auth state files
```

## Deployment Checklist

### Pre-Deployment
- [ ] All E2E tests passing locally
- [ ] Environment variables configured
- [ ] Git commits ready to push

### Initial Setup (First Time)
- [ ] Push to main branch
- [ ] Monitor GitHub Actions workflow
- [ ] Verify Docker image built and pushed to GHCR
- [ ] Create GitHub personal access token for GHCR
- [ ] Login to Proxmox LXC container registry
- [ ] Start Watchtower in docker-compose

### Ongoing Deployment
- [ ] Push changes to main branch
- [ ] GitHub Actions automatically tests and builds
- [ ] Watchtower automatically pulls and restarts (5-minute interval)
- [ ] Application is updated with zero downtime (rolling restart)

### Rollback Plan
If issues occur:
1. **E2E Test Failure**:
   - Fix code, commit, push again
   - GitHub Actions will retry workflow

2. **Docker Build Failure**:
   - Fix Dockerfile/code
   - Commit and push
   - Watchtower will pull previous image if current build failed

3. **Runtime Issues**:
   - Check logs: `docker logs wedding-app`
   - Rollback to previous image manually: `docker pull ghcr.io/ndsrf/wedding:main-<previous-sha>`
   - Restart: `docker-compose restart app`

## Testing Philosophy

### Seed Data Quality
- Deterministic and reproducible
- Realistic names, dates, and patterns
- Covers various edge cases (multiple families, mixed attendance, etc.)
- Spanish/English language support

### Test Organization
- **NEW_USER** mode: Test onboarding and initial setup flows
- **EXISTING_WEDDING** mode: Test main features with realistic data
- Sequential execution ensures clean state transitions

### Automation Goals
- **Zero-touch deployment**: Watchtower handles updates automatically
- **Confidence in changes**: E2E tests verify no regressions
- **Fast feedback**: GitHub Actions reports results within minutes
- **Production-ready**: Same environment and data patterns as production

## Future Enhancements

1. **Monitoring & Alerts**
   - Slack notifications for failed tests
   - Health check monitoring between updates
   - Email alerts for deployment failures

2. **Staging Environment**
   - Add staging workflow for pre-production testing
   - Automated promotion from staging to production

3. **Test Coverage Expansion**
   - Add onboarding flow tests
   - Add functional tests for main features
   - Add API endpoint tests
   - Add performance benchmarks

4. **Data Management**
   - Additional seed modes (partial wedding, multiple weddings)
   - Seed data variants for different scenarios
   - Performance testing with large datasets

5. **Observability**
   - Structured logging for E2E tests
   - Metrics for test execution times
   - Flamegraph generation for performance analysis

## Quick Reference Commands

```bash
# Local Development
npm run dev                          # Start dev server
npm run test:e2e                     # Run all E2E tests
npm run test:e2e -- --debug          # Debug specific test
npx playwright show-report           # View test report

# Database Management
npx ts-node scripts/reset-database.ts              # Reset database
SEED_MODE=NEW_USER npx ts-node prisma/seed.ts    # Seed NEW_USER
SEED_MODE=EXISTING_WEDDING npx ts-node prisma/seed.ts  # Seed EXISTING_WEDDING
npx prisma studio                    # View database with Prisma Studio

# Docker
docker-compose up -d                 # Start production containers
docker logs wedding-app              # View application logs
docker logs wedding-watchtower       # View Watchtower logs
docker-compose restart app           # Restart application

# Container Registry
docker login ghcr.io                 # Login to GitHub Container Registry
docker pull ghcr.io/ndsrf/wedding:latest  # Pull latest image

# GitHub Actions
git push origin main                 # Trigger workflow
# Monitor at: https://github.com/ndsrf/wedding/actions
```

## Support & Troubleshooting

### E2E Tests Not Running
1. Check `NEXT_PUBLIC_IS_E2E=true` is set
2. Verify database is running: `psql postgresql://wedding:wedding@localhost:5432/wed5`
3. Check auth provider is available: `npm run dev` and visit `/auth/signin`

### Watchtower Not Updating
1. Check container is running: `docker ps | grep watchtower`
2. Check logs: `docker logs wedding-watchtower`
3. Verify Docker credentials: `cat /root/.docker/config.json`
4. Verify image is pushed to GHCR: `docker pull ghcr.io/ndsrf/wedding:latest`

### Database Reset Fails
1. Verify test database: `psql -l | grep wedding_test`
2. Ensure DATABASE_URL points to test database (not production)
3. Check permissions: `pg_isready -U wedding -d wedding_test`

### Tests Timeout
1. Increase timeout in `playwright.config.ts` if needed
2. Check if app is running: `curl http://localhost:3000`
3. Monitor app logs: `npm run dev` (in another terminal)

---

**Implementation Date**: January 31, 2026
**Status**: Complete ✅
**Ready for**: Local testing, CI/CD setup, production deployment
