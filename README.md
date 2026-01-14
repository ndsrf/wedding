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

## Deployment

The application uses Docker containers and GitHub Actions for automated deployment. See the [deployment documentation](./docs/deployment.md) for details.

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
