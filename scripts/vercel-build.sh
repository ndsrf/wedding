#!/bin/bash
set -e # Exit on any error

echo "🚀 Starting Main DB Migration..."
# 1. Run migrations for the main database
npx prisma migrate deploy

if [ -n "$VECTOR_DATABASE_URL" ]; then
    echo "🧠 Starting Vector DB Migration..."
    
    # Define paths
    MAIN_MIGRATIONS="prisma/migrations"
    TEMP_MIGRATIONS="prisma/main_migrations_tmp"
    VECTOR_MIGRATIONS="prisma/vector/migrations"
    
    # 2. Isolation Hack (Mirrors src/lib/db/migrationManager.ts)
    # Move main migrations out of the way
    mv "$MAIN_MIGRATIONS" "$TEMP_MIGRATIONS"
    
    # Create fresh migrations folder and copy vector migrations into it
    mkdir -p "$MAIN_MIGRATIONS"
    cp -r "$VECTOR_MIGRATIONS"/* "$MAIN_MIGRATIONS/"
    
    # 3. Run Vector Migration
    # We use the schema flag and override DATABASE_URL for this command
    DATABASE_URL=$VECTOR_DATABASE_URL npx prisma migrate deploy --schema=prisma/vector/schema.prisma
    
    # 4. Restore Original State
    rm -rf "$MAIN_MIGRATIONS"
    mv "$TEMP_MIGRATIONS" "$MAIN_MIGRATIONS"
    
    echo "✅ Vector Migration Complete."
else
    echo "⚠️ VECTOR_DATABASE_URL not set, skipping vector migrations."
fi

echo "🔨 Generating Prisma Clients..."
# This runs 'prisma generate' for both schemas as defined in your package.json
npm run db:generate

echo "🏗️ Building Application..."
npm run build
