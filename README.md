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

   # SMS and WhatsApp (Twilio)
   TWILIO_ACCOUNT_SID=<your-twilio-account-sid>
   TWILIO_AUTH_TOKEN=<your-twilio-auth-token>
   TWILIO_PHONE_NUMBER=<your-twilio-phone-number>
   TWILIO_WHATSAPP_NUMBER=<your-twilio-whatsapp-number>

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

### Vercel Deployment

When deploying to Vercel, the runtime environment is read-only, which prevents automatic migrations from running at startup. Follow these steps to handle migrations:

1. **Set Environment Variables**: In your Vercel project settings, add:
   - `DATABASE_URL`: Your production database connection string.
   - `AUTO_MIGRATE`: `false` (optional, the app now auto-detects Vercel).

2. **Update Build Command**: Change the default build command in Vercel settings to:
   ```bash
   npx prisma migrate deploy && npm run build
   ```
   This ensures migrations are applied *before* the new version of the app is built and deployed.

3. **Prisma Client**: The `postinstall` hook in `package.json` will automatically run `prisma generate` during the Vercel build process.

### Configuring Environment Variables for Preview vs Production

When deploying to Vercel, you need to configure environment variables differently for **Production** and **Preview** environments to handle OAuth callbacks and dynamic URLs correctly.

#### Setting Environment Variables in Vercel

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project → **Settings** → **Environment Variables**
3. For each variable, select the appropriate **Environment Scope**: Production, Preview, or Development

#### Production Environment Variables

Set these with **Environment Scope: Production**

```bash
# Authentication
NEXTAUTH_URL=https://your-production-domain.com
NEXTAUTH_SECRET=your-production-nextauth-secret  # Generate with: openssl rand -base64 32
AUTH_TRUST_HOST=true

# Google OAuth (Production credentials)
GOOGLE_CLIENT_ID=your-production-google-client-id
GOOGLE_CLIENT_SECRET=your-production-google-client-secret

# Facebook OAuth (Production credentials)
FACEBOOK_CLIENT_ID=your-production-facebook-app-id
FACEBOOK_CLIENT_SECRET=your-production-facebook-app-secret
NEXT_PUBLIC_FACEBOOK_ENABLED=true

# Database
DATABASE_URL=your-production-database-url
```

#### Preview Environment Variables

Set these with **Environment Scope: Preview**

```bash
# Authentication
# ⚠️ DO NOT SET NEXTAUTH_URL - NextAuth will auto-detect the preview URL
NEXTAUTH_SECRET=your-preview-nextauth-secret  # Can be same as production or different
AUTH_TRUST_HOST=true

# Google OAuth (Preview credentials - separate from production!)
GOOGLE_CLIENT_ID=your-preview-google-client-id
GOOGLE_CLIENT_SECRET=your-preview-google-client-secret

# Facebook OAuth - Disabled for preview (doesn't support dynamic URLs)
NEXT_PUBLIC_FACEBOOK_ENABLED=false
# ❌ Do NOT set FACEBOOK_CLIENT_ID or FACEBOOK_CLIENT_SECRET for preview

# Database
DATABASE_URL=your-preview-database-url
```

#### Key Differences: Production vs Preview

| Variable | Production | Preview | Notes |
|----------|-----------|---------|-------|
| `NEXTAUTH_URL` | ✅ Set to production domain | ❌ **Do not set** | Preview URLs are dynamic and auto-detected |
| `GOOGLE_CLIENT_ID` | Production credentials | **Separate preview credentials** | Use different OAuth apps for each environment |
| `FACEBOOK_*` | ✅ Enabled | ❌ Disabled | Facebook doesn't support wildcard redirect URIs |
| `NEXT_PUBLIC_FACEBOOK_ENABLED` | `true` | `false` | Hides Facebook login in preview |
| `DATABASE_URL` | Production DB | Preview/staging DB | Always use separate databases |

#### Setting Up Google OAuth for Preview Environments

Since Vercel preview URLs are dynamic (e.g., `your-app-git-branch-team.vercel.app`), you need to create separate OAuth credentials:

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Click **"Create Credentials"** → **"OAuth 2.0 Client ID"**
3. Configure:
   - **Application type**: Web application
   - **Name**: "Wedding App - Preview/Staging"
   - **Authorized JavaScript origins**:
     - `https://*.vercel.app` (if your Google project allows wildcards)
     - OR add specific preview URLs manually
   - **Authorized redirect URIs**:
     - `https://*.vercel.app/api/auth/callback/google` (if supported)
     - OR add specific URLs like `https://wedding-git-main-yourteam.vercel.app/api/auth/callback/google`
4. Save the **Client ID** and **Client Secret**
5. Add them to Vercel with **Preview** scope

**Note:** Google's wildcard support is inconsistent. For reliable testing, consider using a [custom preview domain](https://vercel.com/docs/concepts/projects/custom-domains) like `preview.yourdomain.com`.

#### Alternative: Use E2E Test Mode for Previews

For simpler preview testing without OAuth setup, enable test mode:

```bash
# Preview environment variables
NEXT_PUBLIC_IS_E2E=true
NEXT_PUBLIC_FACEBOOK_ENABLED=false
# Don't set Google OAuth credentials
```

This enables email-based login (credentials provider) for testing without password validation.
⚠️ **Security Warning:** Only use this for preview/staging, NEVER for production!

#### Generating NEXTAUTH_SECRET

Generate a strong secret key:

```bash
openssl rand -base64 32
```

You can use the same secret for all environments or generate separate ones for better security isolation.

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
- `RESEND_API_KEY` - Email service API key
- `EMAIL_FROM` - Sender email address (default: noreply@example.com)
- `EMAIL_FROM_NAME` - Sender name (default: Wedding Platform)
- `TWILIO_ACCOUNT_SID` - Twilio Account SID for SMS/WhatsApp
- `TWILIO_AUTH_TOKEN` - Twilio Auth Token
- `TWILIO_PHONE_NUMBER` - Twilio phone number for SMS (format: +1234567890)
- `TWILIO_WHATSAPP_NUMBER` - Twilio WhatsApp number (format: +1234567890 or whatsapp:+1234567890)
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

### Twilio Setup for SMS and WhatsApp

The application supports sending invitations, reminders, and confirmations via SMS and WhatsApp using Twilio. Follow these steps to set up Twilio integration:

#### 1. Create a Twilio Account

1. Sign up at [https://www.twilio.com/try-twilio](https://www.twilio.com/try-twilio)
2. Verify your email and phone number
3. Complete the account setup

#### 2. Get Your Twilio Credentials

1. Navigate to the [Twilio Console](https://console.twilio.com/)
2. Find your **Account SID** and **Auth Token** on the dashboard
3. Add these to your `.env` file:
   ```bash
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token_here
   ```

#### 3. Set Up SMS (Optional)

1. Go to [Phone Numbers > Manage > Buy a number](https://console.twilio.com/us1/develop/phone-numbers/manage/search)
2. Search for a phone number in your desired country
3. Purchase the number (costs vary by country)
4. Add the number to your `.env` file:
   ```bash
   TWILIO_PHONE_NUMBER=+1234567890
   ```

#### 4. Set Up WhatsApp

**Option A: WhatsApp Sandbox (Testing)**

Perfect for development and testing:

1. Navigate to [Messaging > Try it out > Send a WhatsApp message](https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn)
2. Follow the instructions to join the sandbox by sending a WhatsApp message to the Twilio number
3. The sandbox number is typically: `+1 415 523 8886`
4. Add to your `.env`:
   ```bash
   TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
   ```

**Option B: Production WhatsApp (Meta Business Verification)**

For production use with custom branding:

1. Go to [Messaging > Senders > WhatsApp senders](https://console.twilio.com/us1/develop/sms/senders/whatsapp-senders)
2. Click "Get started" and follow the Meta Business verification process
3. Submit your business profile for verification (can take several days)
4. Once approved, request a WhatsApp-enabled phone number
5. Add the approved number to your `.env`:
   ```bash
   TWILIO_WHATSAPP_NUMBER=+1234567890
   ```

#### 5. Configure WhatsApp Message Templates

**IMPORTANT:** WhatsApp messages require pre-approved templates from Meta. You cannot send free-form messages.

1. Navigate to [Messaging > Content Editor](https://console.twilio.com/us1/develop/sms/content-editor)
2. Click "Create new Content" and select WhatsApp
3. Create templates for each message type:
   - **Invitation Template**: For initial wedding invitations
   - **Reminder Template**: For RSVP reminders
   - **Confirmation Template**: For RSVP confirmations
4. Each template must be submitted to Meta for approval (typically takes 24-48 hours)
5. Use the template editor in the Wedding Management App as a reference, but remember:
   - Changes in the app's template editor do NOT automatically update WhatsApp templates
   - You must update and resubmit templates through the Twilio Console
   - Templates must be approved by Meta before they can be used

**Template Guidelines:**
- Use placeholders (variables) for dynamic content (family name, wedding date, etc.)
- Keep messages concise and professional
- Follow Meta's WhatsApp Business Policy
- Avoid promotional or marketing language

#### 6. Configure Guest Channel Preferences

In the Wedding Management App:

1. Navigate to **Guest Management**
2. For each family/guest, set their preferred communication channel:
   - **Email**: Uses Resend (default)
   - **SMS**: Uses Twilio SMS
   - **WhatsApp**: Uses Twilio WhatsApp
3. Ensure contact information is complete:
   - Email address for EMAIL channel
   - Phone number for SMS channel (format: +1234567890)
   - WhatsApp number for WHATSAPP channel (format: +1234567890)

#### 7. Test the Integration

1. Create a test guest with your own phone number
2. Set the channel preference to SMS or WhatsApp
3. Send a test invitation or reminder
4. Verify you receive the message

#### 8. Configure Webhooks for Message Status Tracking

**Important**: Webhooks are already implemented in this application! The webhook endpoint at `/api/webhooks/twilio/status` tracks when messages are delivered and read (WhatsApp only).

**What You Can Track:**
- **SMS**: Sent, Delivered, Failed, Undelivered
- **WhatsApp**: Sent, Delivered, Read, Failed

##### Setting Up Webhooks in Twilio Console

**For WhatsApp Senders:**

1. Navigate to [Messaging > Senders > WhatsApp senders](https://console.twilio.com/us1/develop/sms/senders/whatsapp-senders)
2. Click on your WhatsApp sender
3. Configure the webhook fields as follows:

| Field | Value | Notes |
|-------|-------|-------|
| **Webhook URL for incoming messages** | `https://your-domain.com/api/webhooks/twilio/inbound` | **REQUIRED for AI auto-replies** - enables the app to receive and respond to guest messages |
| **Webhook method for incoming messages URL** | HTTP POST | Must be POST |
| **Fallback URL for incoming messages** | Leave blank (Optional) | Backup URL if incoming messages webhook fails |
| **Webhook method for fallback URL** | HTTP POST | Standard method |
| **Status callback URL** | `https://your-domain.com/api/webhooks/twilio/status` | **REQUIRED** - Replace `your-domain.com` with your actual domain |
| **Webhook method for status callback URL** | HTTP POST | **Use POST** (required for this implementation) |

**Important Notes:**
- Replace `https://your-domain.com` with your actual production domain (e.g., `https://wedding.example.com`)
- The status callback URL is **required** to track delivery and read receipts
- The inbound webhook URL is **required** for AI auto-replies to guest messages
- The webhook method must be **HTTP POST** (not PUT)

4. Click "Save" to apply the configuration

**For SMS Numbers:**

1. Navigate to [Phone Numbers > Manage > Active Numbers](https://console.twilio.com/us1/develop/phone-numbers/manage/incoming)
2. Click on your SMS-enabled phone number
3. Scroll down to the "Messaging" section
4. Configure:
   - **A MESSAGE COMES IN**: Leave as default or set to handle replies (optional)
   - **Messaging Status Callback URL**: `https://your-domain.com/api/webhooks/twilio/status`
5. Click "Save Configuration"

##### Webhook Endpoint Implementation (Already Implemented!)

The webhook endpoint is already implemented in this application at:
- **File**: `src/app/(public)/api/webhooks/twilio/status/route.ts`
- **Endpoint**: `POST /api/webhooks/twilio/status`

**What the webhook receives from Twilio:**

**SMS/WhatsApp Status Callback Parameters:**
- `MessageSid`: Unique message identifier
- `MessageStatus`: Current status (queued, sent, delivered, read, failed, undelivered)
- `To`: Recipient phone number
- `From`: Sender phone number
- `ErrorCode`: Error code if delivery failed
- `ErrorMessage`: Error description if delivery failed
- `X-Twilio-Signature`: HMAC-SHA1 signature header for validation

**How it works:**
1. ✅ Validates the Twilio signature using `TWILIO_AUTH_TOKEN` (prevents spoofing)
2. ✅ Extracts `MessageSid` and `MessageStatus` from the webhook payload
3. ✅ Finds the original message in the `TrackingEvent` table by `message_sid`
4. ✅ Creates new tracking events: `MESSAGE_DELIVERED`, `MESSAGE_READ`, or `MESSAGE_FAILED`
5. ✅ Implements idempotency checks to prevent duplicate events
6. ✅ Stores error codes and messages for failed deliveries

**Tracking Events Created:**
- `INVITATION_SENT` - When admin sends invitation
- `MESSAGE_DELIVERED` - When message reaches recipient's device
- `MESSAGE_READ` - When recipient reads the message (WhatsApp only)
- `MESSAGE_FAILED` - When delivery fails
- `LINK_OPENED` - When guest clicks the RSVP link
- `RSVP_SUBMITTED` - When guest completes RSVP

All events are stored in the `tracking_events` table with metadata including the message SID for correlation.

For more details on the implementation, see [`TWILIO_WEBHOOKS_IMPLEMENTATION.md`](./TWILIO_WEBHOOKS_IMPLEMENTATION.md).

##### Testing Webhooks Locally

For local development, use ngrok or a similar tool to expose your local server:

1. Install ngrok:
   ```bash
   npm install -g ngrok
   ```

2. Start your development server:
   ```bash
   npm run dev
   ```

3. In another terminal, start ngrok:
   ```bash
   ngrok http 3000
   ```

4. Copy the ngrok URL (e.g., `https://abc123.ngrok.io`)

5. Update your Twilio WhatsApp sender's Status callback URL to:
   ```
   https://abc123.ngrok.io/api/webhooks/twilio/status
   ```

6. Send a test WhatsApp message and watch your local console for webhook callbacks:
   ```
   [TWILIO_WEBHOOK] Received status callback
   [TWILIO_WEBHOOK] Created status event
   ```

7. Check the database for new `TrackingEvent` records with `event_type` of `MESSAGE_DELIVERED` or `MESSAGE_READ`

##### Webhook Security (Already Implemented!)

The webhook endpoint automatically validates that requests are genuinely from Twilio using HMAC-SHA1 signature verification:

**Security Features:**
- ✅ Validates `X-Twilio-Signature` header using `TWILIO_AUTH_TOKEN`
- ✅ Uses constant-time comparison to prevent timing attacks
- ✅ Rejects requests with invalid or missing signatures (403 Forbidden)
- ✅ Prevents spoofed webhook requests from unauthorized sources

**Implementation:**
- **File**: `src/lib/webhooks/twilio-validator.ts`
- **Function**: `validateTwilioSignature(url, params, signature, authToken)`

No additional configuration needed - security is enabled automatically when `TWILIO_AUTH_TOKEN` is set in your environment variables.

##### Monitoring Message Status (Built-in Analytics)

The application includes built-in analytics to monitor message engagement:

**Tracking Events in Database:**
- **INVITATION_SENT**: Message sent to Twilio
- **MESSAGE_DELIVERED**: Message delivered to recipient's device
- **MESSAGE_READ**: Recipient opened/read the message (WhatsApp only)
- **MESSAGE_FAILED**: Message failed to send (includes error code)
- **MESSAGE_RECEIVED**: Guest sent an inbound WhatsApp message to the number
- **AI_REPLY_SENT**: Application auto-replied to the guest using AI
- **LINK_OPENED**: Guest clicked the RSVP link in the message
- **RSVP_SUBMITTED**: Guest completed the RSVP form

**Analytics Functions Available:**
- `getGuestEngagementStatus(family_id, wedding_id)` - Full timeline for one family
- `getWeddingEngagementStats(wedding_id)` - Aggregate stats for all families
- `getChannelReadRates(wedding_id)` - Channel-specific delivery and read rates
- `getFamiliesWithUnreadMessages(wedding_id)` - Identify guests who haven't read invitations

**UI Components Available:**
- `GuestEngagementTimeline` - Visual timeline for single family
- `GuestEngagementList` - Summary list with status indicators
- `EngagementStats` - Dashboard with aggregate metrics

**Files:**
- Analytics: `src/lib/tracking/engagement.ts`
- Components: `src/components/admin/GuestEngagementTimeline.tsx`
- Documentation: [`TWILIO_WEBHOOKS_IMPLEMENTATION.md`](./TWILIO_WEBHOOKS_IMPLEMENTATION.md)

This helps planners:
- ✅ Identify guests who haven't received invitations
- ✅ Track engagement with WhatsApp messages (read receipts)
- ✅ Troubleshoot delivery issues with error codes
- ✅ Resend failed messages
- ✅ Send follow-up reminders to guests who haven't read messages
- ✅ Analyze which channels (WhatsApp, SMS, Email) have best engagement

##### Quick Reference: Production Configuration

**WhatsApp Sender Configuration in Twilio Console:**

```
Webhook URL for incoming messages: https://your-domain.com/api/webhooks/twilio/inbound  ← For AI auto-replies
Webhook method: HTTP POST
Fallback URL: [Leave blank]
Fallback method: HTTP POST

Status callback URL: https://your-domain.com/api/webhooks/twilio/status  ← For delivery/read tracking
Status callback method: HTTP POST ← IMPORTANT: Must be POST
```

**SMS Number Configuration in Twilio Console:**

```
A MESSAGE COMES IN: [Use default or leave blank]

Messaging Status Callback URL: https://your-domain.com/api/webhooks/twilio/status
```

**Environment Variables Required:**

```bash
# .env file
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here          # Required for webhook signature validation
TWILIO_PHONE_NUMBER=+1234567890                  # For SMS
TWILIO_WHATSAPP_NUMBER=+1234567890               # For WhatsApp
APP_URL=https://your-domain.com                  # Used to construct webhook callback URL
```

**Verify Webhooks Are Working:**

1. Send a test WhatsApp message from the admin panel
2. Check application logs for:
   ```
   [TWILIO_WEBHOOK] Received status callback
   [TWILIO_WEBHOOK] Created status event
   ```
3. Query the database:
   ```sql
   SELECT event_type, timestamp, metadata
   FROM tracking_events
   WHERE family_id = 'test-family-id'
   ORDER BY timestamp DESC;
   ```
4. You should see events in this order:
   - `INVITATION_SENT`
   - `MESSAGE_DELIVERED` (within seconds)
   - `MESSAGE_READ` (when recipient opens WhatsApp)

#### 9. Configure Inbound WhatsApp Messages and AI Auto-Replies

When guests reply to WhatsApp messages, the application can:
1. **Track the incoming message** — creates a `MESSAGE_RECEIVED` tracking event.
2. **Auto-reply using AI** — generates a context-aware reply in the guest's language and sends it back immediately via TwiML.

##### Prerequisites

- An active AI provider API key (OpenAI or Google Gemini).
- The inbound webhook URL configured in Twilio (see step 8 above).

##### Environment Variables

Add these to your `.env` file:

```bash
# Choose your AI provider: "openai" (default) or "gemini"
AI_PROVIDER=openai

# OpenAI (recommended: gpt-4o-mini for speed and cost)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini        # alternatives: gpt-4.1-mini, gpt-4.1-nano

# Google Gemini (alternative)
GEMINI_API_KEY=AI...
GEMINI_MODEL=gemini-2.0-flash   # alternatives: gemini-2.5-pro, gemini-2.5-flash
```

If neither key is set, incoming messages are still tracked but no auto-reply is sent.

##### Twilio Configuration

In the [Twilio Console](https://console.twilio.com/):

1. Navigate to **Messaging → Senders → WhatsApp senders**
2. Click on your WhatsApp sender
3. Set **Webhook URL for incoming messages** to:
   ```
   https://your-domain.com/api/webhooks/twilio/inbound
   ```
4. Set **Webhook method** to `HTTP POST`
5. Click **Save**

For local development, use [ngrok](https://ngrok.com/) to expose your local server and set the ngrok URL instead.

##### What the AI Replies Include

The AI assistant is given all wedding details:
- Couple names, date, time and venue
- RSVP deadline and guest-specific RSVP link
- Dress code, gift IBAN/bank account, dietary restrictions, transportation
- Guest's RSVP status (attending / not attending / pending) per family member

The AI responds **in the guest's preferred language** (ES, EN, FR, IT, DE) and always ends with a note directing guests to contact the couple for more personal questions.

##### Implementation Files

- **AI Service**: `src/lib/ai/wedding-assistant.ts` — builds the wedding context prompt and calls OpenAI or Gemini
- **Inbound Webhook**: `src/app/(public)/api/webhooks/twilio/inbound/route.ts` — receives Twilio POST, tracks events, returns TwiML reply
- **Tracking Events**: `MESSAGE_RECEIVED` and `AI_REPLY_SENT` in the `tracking_events` table

#### Troubleshooting

**SMS not sending:**
- Verify `TWILIO_PHONE_NUMBER` is in E.164 format (+1234567890)
- Check that the number is SMS-enabled in Twilio Console
- Review Twilio logs at [Monitor > Logs > Messaging](https://console.twilio.com/us1/monitor/logs/sms)

**WhatsApp not sending:**
- For sandbox: Ensure you've joined the sandbox by sending the code
- For production: Verify templates are approved by Meta
- Check that `TWILIO_WHATSAPP_NUMBER` has the correct format
- Review WhatsApp logs in Twilio Console

**Template approval taking too long:**
- Ensure template follows Meta's guidelines
- Avoid promotional language
- Keep messages concise and clear
- Contact Twilio support if approval takes more than 72 hours

**Rate limits:**
- Free trial accounts have sending limits
- Upgrade to a paid account for production use
- Consider implementing rate limiting in your application

#### Cost Considerations

- **SMS**: Varies by country (typically $0.0075-$0.10 per message)
- **WhatsApp**: $0.005-$0.02 per message (depends on conversation type)
- **Phone numbers**: Monthly rental fee (typically $1-$15/month)
- Check current pricing at [https://www.twilio.com/pricing](https://www.twilio.com/pricing)

#### Additional Resources

- [Twilio SMS Documentation](https://www.twilio.com/docs/sms)
- [Twilio WhatsApp Documentation](https://www.twilio.com/docs/whatsapp)
- [WhatsApp Message Templates](https://www.twilio.com/docs/whatsapp/tutorial/send-whatsapp-notification-messages-templates)
- [Meta WhatsApp Business Policy](https://www.whatsapp.com/legal/business-policy/)

### Google Photos Integration

Each wedding can be linked to a dedicated Google Photos shared album. Guests receive a contributor link to upload their own photos, and the admin panel syncs those photos into the gallery carousel displayed on the invitation page.

#### How It Works

1. The wedding admin clicks **Connect Google Photos** in the Configure → Gallery tab.
2. The app redirects to Google's OAuth consent screen requesting Photos Library access.
3. After the admin grants permission, the app automatically creates a shared album titled `Boda <couple names>` and stores the OAuth tokens and album URLs against the wedding record.
4. The admin copies the contributor share URL and distributes it to guests (or the invitation page surfaces it directly).
5. The admin triggers a **Sync** to pull any new photos from the album into the `WeddingPhoto` table for display in the gallery carousel.

#### 1. Enable the Google Photos Library API

1. Open the [Google Cloud Console](https://console.cloud.google.com/) and select the project that hosts your OAuth credentials.
2. Go to **APIs & Services → Library**.
3. Search for **"Photos Library API"** and click **Enable**.

> **Note:** The Photos Library API is separate from other Google APIs. It must be explicitly enabled even if Google Drive or other APIs are already active.

#### 2. Configure the OAuth 2.0 Credentials

The integration reuses the same `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` used for Google Sign-In. You only need to add the Google Photos callback URL as an additional authorized redirect URI.

1. Go to **APIs & Services → Credentials**.
2. Click your existing **OAuth 2.0 Client ID** (Web application type).
3. Under **Authorized redirect URIs**, add:
   ```
   https://your-domain.com/api/admin/gallery/google-photos/callback
   ```
   Replace `your-domain.com` with your actual domain. For local development also add:
   ```
   http://localhost:3000/api/admin/gallery/google-photos/callback
   ```
4. Click **Save**.

No new environment variables are required — the integration uses the existing `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from your `.env` file.

#### 3. Connect a Wedding to Google Photos

1. Log in as a wedding admin or planner.
2. Navigate to **Admin → Configure → Gallery** tab.
3. Click **Connect Google Photos**.
4. You will be redirected to Google's consent screen. Sign in with the Google account that will own the album and grant the requested permissions:
   - View and manage your Google Photos library
   - Share albums
5. After granting access, you are redirected back to the Configure page. The app will have:
   - Created a shared album named `Boda <couple names>` in the connected Google account.
   - Stored the OAuth refresh token and album URLs in the database.

> **Important:** The consent screen must be completed with `prompt=consent` so that a refresh token is issued. If you accidentally skip or deny the refresh token, disconnect and reconnect to repeat the flow.

#### 4. Share the Album with Guests

After connecting, two album URLs are available in the Configure → Gallery tab:

| URL | Purpose |
|-----|---------|
| **Album URL** (`google_photos_album_url`) | Opens the album in Google Photos — for the planner's own use |
| **Share URL** (`google_photos_share_url`) | Contributor link — share this with guests so they can upload photos |

The share URL can be embedded in WhatsApp messages or shown on the RSVP confirmation page.

#### 5. Sync Photos

The sync step pulls the latest media items from Google Photos into the local `WeddingPhoto` table so they appear in the invitation gallery carousel.

- Click **Sync Photos** in the Configure → Gallery tab.
- New items (identified by their stable Google Photos `productUrl`) are added; existing records are not duplicated.
- Up to 100 photos are fetched per sync.
- Access tokens are refreshed automatically if expired.

Sync as often as needed — for example, after the wedding day to pull guest uploads.

#### 6. Disconnect Google Photos

Click **Disconnect** in the Configure → Gallery tab. This clears all stored tokens and album references from the database. The Google Photos album itself is not deleted. Reconnecting will reuse the existing album if one was already created for the wedding.

#### Troubleshooting

**"Google Photos not connected" error during sync:**
- Ensure the OAuth flow completed successfully and a refresh token was stored.
- Disconnect and reconnect to repeat the OAuth flow.

**OAuth callback redirects to an error page:**
- `google_photos_denied` — the admin declined the consent screen. Try again and grant all requested permissions.
- `no_refresh_token` — Google did not return a refresh token. Revoke app access in your [Google Account permissions](https://myaccount.google.com/permissions) and reconnect to force a new consent prompt.
- `connection_failed` — a server-side error occurred. Check application logs for details.

**Photos not appearing in the gallery after sync:**
- Confirm the photos have been added to the album (check the Album URL directly in Google Photos).
- Check that the Photos Library API is enabled in Google Cloud Console.
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correctly set.

**OAuth credentials rejected:**
- Confirm the callback URL `https://your-domain.com/api/admin/gallery/google-photos/callback` is listed as an authorized redirect URI in the Google Cloud Console credentials.
- Ensure `APP_URL` in your `.env` matches the domain used to access the app.

#### Required OAuth Scopes

The app requests the following scopes during the Google Photos OAuth flow:

```
https://www.googleapis.com/auth/photoslibrary
https://www.googleapis.com/auth/photoslibrary.sharing
```

These are requested with `access_type=offline` and `prompt=consent` to ensure a refresh token is always returned.

#### Environment Variables

No new variables are needed beyond what is already required for Google OAuth login:

```bash
# Already required for Google Sign-In — also used for Google Photos
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret

# Must match the domain registered in Google Cloud Console redirect URIs
APP_URL=https://your-domain.com
```

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
