import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

interface MigrationResult {
  success: boolean;
  message: string;
  appliedMigrations?: string[];
  error?: string;
}

/**
 * Database Migration Manager
 * Automatically applies pending Prisma migrations on application startup
 */
export class MigrationManager {
  private static instance: MigrationManager;
  private migrationInProgress = false;
  private hasRunMigrations = false;

  private constructor() {}

  static getInstance(): MigrationManager {
    if (!MigrationManager.instance) {
      MigrationManager.instance = new MigrationManager();
    }
    return MigrationManager.instance;
  }

  /**
   * Run all pending database migrations
   * Uses Prisma's built-in migration system with the _prisma_migrations table for versioning
   */
  async runMigrations(): Promise<MigrationResult> {
    // Prevent concurrent migration runs
    if (this.migrationInProgress) {
      return {
        success: false,
        message: 'Migration already in progress',
      };
    }

    // Only run migrations once per application startup
    if (this.hasRunMigrations) {
      return {
        success: true,
        message: 'Migrations already executed in this session',
      };
    }

    this.migrationInProgress = true;

    try {
      console.log('[Migration] Starting database migration check...');

      // Check if migrations are needed
      const statusResult = await this.checkMigrationStatus();

      // Handle case where no migrations exist yet - create initial migration automatically
      if (statusResult.noMigrations) {
        console.log('[Migration] No migrations found - creating initial migration from schema...');
        this.migrationInProgress = false;

        try {
          const initResult = await this.createInitialMigration();
          this.hasRunMigrations = true;
          return initResult;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error('[Migration] ✗ Failed to create initial migration:', errorMessage);

          if (process.env.NODE_ENV === 'production' && process.env.FAIL_ON_MIGRATION_ERROR !== 'false') {
            return {
              success: false,
              message: 'Failed to create initial migration',
              error: errorMessage,
            };
          }

          return {
            success: false,
            message: 'Failed to create initial migration',
            error: errorMessage,
          };
        }
      }

      if (!statusResult.needsMigration) {
        console.log('[Migration] ✓ Database is up to date');
        this.hasRunMigrations = true;
        this.migrationInProgress = false;
        return {
          success: true,
          message: 'Database is already up to date',
        };
      }

      console.log('[Migration] Applying pending migrations...');

      // Apply migrations using Prisma's deploy command
      // This is safe for production and doesn't require the dev dependencies
      const { stdout, stderr } = await execAsync('npx prisma migrate deploy', {
        cwd: path.resolve(process.cwd()),
        env: { ...process.env },
      });

      console.log('[Migration] Migration output:', stdout);
      if (stderr && !stderr.includes('warn')) {
        console.error('[Migration] Migration stderr:', stderr);
      }

      // Parse applied migrations from output
      const appliedMigrations = this.parseAppliedMigrations(stdout);

      console.log('[Migration] ✓ Migrations applied successfully');
      if (appliedMigrations.length > 0) {
        console.log(`[Migration] Applied ${appliedMigrations.length} migration(s):`);
        appliedMigrations.forEach((migration) => {
          console.log(`[Migration]   - ${migration}`);
        });
      }

      this.hasRunMigrations = true;
      this.migrationInProgress = false;

      return {
        success: true,
        message: 'Migrations applied successfully',
        appliedMigrations,
      };
    } catch (error) {
      this.migrationInProgress = false;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[Migration] ✗ Migration failed:', errorMessage);

      return {
        success: false,
        message: 'Migration failed',
        error: errorMessage,
      };
    }
  }

  /**
   * Check if there are pending migrations
   */
  private async checkMigrationStatus(): Promise<{ needsMigration: boolean; noMigrations?: boolean }> {
    try {
      const { stdout, stderr } = await execAsync('npx prisma migrate status', {
        cwd: path.resolve(process.cwd()),
        env: { ...process.env },
      });

      const output = stdout + stderr;

      // Check if no migrations exist yet
      if (output.includes('No migration found in prisma/migrations') ||
          output.includes('No migrations found')) {
        console.warn('[Migration] ⚠️  No migration files found in prisma/migrations/');
        console.warn('[Migration] Please create the initial migration with:');
        console.warn('[Migration]   npm run migrate:dev -- --name initial_setup');
        return { needsMigration: false, noMigrations: true };
      }

      // Check if output indicates pending migrations
      const needsMigration =
        output.includes('Following migration(s) have not yet been applied') ||
        output.includes('Database schema is not up to date');

      return { needsMigration };
    } catch {
      // If status check fails, assume we need to try migration
      // This handles cases where the database might not exist yet
      console.warn('[Migration] Could not check migration status, will attempt migration');
      return { needsMigration: true };
    }
  }

  /**
   * Parse applied migrations from Prisma output
   */
  private parseAppliedMigrations(output: string): string[] {
    const migrations: string[] = [];
    const lines = output.split('\n');

    let inAppliedSection = false;
    for (const line of lines) {
      if (line.includes('following migration(s) have been applied')) {
        inAppliedSection = true;
        continue;
      }

      if (inAppliedSection && line.trim().startsWith('└─')) {
        const migrationName = line.trim().replace('└─', '').trim();
        if (migrationName) {
          migrations.push(migrationName);
        }
      } else if (inAppliedSection && line.trim() === '') {
        break;
      }
    }

    return migrations;
  }

  /**
   * Create initial migration from Prisma schema
   * Used when no migration files exist yet
   */
  private async createInitialMigration(): Promise<MigrationResult> {
    const isDevelopment = process.env.NODE_ENV !== 'production';

    if (isDevelopment) {
      // In development, create migration files and apply them
      console.log('[Migration] Creating initial migration with prisma migrate dev...');

      try {
        const { stderr } = await execAsync(
          'npx prisma migrate dev --name initial_setup --skip-seed',
          {
            cwd: path.resolve(process.cwd()),
            env: { ...process.env },
          }
        );

        console.log('[Migration] ✓ Initial migration created and applied');
        console.log('[Migration] Migration files created in prisma/migrations/');
        console.log('[Migration] ⚠️  Remember to commit these files to git!');

        if (stderr && !stderr.includes('warn')) {
          console.error('[Migration] Warnings:', stderr);
        }

        return {
          success: true,
          message: 'Initial migration created successfully',
          appliedMigrations: ['initial_setup'],
        };
      } catch (error) {
        throw error;
      }
    } else {
      // In production, use db push as fallback (not ideal but works)
      console.warn('[Migration] ⚠️  No migrations found in production!');
      console.warn('[Migration] Using db push to sync schema (emergency fallback)');
      console.warn('[Migration] ⚠️  You should commit migration files to git!');

      try {
        const { stderr } = await execAsync('npx prisma db push --skip-generate', {
          cwd: path.resolve(process.cwd()),
          env: { ...process.env },
        });

        console.log('[Migration] ✓ Database schema synchronized');

        if (stderr && !stderr.includes('warn')) {
          console.error('[Migration] Warnings:', stderr);
        }

        return {
          success: true,
          message: 'Database schema pushed successfully (emergency mode)',
        };
      } catch (error) {
        throw error;
      }
    }
  }

  /**
   * Reset the migration state (useful for testing)
   */
  reset(): void {
    this.hasRunMigrations = false;
    this.migrationInProgress = false;
  }
}

/**
 * Run migrations on application startup
 * This should be called before any database operations
 */
export async function runStartupMigrations(): Promise<void> {
  // Check if migrations are explicitly disabled
  const isDisabled = process.env.AUTO_MIGRATE === 'false';

  if (isDisabled) {
    console.log('[Migration] Automatic migrations disabled (AUTO_MIGRATE=false)');
    return;
  }

  // Run migrations by default in all environments
  console.log('[Migration] Automatic migrations enabled');

  const manager = MigrationManager.getInstance();
  const result = await manager.runMigrations();

  if (!result.success) {
    console.error('[Migration] Failed to apply migrations:', result.error);
    // In production, exit the process on failure (unless explicitly disabled)
    if (process.env.NODE_ENV === 'production' && process.env.FAIL_ON_MIGRATION_ERROR !== 'false') {
      console.error('[Migration] Exiting due to migration failure');
      process.exit(1);
    }
    return;
  }

  // Seed database with essential data (like system themes)
  try {
    const { seedDatabase } = await import('./seed');
    await seedDatabase();
  } catch (error) {
    console.error('[Seed] Failed to seed database:', error);
    // Don't exit on seed failure - the app can still run
    if (process.env.NODE_ENV === 'production' && process.env.FAIL_ON_SEED_ERROR === 'true') {
      console.error('[Seed] Exiting due to seed failure');
      process.exit(1);
    }
  }
}
