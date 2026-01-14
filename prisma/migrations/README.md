# Database Migrations

This directory contains all database migrations for the Wedding Management Platform.

## Overview

The application uses **Prisma Migrate** for database schema management with **fully automatic migration execution** on startup.

**No manual setup required!** When you first start the app, it will:
1. Detect that no migrations exist
2. Automatically create the initial migration from `prisma/schema.prisma`
3. Apply it to create all database tables
4. Initialize the `_prisma_migrations` version tracking table

All migrations are tracked in the `_prisma_migrations` table in your PostgreSQL database.

## Migration Versioning

Prisma automatically:
- Creates timestamped migration folders (e.g., `20240115120000_initial_setup/`)
- Tracks which migrations have been applied in the `_prisma_migrations` table
- Ensures migrations are applied in order and only once
- Maintains migration history with checksums for integrity verification

## How It Works

### Automatic Migration on Startup

When the application starts, migrations run **automatically by default** in all environments:

**First startup (no migrations):**
1. Detects no migration files in `prisma/migrations/`
2. Runs `prisma migrate dev --name initial_setup` to create and apply initial migration
3. All database tables are created from the Prisma schema
4. Logs reminder to commit migration files to git

**Normal startup (migrations exist):**
1. Checks `_prisma_migrations` table for applied migrations
2. Compares with migration files in `prisma/migrations/`
3. Applies any pending migrations in chronological order
4. Logs all migration activity to console
5. Exits with error code if migration fails (in production)

**No pending migrations:**
1. Confirms database is up to date
2. Starts application normally

### Environment Variables

- `AUTO_MIGRATE="false"` - Disable automatic migrations (enabled by default)
- `FAIL_ON_MIGRATION_ERROR="false"` - Continue startup even if migration fails (not recommended)
- `NODE_ENV=production` - Enables strict error handling on migration failures

## Creating Migrations

**Note:** The app creates migrations automatically on startup, so manual migration creation is **optional**. However, you may want to create them manually to review the SQL before deployment.

### Option 1: Automatic (Recommended for Development)

1. Edit `prisma/schema.prisma`
2. Start the app with `npm run dev`
3. App detects schema changes and creates migration automatically
4. Commit the generated migration files to git

### Option 2: Manual (Recommended for Production)

1. Edit your Prisma schema file:
   ```bash
   vim prisma/schema.prisma
   ```

2. Generate migration:
   ```bash
   # Development - creates migration and applies it
   npm run migrate:dev -- --name add_user_preferences
   ```

   This will:
   - Generate SQL migration files in `prisma/migrations/`
   - Apply the migration to your database
   - Regenerate Prisma Client

3. Review the generated SQL:
   ```bash
   cat prisma/migrations/[timestamp]_add_user_preferences/migration.sql
   ```

4. Commit to git:
   ```bash
   git add prisma/
   git commit -m "Add user preferences migration"
   ```

### 3. Deploy Migration

**Automatic (Default):**

Just start the app - migrations are applied automatically:
```bash
npm run start
```

**Manual (Optional):**

You can also run migrations manually before starting:
```bash
# Apply pending migrations (production-safe)
npm run migrate:deploy

# Then start the app
npm run start
```

## Migration Commands

```bash
# Create and apply a new migration (dev)
npm run migrate:dev

# Apply pending migrations (production-safe)
npm run migrate:deploy

# Check migration status
npm run migrate:status

# Regenerate Prisma Client
npm run db:generate

# Reset database (WARNING: deletes all data)
npm run migrate:reset
```

## Migration Workflow

### Development Workflow

1. Make changes to `prisma/schema.prisma`
2. Run `npm run migrate:dev -- --name descriptive_name`
3. Review the generated migration in `prisma/migrations/`
4. Test the migration
5. Commit both the schema and migration files to git

### Production Deployment

1. Deploy your code with the new migration files
2. The application automatically runs migrations on startup
3. Or manually run: `npm run migrate:deploy`

## Best Practices

### ✅ DO

- **Name migrations descriptively**: `add_email_notifications`, `remove_legacy_fields`
- **Review generated SQL**: Always check the migration files before applying
- **Test migrations**: Test in development before deploying to production
- **Commit migrations**: Always commit migration files alongside schema changes
- **Keep migrations small**: One logical change per migration
- **Use migration for data changes**: Create custom SQL migrations for data transformations

### ❌ DON'T

- **Don't edit applied migrations**: Once applied, migrations are immutable
- **Don't delete migration files**: This breaks the migration history
- **Don't modify `_prisma_migrations` table**: Let Prisma manage it
- **Don't skip migrations**: Always apply migrations in order
- **Don't commit schema without migrations**: They must be in sync

## Migration File Structure

```
prisma/migrations/
├── README.md                           # This file
├── 20240115120000_initial_setup/      # Timestamped migration folder
│   └── migration.sql                   # Generated SQL
├── 20240116080000_add_user_roles/
│   └── migration.sql
└── migration_lock.toml                 # Ensures migration consistency
```

## Custom Migrations

For complex data migrations or custom SQL:

```bash
# Create an empty migration
npx prisma migrate dev --create-only --name custom_data_migration

# Edit the generated migration.sql file with your custom SQL
vim prisma/migrations/[timestamp]_custom_data_migration/migration.sql

# Apply the migration
npm run migrate:dev
```

## Troubleshooting

### Migration Fails on Startup

```bash
# Check migration status
npm run migrate:status

# View migration details
psql $DATABASE_URL -c "SELECT * FROM _prisma_migrations;"

# Manually apply migrations
npm run migrate:deploy
```

### Reset Database (Development Only)

```bash
# WARNING: This deletes all data
npm run migrate:reset
```

### Migration Conflict

If multiple developers create migrations simultaneously:

1. Pull latest code
2. Delete your local migration folder
3. Regenerate: `npm run migrate:dev`
4. Resolve any schema conflicts

### Failed Migration in Production

If a migration fails in production:

1. Check application logs for error details
2. Fix the issue in your schema/migration
3. Create a new migration to correct the problem
4. Deploy the fix

## Database Schema Version

The `_prisma_migrations` table tracks:
- `id`: Unique migration identifier
- `checksum`: Ensures migration integrity
- `finished_at`: When migration completed
- `migration_name`: The migration folder name
- `logs`: Migration execution logs
- `rolled_back_at`: Rollback timestamp (if applicable)
- `started_at`: When migration started
- `applied_steps_count`: Number of steps executed

## Learn More

- [Prisma Migrate Documentation](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Migration Workflows](https://www.prisma.io/docs/guides/migrate/developing-with-prisma-migrate)
- [Production Migrations](https://www.prisma.io/docs/guides/migrate/production-troubleshooting)
