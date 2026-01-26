# Wedding Management App

A multi-tenant SaaS platform for professional wedding planners in the Spanish market, streamlining RSVP management, guest tracking, and gift coordination.

## Overview

The Wedding Management App enables wedding planners to manage multiple weddings simultaneously while providing couples with real-time guest tracking and friction-free RSVP experiences through persistent magic links.

## Key Features

- **Multi-tenant platform** with complete data isolation between weddings
- **Magic link authentication** for guests (no passwords required)
- **Family-based RSVP** system optimized for Spanish weddings
- **Excel import/export** for guest list management
- **Payment tracking** with automated bank transfer matching
- **Multi-language support** (Spanish, English, French, Italian, German)
- **Mobile-first design** optimized for WhatsApp in-app browsers
- **Custom theme system** for wedding branding

## Tech Stack

- **Frontend**: Next.js 14+ (App Router), React 18+, Tailwind CSS
- **Backend**: Next.js API Routes, NextAuth.js (OAuth)
- **Database**: PostgreSQL 15+ with Prisma ORM
- **Deployment**: Docker containers, GitHub Actions CI/CD
- **Languages**: TypeScript, multi-language i18n support

## Getting Started

### Prerequisites

- Node.js 18+ (LTS)
- Docker and docker-compose
- PostgreSQL 15+

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/wedding.git
cd wedding

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and configure DATABASE_URL

# Create database
createdb wedding_db

# Start development server
npm run dev
```

**That's it!** The application will automatically:
1. Detect that no migrations exist
2. Create the initial migration from the Prisma schema
3. Apply all migrations to set up database tables
4. Start the server

Visit [http://localhost:3000](http://localhost:3000) to view the application.

## Development

```bash
# Run tests
npm test

# Run linter
npm run lint

# Format code
npm run format

# Build for production
npm run build
```

## Database Migrations

The application uses **fully automatic database migrations** that run on startup to keep your database in sync with the application version.

### How It Works

**On first startup:**
1. App detects no migration files exist
2. Automatically creates initial migration from Prisma schema
3. Applies migration to create all database tables
4. Creates `_prisma_migrations` version tracking table

**On subsequent startups:**
1. App scans `prisma/migrations/` folder
2. Compares with `_prisma_migrations` table in database
3. Applies any pending migrations
4. Logs results

### Key Features

- **Fully Automatic**: No manual intervention required
- **Smart Detection**: Creates initial migration if none exists
- **Version Tracking**: All migrations tracked in `_prisma_migrations` table
- **Safe**: Idempotent - can run multiple times without issues
- **Production Ready**: Enabled by default in all environments

### Environment Configuration

Add to your `.env` file:

```bash
# Database connection (required)
DATABASE_URL="postgresql://user:password@localhost:5432/wedding_db"

# Disable auto-migrations (default: enabled)
# AUTO_MIGRATE="false"

# Continue on migration failure (default: exit in production)
# FAIL_ON_MIGRATION_ERROR="false"
```

**Migrations are enabled by default.** Set `AUTO_MIGRATE="false"` to disable them.

### Common Commands

```bash
# Create and apply a new migration (development)
npm run migrate:dev -- --name add_feature_name

# Apply pending migrations (production-safe)
npm run migrate:deploy

# Check migration status
npm run migrate:status

# Open Prisma Studio (database GUI)
npm run db:studio

# Regenerate Prisma Client
npm run db:generate

# Reset database (WARNING: deletes all data)
npm run migrate:reset
```

### Creating Migrations Manually (Optional)

While the app creates migrations automatically on startup, you can also create them manually for better control:

1. **Modify schema**: Edit `prisma/schema.prisma`
   ```prisma
   model User {
     id    String @id @default(uuid())
     email String @unique
     phone String?  // New field added
   }
   ```

2. **Generate migration** (optional - app will do this automatically):
   ```bash
   npm run migrate:dev -- --name add_user_phone
   ```

3. **Review generated SQL**: Check `prisma/migrations/[timestamp]_add_user_phone/migration.sql`

4. **Commit to git**: Commit both schema and migration files

**Or simply:** Edit the schema, commit it, and let the app create the migration on next startup!

### Production Deployment

Migrations run **fully automatically** on every deployment:

```bash
# Deploy code
git pull origin main
npm install

# Start app - migrations run automatically!
npm run start
```

**First deployment (no tables):**
```
[Server] Initializing application...
[Migration] Automatic migrations enabled
[Migration] Starting database migration check...
[Migration] No migrations found - creating initial migration from schema...
[Migration] Creating initial migration with prisma migrate dev...
[Migration] ✓ Initial migration created and applied
[Migration] ⚠️  Remember to commit these files to git!
[Server] ✓ Application initialization complete
```

**Subsequent deployments (with pending migrations):**
```
[Migration] Starting database migration check...
[Migration] Applying pending migrations...
[Migration] ✓ Migrations applied successfully
[Migration] Applied 2 migration(s):
[Migration]   - 20240115120000_add_user_phone
[Migration]   - 20240116080000_add_notifications
```

**No pending migrations:**
```
[Migration] Starting database migration check...
[Migration] ✓ Database is up to date
```

### Troubleshooting

**Check migration status:**
```bash
npm run migrate:status
```

**Migration failed on startup:**
```bash
# View logs for error details
# Check database migration history
psql $DATABASE_URL -c "SELECT migration_name, finished_at, logs FROM _prisma_migrations ORDER BY finished_at DESC;"

# Manually apply migrations
npm run migrate:deploy
```

**Database doesn't exist:**
```bash
# Create the database
createdb wedding_db

# Start the app - it will create migrations automatically
npm run dev
```

**App won't start due to migration error:**
```bash
# Temporarily disable auto-migrations to investigate
AUTO_MIGRATE="false" npm run dev

# Check what's wrong
npm run migrate:status

# Fix the issue and re-enable
unset AUTO_MIGRATE
npm run dev
```

**Want to review migrations before they run:**
```bash
# Generate migrations manually for review
npm run migrate:dev -- --name descriptive_name

# Review the generated SQL
cat prisma/migrations/[timestamp]_descriptive_name/migration.sql

# Commit and deploy
git add prisma/
git commit -m "Add migration"
```

For more details, see [`prisma/migrations/README.md`](./prisma/migrations/README.md).

## Versioning and Releases

This project follows [Semantic Versioning](https://semver.org/) (SemVer) for version management:

- **MAJOR** version (X.0.0): Breaking changes or incompatible API changes
- **MINOR** version (0.X.0): New features, backwards-compatible
- **PATCH** version (0.0.X): Bug fixes, backwards-compatible

### Creating a New Version

#### 1. Update package.json Version

Use npm version command to bump the version and create a git tag automatically:

```bash
# Patch version (0.0.X) - for bug fixes
npm version patch

# Minor version (0.X.0) - for new features
npm version minor

# Major version (X.0.0) - for breaking changes
npm version major
```

These commands will:
- Update the version in `package.json`
- Create a git commit with the message "X.Y.Z"
- Create a git tag `vX.Y.Z`

#### 2. Push Changes and Tags

```bash
# Push commits and tags to GitHub
git push origin main --follow-tags

# Or push separately
git push origin main
git push origin --tags
```

### Creating GitHub Releases

#### Option 1: Via GitHub Web Interface

1. Navigate to your repository on GitHub
2. Click on **"Releases"** in the right sidebar
3. Click **"Draft a new release"**
4. Fill in the release information:
   - **Choose a tag**: Select the existing tag (e.g., `v1.2.3`) or create a new one
   - **Release title**: Version number (e.g., `v1.2.3`) or descriptive name
   - **Description**: Add release notes (see template below)
   - **Attach binaries** (optional): Upload any build artifacts
5. Click **"Publish release"**

#### Option 2: Via GitHub CLI

```bash
# Install GitHub CLI if not already installed
# https://cli.github.com/

# Create a release from an existing tag
gh release create v1.2.3 \
  --title "v1.2.3" \
  --notes "Release notes go here"

# Create a release with auto-generated notes
gh release create v1.2.3 --generate-notes

# Create a pre-release
gh release create v1.2.3-beta --prerelease
```

### Release Notes Template

Use this template for consistent release notes:

```markdown
## What's Changed

### Features
- Added feature X for better user experience
- Implemented feature Y for improved performance

### Bug Fixes
- Fixed issue with Z causing errors
- Resolved problem with A not working correctly

### Improvements
- Optimized database queries for faster load times
- Updated dependencies to latest versions

### Breaking Changes
- Changed API endpoint from /old to /new
- Removed deprecated feature X

### Migration Guide
If applicable, provide steps for users to migrate from the previous version.

## Full Changelog
https://github.com/your-username/wedding/compare/v1.2.2...v1.2.3
```

### Complete Release Workflow

```bash
# 1. Ensure all changes are committed
git status

# 2. Run tests and linting
npm test
npm run lint

# 3. Build the project
npm run build

# 4. Bump version (choose one)
npm version patch   # Bug fixes: 1.0.0 → 1.0.1
npm version minor   # New features: 1.0.0 → 1.1.0
npm version major   # Breaking changes: 1.0.0 → 2.0.0

# 5. Push to GitHub
git push origin main --follow-tags

# 6. Create GitHub release
gh release create v1.2.3 --generate-notes

# Or manually create release on GitHub.com
```

### Best Practices

- **Always test** before creating a release
- **Write clear release notes** explaining what changed
- **Use semantic versioning** consistently
- **Tag releases** with `v` prefix (e.g., `v1.2.3`)
- **Create releases** from the main/master branch
- **Include migration instructions** for breaking changes
- **Attach build artifacts** if distributing compiled versions

## Production Deployment

The application is designed for **extremely simple deployment** using Docker Compose with pre-built images from GitHub Container Registry. **No source code, no nginx configuration, no manual migrations required.**

### Architecture

```
Internet → Next.js app (port 80) → PostgreSQL (port 5432)
```

- Next.js app serves traffic directly on port 80
- Next.js app runs in a non-root container
- PostgreSQL stores data in persistent Docker volumes
- **Migrations run automatically on app startup**
- SSL can be handled by Cloudflare, load balancer, or reverse proxy

### Prerequisites

- Docker and Docker Compose installed on server
- Access to pull from `ghcr.io/ndsrf/wedding`

### Quick Start

1. **Copy deployment files to your server:**
   ```bash
   # You only need 2 files (no source code required):
   docker-compose.yml
   .env
   ```

2. **Configure environment variables in `.env`:**
   ```bash
   # Database credentials
   POSTGRES_USER=wedding
   POSTGRES_PASSWORD=<strong-random-password>
   POSTGRES_DB=wedding_db

   # Authentication (generate a strong secret)
   NEXTAUTH_URL=https://your-domain.com
   NEXTAUTH_SECRET=<long-random-secret>

   # Application
   NODE_ENV=production
   APP_URL=https://your-domain.com
   APP_PORT=80                           # Port to expose (default: 80)
   LOG_LEVEL=info

   # Email service
   RESEND_API_KEY=<your-resend-api-key>
   EMAIL_FROM=noreply@your-domain.com
   EMAIL_FROM_NAME="Wedding Platform"

   # Admin access
   MASTER_ADMIN_EMAILS=admin@your-domain.com

   # OAuth (optional)
   GOOGLE_CLIENT_ID=<your-client-id>
   GOOGLE_CLIENT_SECRET=<your-client-secret>
   ```

3. **Pull the latest image and start services:**
   ```bash
   docker compose pull
   docker compose up -d
   ```

4. **Check logs to verify startup:**
   ```bash
   docker compose logs -f app
   ```

That's it! The application will:
- Create the PostgreSQL database on first run
- Automatically run all database migrations
- Start serving on port 80 (or whatever port you set in APP_PORT)

### First Time Database Initialization

On first startup with a new database:

1. PostgreSQL container creates a fresh database using `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB`
2. Next.js app starts and detects no migrations exist
3. Automatically creates initial migration from Prisma schema
4. Applies all migrations to create database tables
5. App becomes ready to serve traffic

**No manual migration steps required!**

### Updating to a New Version

```bash
# Pull the latest image
docker compose pull

# Restart services (migrations run automatically)
docker compose up -d

# Watch logs to verify successful migration
docker compose logs -f app
```

The app automatically detects and applies any new migrations on startup.

### Environment Variables Reference

#### Required Variables
- `POSTGRES_PASSWORD` - Database password (used for initial DB creation)
- `NEXTAUTH_URL` - Full URL where app is accessible (e.g., https://wedding.example.com)
- `NEXTAUTH_SECRET` - Random secret for session encryption (generate with `openssl rand -base64 32`)
- `APP_URL` - Same as NEXTAUTH_URL

#### Optional Variables
- `POSTGRES_USER` - Database username (default: `wedding`)
- `POSTGRES_DB` - Database name (default: `wedding_db`)
- `APP_PORT` - Port to expose on host (default: `80`)
- `WEDDING_APP_IMAGE` - Override Docker image (default: `ghcr.io/ndsrf/wedding:latest`)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - Google OAuth
- `FACEBOOK_CLIENT_ID` / `FACEBOOK_CLIENT_SECRET` - Facebook OAuth
- `APPLE_CLIENT_ID` / `APPLE_CLIENT_SECRET` - Apple OAuth
- `RESEND_API_KEY` - Email service API key
- `EMAIL_FROM` - Sender email address (default: noreply@example.com)
- `EMAIL_FROM_NAME` - Sender name (default: Wedding Platform)
- `REDIS_URL` - Redis connection string (optional caching)
- `LOG_LEVEL` - Logging level: debug, info, warn, error (default: info)
- `MASTER_ADMIN_EMAILS` - Comma-separated admin emails

### SSL/HTTPS Configuration

The app runs on HTTP by default. For production HTTPS, use one of these approaches:

**Option 1: Cloudflare (Recommended - Zero Configuration)**
- Point your domain to your server IP
- Enable Cloudflare proxy (orange cloud)
- Cloudflare handles SSL automatically
- No changes to docker-compose.yml needed

**Option 2: Reverse Proxy (nginx, Caddy, Traefik)**
- Install reverse proxy on your server
- Configure it to forward to `localhost:80` (or your APP_PORT)
- Proxy handles SSL certificates (Let's Encrypt)

**Option 3: Direct SSL in Next.js**
- Not recommended for production
- Requires custom server.js modifications

### Building and Pushing Images (CI/CD)

For maintainers building new versions:

```bash
# Build the image
docker build -t ghcr.io/ndsrf/wedding:latest .
docker build -t ghcr.io/ndsrf/wedding:v1.2.3 .

# Push to registry
docker push ghcr.io/ndsrf/wedding:latest
docker push ghcr.io/ndsrf/wedding:v1.2.3
```

Or use GitHub Actions (see `.github/workflows/` for automated builds on push).

### Troubleshooting

**Check service status:**
```bash
docker compose ps
```

**View logs:**
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f app
docker compose logs -f db
```

**Database connection issues:**
```bash
# Check database is healthy
docker compose exec db pg_isready -U wedding

# Connect to database
docker compose exec db psql -U wedding -d wedding_db
```

**Reset database (WARNING: deletes all data):**
```bash
docker compose down -v
docker compose up -d
```

**Check migration status:**
```bash
docker compose exec app npx prisma migrate status
```

### Port Access

- **Port 80** (default): Exposed to host, serves the application (configurable via APP_PORT)
- **Port 3000**: Internal container port, mapped to APP_PORT on host
- **Port 5432**: Internal only, database not exposed to host

### Data Persistence

Data is stored in Docker volumes:
- `wedding-postgres-data` - Database files

This persists across container restarts and updates.

## Project Structure

```
wedding/
├── src/              # Application source code
├── prisma/           # Database schema and migrations
├── public/           # Static assets
├── tests/            # Test files
└── docker/           # Docker configuration
```

## License

[To be determined]

## Contact

For questions or support, please open an issue in the GitHub repository.

---

*This README will be updated with more detailed information as the project develops.*
