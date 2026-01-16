# Tasks Document: Wedding Management App MVP

## Phase 1: Project Setup & Infrastructure

- [x] 1.1. Initialize Next.js 14+ project with TypeScript and App Router
  - Files: package.json, tsconfig.json, next.config.js, .env.example
  - Initialize Next.js project with TypeScript, configure App Router
  - Set up environment variables structure
  - Purpose: Establish project foundation with modern Next.js architecture
  - _Leverage: Next.js 14 documentation, TypeScript best practices_
  - _Requirements: Technical Standards (Design doc)_
  - _Prompt: Implement the task for spec wedding-mvp, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Senior Full-stack Developer with expertise in Next.js and TypeScript | Task: Initialize a Next.js 14+ project with TypeScript and App Router, following the project structure defined in the design document. Set up environment variables for database, OAuth providers, and external services. | Restrictions: Must use Next.js App Router (not Pages Router), TypeScript strict mode enabled, create comprehensive .env.example with all required variables | Success: Next.js project initializes without errors, App Router configured correctly, TypeScript compiles successfully, environment variables documented in .env.example | After implementation: Mark task as [-] in tasks.md before starting, log implementation with log-implementation tool including all artifacts (files created, configuration details), then mark as [x] when complete_

- [x] 1.2. Set up Prisma ORM with PostgreSQL schema
  - Files: prisma/schema.prisma, .env
  - Create complete database schema with all models, enums, and relationships
  - Configure Prisma client generation
  - Purpose: Define data model and enable type-safe database access
  - _Leverage: Prisma documentation, PostgreSQL 15+_
  - _Requirements: Data Models section (Design doc), Requirements 1-12_
  - _Prompt: Implement the task for spec wedding-mvp, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Database Architect with expertise in PostgreSQL and Prisma ORM | Task: Create comprehensive Prisma schema including all models (MasterAdmin, WeddingPlanner, Wedding, WeddingAdmin, Family, FamilyMember, TrackingEvent, Gift, Notification, Translation, Theme) with proper relationships, indexes, and constraints as defined in the design document. | Restrictions: Must include all enums (Language, AuthProvider, PaymentMode, etc.), add proper indexes for performance, ensure cascade deletes are configured correctly for multi-tenancy | Success: Prisma schema compiles without errors, all relationships defined correctly, indexes on foreign keys and frequently queried fields, migrations can be generated | After implementation: Mark task as [-] in tasks.md before starting, log implementation with log-implementation tool including database schema artifacts, then mark as [x] when complete_

- [x] 1.3. Create project directory structure
  - Files: src/app/, src/components/, src/lib/, src/types/, prisma/, public/locales/, config/, tests/
  - Set up complete directory structure following design document
  - Create placeholder index files in each directory
  - Purpose: Organize codebase with clear separation of concerns
  - _Leverage: Project Structure section (Design doc)_
  - _Requirements: Technical Standards (Design doc)_
  - _Prompt: Implement the task for spec wedding-mvp, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Software Architect specializing in project organization and code structure | Task: Create the complete directory structure as specified in the design document, including app/, components/, lib/, types/, prisma/, public/locales/, config/, and tests/ directories with appropriate subdirectories. Create placeholder README.md or index.ts files in each directory to document its purpose. | Restrictions: Must follow exact structure from design document, create subdirectories for master/, planner/, admin/, guest/ in both app/ and components/, ensure proper separation between API routes and UI | Success: All directories created with clear organization, placeholder files help developers understand structure, follows design document exactly | After implementation: Mark task as [-] in tasks.md before starting, log implementation with log-implementation tool documenting directory structure, then mark as [x] when complete_

- [x] 1.4. Set up Prisma client singleton and database utilities
  - Files: src/lib/db/prisma.ts, src/lib/db/middleware.ts
  - Create Prisma client singleton with connection pooling
  - Implement Prisma middleware for multi-tenancy (wedding_id filtering)
  - Purpose: Provide type-safe database access with automatic tenant isolation
  - _Leverage: Prisma schema from task 1.2, Prisma middleware documentation_
  - _Requirements: Multi-Tenancy Design (Design doc), Security considerations_
  - _Prompt: Implement the task for spec wedding-mvp, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Developer with expertise in Prisma ORM and multi-tenancy patterns | Task: Create Prisma client singleton with proper connection pooling for production. Implement Prisma middleware that automatically injects wedding_id filtering on all queries for models that have wedding_id (Family, FamilyMember, TrackingEvent, Notification, Gift). Create utility functions for getting scoped clients with tenant context. | Restrictions: Must use singleton pattern to avoid multiple client instances, middleware must not break queries that legitimately don't need wedding_id filtering (like MasterAdmin queries), ensure proper TypeScript typing | Success: Prisma client initializes correctly with single instance, middleware automatically filters queries by wedding_id where appropriate, utility functions provide tenant-scoped access | After implementation: Mark task as [-] in tasks.md before starting, log implementation with log-implementation tool including class and function artifacts, then mark as [x] when complete_

## Phase 2: Type Definitions

- [x] 2.1. Create core TypeScript type definitions
  - Files: src/types/models.ts, src/types/api.ts, src/types/theme.ts
  - Define TypeScript interfaces for all database models
  - Create API request/response types
  - Define theme configuration types
  - Purpose: Ensure type safety across the application
  - _Leverage: Prisma schema from task 1.2, Design document data models_
  - _Requirements: Data Models section (Design doc)_
  - _Prompt: Implement the task for spec wedding-mvp, first run spec-workflow-guide to get the workflow guide then implement the task: Role: TypeScript Developer specializing in type systems and interfaces | Task: Create comprehensive TypeScript type definitions in three files: models.ts for database entity types (matching Prisma schema but for application use), api.ts for API request/response formats including APIResponse generic wrapper, and theme.ts for ThemeConfig and Theme types. Ensure types match the interfaces defined in the design document. | Restrictions: Must maintain consistency with Prisma generated types, include all enums, ensure proper typing for JSONB fields (metadata, theme config), use proper TypeScript utility types (Partial, Pick, Omit) where appropriate | Success: All types compile without errors, types match design document specifications, proper use of generics for API responses, theme types support all configuration options | After implementation: Mark task as [-] in tasks.md before starting, log implementation with log-implementation tool documenting all interfaces and types created, then mark as [x] when complete_

## Phase 3: Authentication System

- [x] 3.1. Configure NextAuth.js for OAuth providers
  - Files: src/app/api/auth/[...nextauth]/route.ts, src/lib/auth/oauth.ts, config/master-admin.json
  - Set up NextAuth.js with Google, Facebook, Apple providers
  - Configure callbacks for user session management
  - Create master admin configuration file
  - Purpose: Enable secure OAuth authentication for all admin users
  - _Leverage: NextAuth.js documentation, OAuth provider docs_
  - _Requirements: Requirement 1 (Master Admin), Requirement 2 (Planner), Requirement 3 (Wedding Admin), Authentication Flows (Design doc)_
  - _Prompt: Implement the task for spec wedding-mvp, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Security Engineer with expertise in OAuth and NextAuth.js | Task: Configure NextAuth.js with Google, Facebook/Instagram, and Apple OAuth providers. Implement signin, jwt, and session callbacks to create AuthenticatedUser objects with proper role detection (master_admin checks config/master-admin.json, wedding_admin checks database invitation). Store preferred_language and last_login_provider in user records. | Restrictions: Must use state parameter for CSRF protection, implement provider verification for master admin email, never cache master admin verification (check every login), handle OAuth errors gracefully | Success: All three OAuth providers work correctly, proper user role assignment, session includes user context (role, wedding_id, planner_id), master admin access controlled by config file | After implementation: Mark task as [-] in tasks.md before starting, log implementation with log-implementation tool including authentication endpoints and integration patterns, then mark as [x] when complete_

- [x] 3.2. Implement magic link generation and validation
  - Files: src/lib/auth/magic-link.ts
  - Create functions to generate secure magic tokens
  - Implement token validation logic
  - Add channel tracking for magic links
  - Purpose: Enable password-free guest authentication
  - _Leverage: crypto.randomUUID(), Prisma client from task 1.4_
  - _Requirements: Requirement 4 (Magic Link Authentication), Magic Link Security (Design doc)_
  - _Prompt: Implement the task for spec wedding-mvp, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Security Developer specializing in authentication and cryptography | Task: Create magic link utilities including generateMagicLink(family_id: string) that creates cryptographically secure UUID v4 tokens, and validateMagicLink(token: string) that returns Family data if valid. Tokens should be stored in family.magic_token field and remain valid until wedding date. Support channel parameter (whatsapp/email/sms) in magic link URLs. | Restrictions: Must use crypto.randomUUID() for secure tokens, never use sequential IDs or timestamps, tokens must be unique and unpredictable, validate token format before database query | Success: Tokens are cryptographically secure UUIDs, validation correctly returns family or null, channel tracking works via URL parameters, tokens persist until wedding date | After implementation: Mark task as [-] in tasks.md before starting, log implementation with log-implementation tool including function signatures and security measures, then mark as [x] when complete_

- [x] 3.3. Create authentication middleware
  - Files: src/middleware.ts, src/lib/auth/middleware.ts
  - Implement Next.js middleware for route protection
  - Create role-based access control helpers
  - Extract user context from session
  - Purpose: Protect routes and enforce authorization
  - _Leverage: NextAuth.js session, task 3.1 OAuth setup_
  - _Requirements: Multi-Tenancy Security (Design doc), Authentication Flows_
  - _Prompt: Implement the task for spec wedding-mvp, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Developer with expertise in middleware and authorization | Task: Create Next.js middleware that protects routes based on user roles. Implement requireAuth(role) helper that checks user session and role. Create extractUserContext(req) that gets AuthenticatedUser from session. Protect /master/* routes for master_admin, /planner/* for planner, /admin/* for wedding_admin. Allow public access to /rsvp/* with magic token validation. | Restrictions: Must check role and wedding_id access on every request, redirect unauthorized users to appropriate login, do not allow cross-tenant access, ensure master admin verification happens every time | Success: Routes are properly protected by role, unauthorized access redirected correctly, user context available in API routes, multi-tenancy violations prevented | After implementation: Mark task as [-] in tasks.md before starting, log implementation with log-implementation tool documenting middleware functions and protected routes, then mark as [x] when complete_

## Phase 4: Internationalization (i18n)

- [x] 4.1. Set up next-intl configuration
  - Files: src/lib/i18n/config.ts, src/lib/i18n/server.ts, src/lib/i18n/client.ts
  - Configure next-intl for 5 languages (es, en, fr, it, de)
  - Create server-side translation utilities
  - Create client-side translation hooks
  - Purpose: Enable multi-language support across the platform
  - _Leverage: next-intl documentation, design doc i18n requirements_
  - _Requirements: Requirement 9 (Multi-Language Support), Internationalization section (Design doc)_
  - _Prompt: Implement the task for spec wedding-mvp, first run spec-workflow-guide to get the workflow guide then implement the task: Role: i18n Specialist with expertise in next-intl and React | Task: Configure next-intl for Spanish, English, French, Italian, and German. Create config.ts with supported languages and fallback logic. Implement server.ts with getTranslations(language) and t(key, language, variables) functions. Create client.ts with useTranslations() hook. Set up language detection priority: user preference → URL parameter → browser language → wedding default → platform default (en). | Restrictions: Must support both server and client components, ensure proper fallback to English for missing translations, maintain type safety with translation keys, cache translations for performance | Success: All 5 languages configured, server and client translation utilities work correctly, language detection follows specified priority, fallback to English works gracefully | After implementation: Mark task as [-] in tasks.md before starting, log implementation with log-implementation tool including i18n configuration and utility functions, then mark as [x] when complete_

- [x] 4.2. Create translation JSON files for all languages
  - Files: public/locales/es/common.json, public/locales/en/common.json, public/locales/fr/common.json, public/locales/it/common.json, public/locales/de/common.json
  - Create initial translation keys for common UI elements
  - Translate master admin, planner, and wedding admin interfaces
  - Translate guest RSVP pages
  - Purpose: Provide translations for all user-facing text
  - _Leverage: Requirements document language needs, design doc usability requirements_
  - _Requirements: Requirement 9 (Multi-Language Support), Usability (Design doc)_
  - _Prompt: Implement the task for spec wedding-mvp, first run spec-workflow-guide to get the workflow guide then implement the task: Role: i18n Content Specialist fluent in Spanish, English, French, Italian, and German | Task: Create comprehensive translation JSON files for all 5 languages. Include translations for: navigation, buttons, forms, validation messages, error messages, success messages, RSVP page content, payment instructions, confirmation messages. Organize translations by context (master, planner, admin, guest, common). Ensure elderly-friendly language for guest pages. | Restrictions: Must use clear, simple language especially for guest-facing translations, maintain consistency in terminology across languages, use formal addressing in Spanish/French/Italian/German, ensure all keys exist in all language files | Success: All language files complete with same keys, translations are accurate and culturally appropriate, guest-facing language is elderly-friendly and clear, no missing translations in any language | After implementation: Mark task as [-] in tasks.md before starting, log implementation with log-implementation tool documenting translation structure and key categories, then mark as [x] when complete_

## Phase 5: Master Admin Module

- [x] 5.1. Create Master Admin API routes
  - Files: src/app/api/master/planners/route.ts, src/app/api/master/planners/[id]/route.ts, src/app/api/master/weddings/route.ts, src/app/api/master/analytics/route.ts
  - Implement GET /api/master/planners (list all planners)
  - Implement POST /api/master/planners (create planner)
  - Implement PATCH /api/master/planners/:id (update planner enabled status)
  - Implement GET /api/master/weddings (read-only list all weddings)
  - Implement GET /api/master/analytics (platform analytics)
  - Purpose: Provide API endpoints for master admin platform management
  - _Leverage: Prisma client from task 1.4, auth middleware from task 3.3, type definitions from task 2.1_
  - _Requirements: Requirement 1 (Master Admin Platform Management), Master Admin APIs (Design doc)_
  - _Prompt: Implement the task for spec wedding-mvp, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend API Developer with expertise in Next.js App Router and RESTful APIs | Task: Create master admin API routes following RESTful conventions. Implement planner CRUD operations with proper validation (require name, logo_url, email). Implement wedding read-only listing. Add analytics endpoint returning total planners, active planners, total weddings, total guests. Use consistent APIResponse format. Protect all routes with master_admin role check. | Restrictions: Must validate master admin access on every request, implement input validation with Zod, return proper HTTP status codes, never allow master admin to modify weddings directly, implement pagination for list endpoints (50 per page) | Success: All endpoints work correctly with proper authentication, planner enable/disable immediately affects access, weddings display correctly in read-only mode, analytics return accurate counts, proper error handling | After implementation: Mark task as [-] in tasks.md before starting, log implementation with log-implementation tool including all API endpoints created with full specifications, then mark as [x] when complete_

- [x] 5.2. Create Master Admin UI components and pages
  - Files: src/app/master/page.tsx, src/app/master/planners/page.tsx, src/components/master/PlannerList.tsx, src/components/master/PlannerForm.tsx, src/components/master/WeddingList.tsx, src/components/master/AnalyticsCard.tsx
  - Create master admin dashboard page with analytics
  - Create planner management page with list and form
  - Create wedding overview page (read-only)
  - Design mobile-first, responsive UI components
  - Purpose: Provide master admin with intuitive platform management interface
  - _Leverage: Master Admin APIs from task 5.1, Tailwind CSS, i18n from task 4.1_
  - _Requirements: Requirement 1 (Master Admin Platform Management), Mobile-First Design (Design doc)_
  - _Prompt: Implement the task for spec wedding-mvp, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer specializing in React and mobile-first design | Task: Create master admin UI with dashboard showing analytics cards (total planners, active planners, total weddings, total guests). Create planner management page with table/list view showing planner name, logo, status, wedding count, last login. Add modal/form for creating new planners. Create read-only wedding list showing all weddings across all planners with filters. Use Tailwind CSS for mobile-first responsive design. Integrate translations using i18n. | Restrictions: Must be mobile-first with responsive design, use Tailwind CSS only (no custom CSS), implement proper loading and error states, follow accessibility guidelines (WCAG 2.1), integrate with i18n for all text | Success: Dashboard displays analytics correctly, planner list shows all information with status toggle working, new planner form validates correctly, wedding list displays read-only data, fully responsive on mobile/tablet/desktop, accessible and translated | After implementation: Mark task as [-] in tasks.md before starting, log implementation with log-implementation tool documenting all React components created with props and purpose, then mark as [x] when complete_

## Phase 6: Theme System

- [x] 6.1. Create theme engine and pre-built themes
  - Files: src/lib/theme/engine.ts, src/lib/theme/presets.ts
  - Implement theme CSS generation from ThemeConfig
  - Create 5 pre-built system themes (Classic Elegance, Garden Romance, Modern Minimal, Rustic Charm, Beach Breeze)
  - Add theme caching logic
  - Purpose: Enable custom visual themes for guest-facing pages
  - _Leverage: Type definitions from task 2.1, theme configuration structure_
  - _Requirements: Requirement 10 (Theme System), Theme Service (Design doc)_
  - _Prompt: Implement the task for spec wedding-mvp, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Engineer specializing in CSS-in-JS and theming systems | Task: Create theme engine that generates CSS from ThemeConfig JSONB (colors, fonts, button styles, spacing, images). Implement generateThemeCSS(theme: Theme) that returns CSS string with CSS custom properties. Create 5 pre-built themes as system_themes with distinct visual styles: Classic (elegant traditional), Garden (romantic florals), Modern (minimal clean), Rustic (warm natural), Beach (light airy). Include theme caching in memory for performance. | Restrictions: Must generate valid CSS custom properties, support all ThemeConfig fields, ensure themes are mobile-friendly and accessible, cache themes for 1 hour, validate theme config before applying | Success: Theme engine generates valid CSS from config, all 5 pre-built themes have distinct visual styles, themes apply correctly to guest pages, caching improves performance, themes are accessible and mobile-friendly | After implementation: Mark task as [-] in tasks.md before starting, log implementation with log-implementation tool documenting theme engine functions and all 5 preset themes with their configurations, then mark as [x] when complete_

- [x] 6.2. Create theme management API routes
  - Files: src/app/api/planner/themes/route.ts, src/app/api/planner/themes/[id]/route.ts
  - Implement GET /api/planner/themes (list system + planner themes)
  - Implement POST /api/planner/themes (create custom theme)
  - Implement PATCH /api/planner/themes/:id (update theme)
  - Implement DELETE /api/planner/themes/:id (delete if not in use)
  - Purpose: Allow planners to create and manage custom themes
  - _Leverage: Theme engine from task 6.1, Prisma client, auth middleware_
  - _Requirements: Requirement 10 (Theme System), Planner APIs (Design doc)_
  - _Prompt: Implement the task for spec wedding-mvp, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend API Developer with expertise in REST APIs and validation | Task: Create theme management API routes for planners. GET endpoint returns both system themes (is_system_theme=true) and planner's custom themes. POST validates ThemeConfig structure and creates theme linked to planner_id. PATCH allows updating only planner's own themes. DELETE checks if theme is in use by any weddings and prevents deletion if so (return 409 Conflict with wedding count). Protect all routes with planner role. | Restrictions: Must validate ThemeConfig structure with Zod, prevent modification of system themes, ensure planner can only access their own themes, check theme usage before deletion, use proper HTTP status codes | Success: Planners can list all available themes, create custom themes with valid config, update their own themes, cannot delete themes in use, system themes are read-only, proper error messages | After implementation: Mark task as [-] in tasks.md before starting, log implementation with log-implementation tool including all theme API endpoints with request/response formats, then mark as [x] when complete_

## Phase 7: Wedding Planner Module

- [x] 7.1. Create Wedding Planner API routes
  - Files: src/app/api/planner/weddings/route.ts, src/app/api/planner/weddings/[id]/route.ts, src/app/api/planner/weddings/[id]/admins/route.ts, src/app/api/planner/stats/route.ts
  - Implement GET /api/planner/weddings (list planner's weddings)
  - Implement POST /api/planner/weddings (create wedding)
  - Implement GET /api/planner/weddings/:id (get wedding details)
  - Implement PATCH /api/planner/weddings/:id (update wedding)
  - Implement POST /api/planner/weddings/:id/admins (invite wedding admin)
  - Implement DELETE /api/planner/weddings/:id/admins/:admin_id (remove admin)
  - Implement GET /api/planner/stats (dashboard stats)
  - Purpose: Provide API endpoints for wedding planner multi-wedding management
  - _Leverage: Prisma client, auth middleware, type definitions_
  - _Requirements: Requirement 2 (Wedding Planner Multi-Wedding Management), Planner APIs (Design doc)_
  - _Prompt: Implement the task for spec wedding-mvp, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend API Developer with expertise in multi-tenancy and REST APIs | Task: Create planner API routes with proper planner_id filtering. Implement wedding CRUD requiring couple_names, wedding_date, wedding_time, location, rsvp_cutoff_date, default_language, payment_tracking_mode, allow_guest_additions. Implement wedding admin invitation that sends email with OAuth sign-in link and grants access to specific wedding only. Add stats endpoint returning wedding count, total guests, RSVP completion %, upcoming weddings. Ensure all operations filter by session planner_id. | Restrictions: Must filter all queries by planner_id for data isolation, validate required wedding fields, send invitation emails asynchronously, check wedding_id access for admin operations, implement pagination (50 per page), use Zod validation | Success: Planners can only access their own weddings, wedding creation requires all fields, admin invitations send emails correctly, admin access is wedding-specific, stats calculate correctly, proper multi-tenancy isolation | After implementation: Mark task as [-] in tasks.md before starting, log implementation with log-implementation tool documenting all planner APIs with full endpoint specifications, then mark as [x] when complete_

- [x] 7.2. Create Wedding Planner UI components and pages
  - Files: src/app/planner/page.tsx, src/app/planner/weddings/page.tsx, src/app/planner/weddings/[id]/page.tsx, src/components/planner/WeddingCard.tsx, src/components/planner/WeddingForm.tsx, src/components/planner/StatsCard.tsx, src/components/planner/AdminInviteForm.tsx
  - Create planner dashboard with stats and wedding list
  - Create wedding creation/edit form with theme selection
  - Create wedding detail page showing guest count, RSVP status, admins
  - Create admin invitation modal
  - Purpose: Provide planners with intuitive multi-wedding management interface
  - _Leverage: Planner APIs from task 7.1, theme system from task 6, Tailwind CSS, i18n_
  - _Requirements: Requirement 2 (Wedding Planner Multi-Wedding Management), Mobile-First Design (Design doc)_
  - _Prompt: Implement the task for spec wedding-mvp, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer specializing in React and dashboard interfaces | Task: Create planner dashboard showing stats cards (total weddings, total guests, RSVP completion %, upcoming weddings) and wedding list with cards/table showing couple names, date, guest count, RSVP %, status. Create wedding form with all required fields including theme dropdown (populated from theme API), payment mode toggle, guest additions toggle. Create wedding detail page with tabs for overview, guests, admins. Add admin invitation modal with email input. Use mobile-first Tailwind CSS design. Integrate i18n. | Restrictions: Must be mobile-first responsive, use Tailwind CSS only, implement loading/error states, validate form inputs client-side, show confirmation for destructive actions (remove admin), integrate with i18n, follow accessibility guidelines | Success: Dashboard shows accurate stats, wedding list displays all weddings with correct data, wedding form validates and submits correctly, theme selection works, wedding detail page shows all information, admin invitation modal sends invitations, fully responsive and accessible | After implementation: Mark task as [-] in tasks.md before starting, log implementation with log-implementation tool documenting all planner components with their props and purpose, then mark as [x] when complete_

## Phase 8: Excel Import/Export System

- [x] 8.1. Create Excel service utilities
  - Files: src/lib/excel/import.ts, src/lib/excel/export.ts, src/lib/excel/templates.ts
  - Implement importGuestList(wedding_id, file) with validation
  - Implement exportGuestData(wedding_id, format) for xlsx/csv
  - Implement generateTemplate() for downloadable Excel template
  - Purpose: Enable bulk guest list management via Excel files
  - _Leverage: xlsx library, Prisma client, magic link generator from task 3.2_
  - _Requirements: Requirement 11 (Excel Import/Export), Requirement 3 (Wedding Admin Guest Management), Excel Service (Design doc)_
  - _Prompt: Implement the task for spec wedding-mvp, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Developer with expertise in file processing and data validation | Task: Create Excel import service that validates required columns (Family Name, Contact Person, Email, Phone, WhatsApp, Language, Member 1-10 Name/Type/Age), parses family and member data, validates language codes (es/en/fr/it/de), generates magic tokens and reference codes (if automated mode), and performs atomic database inserts. Create export service that generates Excel with all family data including RSVP status, attendance, dietary info, payment status. Create template generator with pre-filled headers and example data. Use xlsx library. | Restrictions: Must validate all data before any database operations (atomic transactions), flag duplicate emails/phones as warnings, validate language codes with fallback to wedding default, generate unique reference codes for automated payment mode, handle Excel parsing errors gracefully, support up to 500 families | Success: Import validates correctly and provides detailed error reports, successful imports are atomic (all-or-nothing), magic tokens and reference codes generated correctly, export includes all current data, template is clear and user-friendly, handles large files (500 families) in under 10 seconds | After implementation: Mark task as [-] in tasks.md before starting, log implementation with log-implementation tool documenting Excel functions with their signatures and validation logic, then mark as [x] when complete_

- [x] 8.2. Create Excel import/export API routes
  - Files: src/app/api/admin/guests/import/route.ts, src/app/api/admin/guests/export/route.ts, src/app/api/admin/guests/template/route.ts
  - Implement POST /api/admin/guests/import (upload and import Excel)
  - Implement GET /api/admin/guests/export (export guest data)
  - Implement GET /api/admin/guests/template (download template)
  - Purpose: Provide API endpoints for Excel-based guest management
  - _Leverage: Excel service from task 8.1, auth middleware, Prisma client_
  - _Requirements: Requirement 11 (Excel Import/Export), Wedding Admin APIs (Design doc)_
  - _Prompt: Implement the task for spec wedding-mvp, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend API Developer with expertise in file upload handling and streaming | Task: Create Excel API routes for wedding admins. POST /import accepts multipart/form-data with Excel file, validates file size/type, calls importGuestList service, returns ImportResult with success/error details. GET /export calls exportGuestData service, returns Excel file with proper content-type headers and filename. GET /template returns template Excel file. Protect all routes with wedding_admin role and ensure wedding_id matches session. | Restrictions: Must validate file size (max 5MB), validate file type (xlsx only), use streaming for large exports, ensure wedding_id from session matches wedding being modified, return detailed error reports for import failures, set proper Content-Disposition headers for downloads | Success: Import handles Excel files correctly with detailed validation feedback, export generates downloadable Excel with all data, template downloads correctly, proper error handling for invalid files, wedding_id isolation enforced | After implementation: Mark task as [-] in tasks.md before starting, log implementation with log-implementation tool documenting Excel APIs with request/response formats and file handling details, then mark as [x] when complete_

## Phase 9: Wedding Admin Module

- [x] 9.1. Create Wedding Admin guest management API routes
  - Files: src/app/api/admin/wedding/route.ts, src/app/api/admin/guests/route.ts, src/app/api/admin/guests/[id]/route.ts
  - Implement GET /api/admin/wedding (get wedding details for admin)
  - Implement PATCH /api/admin/wedding (update wedding config)
  - Implement GET /api/admin/guests (list all families with filters)
  - Implement PATCH /api/admin/guests/:id (update family)
  - Purpose: Provide wedding admins with guest management APIs
  - _Leverage: Prisma client with multi-tenancy middleware, auth middleware, type definitions_
  - _Requirements: Requirement 3 (Wedding Admin Guest Management), Wedding Admin APIs (Design doc)_
  - _Prompt: Implement the task for spec wedding-mvp, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend API Developer with expertise in filtering and data management | Task: Create wedding admin API routes with automatic wedding_id filtering from session. GET /wedding returns wedding details including config, guest count, RSVP stats. PATCH /wedding allows updating RSVP cutoff date, payment mode, guest additions. GET /guests lists all families with optional filters (RSVP status, attendance, channel, payment status) and includes family members, RSVP status, payment status. PATCH /guests/:id allows updating family contact info. Implement pagination (50 per page). | Restrictions: Must automatically filter by wedding_id from session, validate wedding_id matches for all operations, implement proper filtering with query parameters, return aggregated RSVP stats, use pagination for guests list, validate update permissions | Success: Wedding admins can only access their assigned wedding, guest list displays correctly with filters working, RSVP stats calculate accurately, updates work correctly with validation, pagination works smoothly, proper multi-tenancy isolation | After implementation: Mark task as [-] in tasks.md before starting, log implementation with log-implementation tool documenting all wedding admin guest management APIs with full specifications, then mark as [x] when complete_

- [x] 9.2. Create Wedding Admin notifications and reminders API routes
  - Files: src/app/api/admin/notifications/route.ts, src/app/api/admin/notifications/[id]/read/route.ts, src/app/api/admin/notifications/export/route.ts, src/app/api/admin/reminders/route.ts, src/app/api/admin/reminders/preview/route.ts
  - Implement GET /api/admin/notifications (get filtered notifications)
  - Implement PATCH /api/admin/notifications/:id/read (mark as read)
  - Implement POST /api/admin/notifications/export (export filtered)
  - Implement POST /api/admin/reminders (send manual reminders)
  - Implement GET /api/admin/reminders/preview (preview reminder recipients)
  - Purpose: Enable wedding admins to monitor activity and send reminders
  - _Leverage: Prisma client, tracking service, email service (will be created), auth middleware_
  - _Requirements: Requirement 7 (Wedding Admin Activity Tracking), Requirement 8 (Manual Reminder System), Wedding Admin APIs (Design doc)_
  - _Prompt: Implement the task for spec wedding-mvp, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend API Developer with expertise in notifications and messaging systems | Task: Create notification API routes returning TrackingEvents with unread badges. Implement filters (date range, event type, family, channel, read/unread). Add export generating Excel/CSV with filtered events. Create reminder endpoints: preview identifies families with no RSVP response and returns count/list, send prepares personalized messages with magic links in family's preferred language, creates tracking events with event_type='reminder_sent' and admin_triggered=true. Filter by wedding_id from session. | Restrictions: Must filter by wedding_id automatically, implement date range filtering, sort notifications by timestamp desc, mark read with timestamp, export respects filters, reminders only to families without RSVP, personalize message language per family, validate channel selection | Success: Notifications display correctly with filters, unread badges accurate, mark as read works, export includes filtered data, reminder preview shows correct families, reminders send with personalized languages, tracking events created correctly | After implementation: Mark task as [-] in tasks.md before starting, log implementation with log-implementation tool documenting notification and reminder APIs with specifications, then mark as [x] when complete_

- [x] 9.3. Create Wedding Admin payment management API routes
  - Files: src/app/api/admin/payments/route.ts, src/app/api/admin/payments/[id]/route.ts
  - Implement GET /api/admin/payments (list all payments for wedding)
  - Implement POST /api/admin/payments (manually record payment)
  - Implement PATCH /api/admin/payments/:id (update payment status)
  - Purpose: Allow wedding admins to track and manage gift payments
  - _Leverage: Prisma client, auth middleware, type definitions_
  - _Requirements: Requirement 6 (Payment Information Display), Wedding Admin APIs (Design doc)_
  - _Prompt: Implement the task for spec wedding-mvp, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend API Developer with expertise in payment tracking and financial data | Task: Create payment management API routes filtered by wedding_id. GET /payments lists all Gift records with family info, amount, reference code, status, transaction date. POST /payments allows manual recording with family_id, amount, transaction_date (sets auto_matched=false). PATCH /:id updates gift status (PENDING → RECEIVED → CONFIRMED). Create tracking event for payment_received when status changes to RECEIVED. | Restrictions: Must filter by wedding_id automatically, validate family_id belongs to wedding, ensure amounts are positive decimals, validate transaction dates are reasonable, update family payment status when gift is confirmed, create tracking events for payment state changes | Success: Payments list displays correctly for wedding, manual recording works with validation, status updates work correctly, tracking events created appropriately, family payment status updates when gift confirmed, proper multi-tenancy isolation | After implementation: Mark task as [-] in tasks.md before starting, log implementation with log-implementation tool documenting payment APIs with request/response formats, then mark as [x] when complete_

- [x] 9.4. Create Wedding Admin guest additions review API routes (conditional)
  - Files: src/app/api/admin/guest-additions/route.ts, src/app/api/admin/guest-additions/[id]/route.ts
  - Implement GET /api/admin/guest-additions (list guest-added members)
  - Implement PATCH /api/admin/guest-additions/:id (approve/edit addition)
  - Purpose: Allow wedding admins to review guest-added family members
  - _Leverage: Prisma client, auth middleware_
  - _Requirements: Requirement 12 (Guest Addition Review), Wedding Admin APIs (Design doc)_
  - _Prompt: Implement the task for spec wedding-mvp, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend API Developer with expertise in approval workflows | Task: Create guest additions API routes filtered by wedding_id. GET /guest-additions lists all FamilyMember records with added_by_guest=true, including family info, member details, and tracking event details (who added, when). PATCH /:id allows updating member details or marking as reviewed. Only return data if wedding.allow_guest_additions=true. | Restrictions: Must filter by wedding_id automatically, only show members with added_by_guest=true, include "NEW" badge for unreviewed additions, check allow_guest_additions setting before returning data, validate member updates | Success: Guest additions display correctly when feature enabled, "NEW" badges show for unreviewed members, editing works with validation, returns empty/disabled when allow_guest_additions=false, proper multi-tenancy isolation | After implementation: Mark task as [-] in tasks.md before starting, log implementation with log-implementation tool documenting guest additions APIs with conditional logic, then mark as [x] when complete_

- [x] 9.5. Create Wedding Admin UI components and pages
  - Files: src/app/admin/page.tsx, src/app/admin/guests/page.tsx, src/app/admin/notifications/page.tsx, src/app/admin/payments/page.tsx, src/components/admin/GuestTable.tsx, src/components/admin/GuestFilters.tsx, src/components/admin/NotificationList.tsx, src/components/admin/ReminderModal.tsx, src/components/admin/PaymentList.tsx, src/components/admin/PaymentForm.tsx, src/components/admin/GuestAdditionsReview.tsx
  - Create wedding admin dashboard with key metrics
  - Create guest management page with table, filters, import/export
  - Create notifications page with filters and export
  - Create payments page with manual entry form
  - Create guest additions review section (conditional)
  - Purpose: Provide wedding admins with comprehensive wedding management interface
  - _Leverage: Wedding Admin APIs from tasks 9.1-9.4, Excel APIs from task 8.2, Tailwind CSS, i18n_
  - _Requirements: Requirement 3, 7, 8, 12 (Wedding Admin requirements), Mobile-First Design (Design doc)_
  - _Prompt: Implement the task for spec wedding-mvp, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer specializing in React and data-heavy interfaces | Task: Create wedding admin UI with dashboard showing wedding details, guest count, RSVP completion %, payment status. Create guest management page with table/cards displaying families with RSVP status, attendance, payment, channel. Add filters (RSVP status, attendance, channel, payment) and import/export buttons. Create notifications page with event list, filters, and mark-as-read functionality. Add reminder modal showing preview of recipients and send button with channel selection. Create payments page listing gifts with manual entry form. Add guest additions review section showing members with added_by_guest=true if feature enabled. Use mobile-first Tailwind CSS. Integrate i18n. | Restrictions: Must be mobile-first responsive, use Tailwind CSS only, implement loading/error states, validate forms client-side, show clear confirmation messages, handle large guest lists with pagination, integrate with i18n, follow accessibility guidelines | Success: Dashboard shows accurate metrics, guest table displays all data with working filters, import/export functions work, notifications display with filters and mark-as-read, reminders preview and send correctly, payments list and form work, guest additions review displays conditionally, fully responsive and accessible | After implementation: Mark task as [-] in tasks.md before starting, log implementation with log-implementation tool documenting all wedding admin components with props and purposes, then mark as [x] when complete_

## Phase 10: Guest RSVP Module

- [ ] 10.1. Create Guest RSVP API routes
  - Files: src/app/api/guest/[token]/route.ts, src/app/api/guest/[token]/rsvp/route.ts, src/app/api/guest/[token]/member/route.ts, src/app/api/guest/[token]/language/route.ts, src/app/api/guest/[token]/payment/route.ts
  - Implement GET /api/guest/:token (get family RSVP page data)
  - Implement POST /api/guest/:token/rsvp (submit/update RSVP)
  - Implement POST /api/guest/:token/member (add family member if allowed)
  - Implement PATCH /api/guest/:token/language (update language preference)
  - Implement GET /api/guest/:token/payment (get payment information)
  - Purpose: Provide guest-facing APIs for RSVP submission and management
  - _Leverage: Magic link validation from task 3.2, Prisma client, tracking service, type definitions_
  - _Requirements: Requirement 4 (Magic Link Authentication), Requirement 5 (Family-Based RSVP), Requirement 6 (Payment Information), Guest APIs (Design doc)_
  - _Prompt: Implement the task for spec wedding-mvp, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend API Developer with expertise in public-facing APIs and security | Task: Create guest API routes using magic token for authentication. GET /:token validates token, tracks link_opened event with channel from query param, returns family data with members, wedding details, theme. POST /rsvp validates RSVP cutoff date, updates member attending flags and dietary/accessibility info, creates rsvp_submitted tracking event, returns confirmation. POST /member checks allow_guest_additions, adds member with added_by_guest=true, creates guest_added tracking event. PATCH /language updates family.preferred_language. GET /payment returns IBAN and reference code (automated) or IBAN only (manual) with payment status. | Restrictions: Must validate magic token on every request, enforce RSVP cutoff (return 403 after cutoff), track channel attribution from URL param, validate token format before database query, check allow_guest_additions before member creation, ensure proper error messages for guests | Success: Token validation works correctly, RSVP submission validates and saves correctly, cutoff enforcement works, channel tracking accurate, member addition conditional on setting, language preference persists, payment info displays correctly based on mode, tracking events created for all actions | After implementation: Mark task as [-] in tasks.md before starting, log implementation with log-implementation tool documenting all guest APIs with security measures and tracking details, then mark as [x] when complete_

- [ ] 10.2. Create Guest RSVP UI pages and components
  - Files: src/app/rsvp/[token]/page.tsx, src/components/guest/RSVPForm.tsx, src/components/guest/FamilyMemberCard.tsx, src/components/guest/PaymentInfo.tsx, src/components/guest/LanguageSelector.tsx, src/components/guest/ConfirmationMessage.tsx
  - Create RSVP page with personalized welcome and family name
  - Create family member selection cards with dietary/accessibility fields
  - Create add member button (conditional)
  - Create payment information display
  - Create confirmation message after submission
  - Apply theme from wedding configuration
  - Purpose: Provide guests with intuitive, elderly-friendly RSVP interface
  - _Leverage: Guest APIs from task 10.1, theme engine from task 6.1, Tailwind CSS, i18n_
  - _Requirements: Requirement 5 (Family-Based RSVP), Requirement 6 (Payment Information), Usability (Design doc)_
  - _Prompt: Implement the task for spec wedding-mvp, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Frontend Developer specializing in mobile-first design and user experience | Task: Create guest RSVP page with personalized welcome "Hola, Familia [Name]!". Display pre-populated family members with checkboxes for attending, and show dietary restrictions and accessibility needs fields only when member is marked attending. Add "Add Member" button if allow_guest_additions=true. Show language selector dropdown with 5 languages. After submission, display confirmation message and payment information section with IBAN and reference code (automated mode) or IBAN only (manual mode). Apply theme CSS from wedding configuration. Use large fonts (minimum 16px), high contrast, large touch targets (≥44px), minimal scrolling. Optimize for WhatsApp in-app browser. Use mobile-first Tailwind CSS. Integrate i18n with family's preferred language. | Restrictions: Must be mobile-first with elderly-friendly design, use Tailwind CSS with theme CSS custom properties, implement clear loading states, show validation errors clearly, display read-only view after RSVP cutoff, ensure WhatsApp browser compatibility, integrate with i18n, follow accessibility guidelines (WCAG 2.1), minimum 16px font size, high contrast colors | Success: RSVP page displays personalized welcome, family members list correctly, attending selection shows/hides dietary fields, add member button shows conditionally, language selector works and persists, submission shows confirmation and payment info, theme applies correctly, page loads in <2s on 3G, elderly-friendly UI, accessible and mobile-optimized, works in WhatsApp browser | After implementation: Mark task as [-] in tasks.md before starting, log implementation with log-implementation tool documenting guest components with usability features and theme integration, then mark as [x] when complete_

## Phase 11: Tracking & Notifications System

- [ ] 11.1. Create tracking service
  - Files: src/lib/tracking/events.ts
  - Implement trackEvent(event) to create TrackingEvent records
  - Implement getEvents(filter) to query events with filters
  - Add event type enum and helper functions
  - Purpose: Provide centralized tracking for all guest and admin actions
  - _Leverage: Prisma client, type definitions_
  - _Requirements: Requirement 7 (Wedding Admin Activity Tracking), Tracking Service (Design doc)_
  - _Prompt: Implement the task for spec wedding-mvp, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Developer with expertise in event tracking and analytics | Task: Create tracking service with trackEvent function that creates TrackingEvent records with family_id, wedding_id, event_type, channel, metadata, admin_triggered, and timestamp. Implement getEvents function with EventFilter interface supporting wedding_id (required), family_id, event_type array, channel, date_from, date_to filters. Return events sorted by timestamp descending. Add helper functions for common tracking scenarios (trackLinkOpened, trackRSVPSubmitted, trackPaymentReceived, trackReminderSent). | Restrictions: Must require wedding_id in all queries, validate event_type enum, ensure channel attribution is preserved, store metadata as JSONB for flexible data, index timestamp and event_type for performance, handle tracking errors gracefully without breaking main flow | Success: trackEvent creates records correctly with all data, getEvents filters work accurately, helper functions simplify common tracking, channel attribution preserved, metadata stored correctly, queries are performant, tracking failures don't break user actions | After implementation: Mark task as [-] in tasks.md before starting, log implementation with log-implementation tool documenting tracking service functions with signatures and event types, then mark as [x] when complete_

## Phase 12: Email Service

- [ ] 12.1. Create Resend email service
  - Files: src/lib/email/resend.ts, src/lib/email/templates/planner-invitation.tsx, src/lib/email/templates/admin-invitation.tsx, src/lib/email/templates/rsvp-reminder.tsx, src/lib/email/templates/rsvp-confirmation.tsx, src/lib/email/templates/payment-confirmation.tsx
  - Set up Resend API client
  - Create sendEmail function with template support
  - Create sendBulkEmail for reminders
  - Create email templates for all scenarios in 5 languages
  - Purpose: Enable transactional emails in multiple languages
  - _Leverage: Resend API, React Email for templates, i18n utilities from task 4.1_
  - _Requirements: Requirement 2 (Planner invitation), Requirement 3 (Admin invitation), Requirement 8 (Reminders), Email Service (Design doc)_
  - _Prompt: Implement the task for spec wedding-mvp, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Developer with expertise in email services and templating | Task: Create Resend email service with sendEmail function accepting EmailOptions (to, template, language, variables). Create 5 email templates using React Email: planner-invitation with OAuth link, admin-invitation with OAuth link and wedding details, rsvp-reminder with magic link in recipient's language, rsvp-confirmation thanking for RSVP, payment-confirmation confirming payment received. Each template must support all 5 languages (es, en, fr, it, de) using i18n. Create sendBulkEmail for batch sending reminders. | Restrictions: Must use Resend API correctly, create responsive HTML emails, support all 5 languages with proper translations, include unsubscribe links where appropriate, handle email failures gracefully with retry logic, validate email addresses before sending, log email send status | Success: Resend client initializes correctly, sendEmail sends emails with correct templates, all 5 templates created with responsive HTML, multi-language support works correctly, sendBulkEmail handles batch sending efficiently, email failures logged and retried, templates look good in major email clients | After implementation: Mark task as [-] in tasks.md before starting, log implementation with log-implementation tool documenting email service functions and all template details, then mark as [x] when complete_

## Phase 13: Database Seeding & Initial Data

- [ ] 13.1. Create database seed script
  - Files: prisma/seed.ts
  - Create master admin user from config
  - Create 5 system themes
  - Create sample planner and wedding for development
  - Create sample translations in database
  - Purpose: Initialize database with required system data and development data
  - _Leverage: Prisma client, theme presets from task 6.1, config/master-admin.json_
  - _Requirements: Requirement 10 (Theme System with 5 pre-built themes), Database seeding_
  - _Prompt: Implement the task for spec wedding-mvp, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Backend Developer with expertise in database seeding and setup scripts | Task: Create Prisma seed script that creates master admin user from config/master-admin.json, creates 5 system themes (Classic Elegance, Garden Romance, Modern Minimal, Rustic Charm, Beach Breeze) with is_system_theme=true, creates sample planner account for development testing, creates sample wedding with theme, and creates sample translation records for common keys. Make script idempotent (check if data exists before creating). | Restrictions: Must be idempotent (safe to run multiple times), use upsert operations, read master admin from config file, create themes with complete ThemeConfig, use realistic sample data for development, check environment variable to determine if sample data should be created | Success: Seed script runs without errors, creates master admin correctly, all 5 system themes created with valid configs, sample planner and wedding created in development, translations seeded, script is idempotent and safe to re-run | After implementation: Mark task as [-] in tasks.md before starting, log implementation with log-implementation tool documenting seed script and data created, then mark as [x] when complete_

## Phase 14: Testing

- [ ] 14.1. Write unit tests for utilities and services
  - Files: tests/lib/auth/magic-link.test.ts, tests/lib/tracking/events.test.ts, tests/lib/theme/engine.test.ts, tests/lib/excel/import.test.ts, tests/lib/email/resend.test.ts
  - Create unit tests for magic link generation/validation
  - Create unit tests for tracking service
  - Create unit tests for theme engine
  - Create unit tests for Excel import/export
  - Create unit tests for email service
  - Purpose: Ensure core utilities and services work correctly
  - _Leverage: Jest, React Testing Library, Prisma test client_
  - _Requirements: Testing Strategy (Design doc), 80% coverage target_
  - _Prompt: Implement the task for spec wedding-mvp, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer with expertise in Jest and unit testing | Task: Create comprehensive unit tests for core services. Test magic link generation (UUID v4 format, uniqueness), validation (valid token returns family, invalid returns null). Test tracking service (event creation, filtering, channel attribution). Test theme engine (CSS generation from config, all theme properties). Test Excel import (validation, parsing, error handling), export (correct data format). Test email service (template selection, language handling, sending). Aim for 80% code coverage. Use mocking for external dependencies (Prisma, Resend). | Restrictions: Must mock external dependencies (database, APIs), test both success and failure scenarios, use descriptive test names, organize tests with describe/it blocks, aim for 80% coverage, ensure tests run fast (<5s), make tests isolated and repeatable | Success: All utility and service functions have unit tests, 80% code coverage achieved, tests cover success and failure scenarios, mocking used appropriately, tests run quickly and reliably, no test interdependencies | After implementation: Mark task as [-] in tasks.md before starting, log implementation with log-implementation tool documenting test coverage and key scenarios tested, then mark as [x] when complete_

- [ ] 14.2. Write integration tests for API routes
  - Files: tests/integration/api/master/*.test.ts, tests/integration/api/planner/*.test.ts, tests/integration/api/admin/*.test.ts, tests/integration/api/guest/*.test.ts
  - Create integration tests for master admin APIs
  - Create integration tests for planner APIs
  - Create integration tests for wedding admin APIs
  - Create integration tests for guest APIs
  - Purpose: Ensure APIs work correctly with database and authentication
  - _Leverage: Jest, Prisma test database, NextAuth test utilities_
  - _Requirements: Testing Strategy (Design doc), API Architecture_
  - _Prompt: Implement the task for spec wedding-mvp, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Engineer with expertise in API testing and integration testing | Task: Create integration tests for all API routes using separate test database. Test master admin APIs (create planner, enable/disable, list weddings). Test planner APIs (create wedding, invite admin, list weddings with proper filtering). Test wedding admin APIs (import guests, get notifications, send reminders, record payments with multi-tenancy isolation). Test guest APIs (magic link validation, RSVP submission, cutoff enforcement, channel tracking). Mock OAuth providers but use real database operations. Reset database between tests. | Restrictions: Must use separate test database, reset database between test suites, mock OAuth providers for authentication, test multi-tenancy isolation thoroughly, test authorization (users can't access other tenants' data), validate API response formats, test error scenarios | Success: All API routes have integration tests, multi-tenancy isolation verified, authentication and authorization tested, error scenarios covered, tests use real database operations, database resets correctly between tests, tests are reliable and repeatable | After implementation: Mark task as [-] in tasks.md before starting, log implementation with log-implementation tool documenting API test coverage and multi-tenancy validation, then mark as [x] when complete_

- [ ] 14.3. Write end-to-end tests for critical user journeys
  - Files: tests/e2e/master-admin.spec.ts, tests/e2e/planner.spec.ts, tests/e2e/wedding-admin.spec.ts, tests/e2e/guest-rsvp.spec.ts
  - Create E2E test for master admin adding and disabling planner
  - Create E2E test for planner creating wedding and inviting admin
  - Create E2E test for wedding admin importing guests and sending reminders
  - Create E2E test for guest RSVP flow from magic link to payment info
  - Purpose: Validate complete user workflows from end to end
  - _Leverage: Playwright, test database, email testing utilities_
  - _Requirements: Testing Strategy (Design doc), Critical User Journeys_
  - _Prompt: Implement the task for spec wedding-mvp, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QA Automation Engineer with expertise in Playwright and E2E testing | Task: Create end-to-end tests for 4 critical journeys using Playwright. (1) Master Admin: sign in, add planner, disable planner, verify access denied. (2) Planner: sign in, create wedding with theme, invite admin, verify admin receives email. (3) Wedding Admin: accept invitation, import Excel guest list, view dashboard, send reminders, record payment. (4) Guest: click magic link from WhatsApp, view RSVP in Spanish, select attending members, add dietary info, submit, view payment info, return and edit RSVP, verify cutoff enforcement. Test on mobile viewport. | Restrictions: Must test complete workflows end-to-end, use Playwright for browser automation, test on mobile viewport (390x844), mock email sending but verify email content, verify multi-tenancy isolation in E2E context, test with real database operations, verify UI feedback and error messages | Success: All 4 critical journeys have E2E tests, tests run in real browser environment, mobile viewport tested, workflows complete successfully, multi-tenancy verified, UI interactions validated, error scenarios tested, tests are reliable and can run in CI/CD | After implementation: Mark task as [-] in tasks.md before starting, log implementation with log-implementation tool documenting E2E test coverage and critical scenarios, then mark as [x] when complete_

## Phase 15: Deployment Setup

- [ ] 15.1. Create Docker configuration
  - Files: Dockerfile, docker-compose.yml, .dockerignore, nginx.conf
  - Create production Dockerfile with multi-stage build
  - Create docker-compose.yml with app, db, nginx services
  - Configure nginx reverse proxy with SSL termination
  - Purpose: Enable containerized deployment on Hetzner VPS
  - _Leverage: Docker documentation, Next.js deployment best practices_
  - _Requirements: Deployment Architecture (Design doc)_
  - _Prompt: Implement the task for spec wedding-mvp, first run spec-workflow-guide to get the workflow guide then implement the task: Role: DevOps Engineer with expertise in Docker and containerization | Task: Create production-ready Docker setup. Dockerfile uses multi-stage build (build stage with dependencies, production stage with only runtime), optimizes layer caching, runs as non-root user. docker-compose.yml defines app (Next.js), db (PostgreSQL 15), and nginx services with proper networking, volumes for persistence, health checks, restart policies. nginx.conf configures reverse proxy with SSL termination, proper headers, gzip compression. Include .dockerignore to exclude node_modules, .git, etc. | Restrictions: Must use multi-stage Docker build for smaller images, run containers as non-root users, use environment variables for configuration, persist data with volumes, configure proper health checks, optimize for production (no dev dependencies), enable gzip in nginx | Success: Docker builds successfully, docker-compose orchestrates all services, nginx proxies to app correctly, SSL termination configured, volumes persist data, health checks work, containers restart on failure, production-optimized with small image size | After implementation: Mark task as [-] in tasks.md before starting, log implementation with log-implementation tool documenting Docker setup and deployment configuration, then mark as [x] when complete_

- [ ] 15.2. Create CI/CD pipeline
  - Files: .github/workflows/ci.yml, .github/workflows/deploy.yml, scripts/deploy.sh
  - Create GitHub Actions workflow for CI (test, lint, type-check)
  - Create GitHub Actions workflow for deployment
  - Create deployment script with health checks and rollback
  - Purpose: Automate testing and deployment process
  - _Leverage: GitHub Actions documentation, deployment best practices_
  - _Requirements: CI/CD Pipeline (Design doc)_
  - _Prompt: Implement the task for spec wedding-mvp, first run spec-workflow-guide to get the workflow guide then implement the task: Role: DevOps Engineer with expertise in CI/CD and GitHub Actions | Task: Create CI/CD pipelines using GitHub Actions. ci.yml runs on pull requests: install dependencies, run TypeScript type check, run ESLint, run unit tests, run integration tests, report coverage. deploy.yml runs on push to main: run CI checks, build Docker image, push to registry, SSH to Hetzner VPS, pull new image, run deployment script. deploy.sh script pulls images, stops old containers, starts new containers, runs health check, rolls back if health check fails. Include environment variable management. | Restrictions: Must run all tests before deployment, fail fast on any error, implement proper health checks, automatic rollback on failure, use secrets for sensitive data (SSH keys, database passwords), run in parallel where possible, cache dependencies for speed | Success: CI pipeline runs on PRs and validates code quality, tests run automatically, deployment pipeline triggers on main branch, Docker images build and push correctly, VPS deployment works via SSH, health checks verify successful deployment, automatic rollback on failure, pipeline completes in reasonable time | After implementation: Mark task as [-] in tasks.md before starting, log implementation with log-implementation tool documenting CI/CD pipeline stages and deployment process, then mark as [x] when complete_

- [ ] 15.3. Create monitoring and backup scripts
  - Files: scripts/backup.sh, scripts/restore.sh, scripts/health-check.sh, config/logging.ts
  - Create database backup script with retention
  - Create restore script for recovery testing
  - Create health check script for uptime monitoring
  - Configure application logging with Winston
  - Purpose: Ensure system reliability and data safety
  - _Leverage: PostgreSQL backup tools, Winston logger, monitoring best practices_
  - _Requirements: Monitoring section, Backup Strategy (Design doc)_
  - _Prompt: Implement the task for spec wedding-mvp, first run spec-workflow-guide to get the workflow guide then implement the task: Role: DevOps Engineer with expertise in monitoring and backup strategies | Task: Create operational scripts for production. backup.sh performs PostgreSQL dump with timestamp, compresses with gzip, uploads to backup storage, deletes backups older than 30 days. restore.sh downloads backup, validates integrity, restores to database. health-check.sh checks app HTTP endpoint, database connectivity, disk space, reports to UptimeRobot webhook. Create logging.ts with Winston logger configured for daily file rotation, different log levels (error, warn, info, debug), structured JSON logs. Set up cron jobs for daily backups. | Restrictions: Must compress backups to save space, implement 30-day retention policy, validate backup integrity, test restore process monthly, include proper error handling in scripts, log all backup/restore operations, ensure health checks don't create load, configure log rotation to prevent disk fill | Success: Backup script creates valid database dumps, retention policy works correctly (30 days), restore script successfully recovers data, health checks monitor all critical components, Winston logging captures all application events with rotation, cron jobs run backups daily, monitoring alerts on failures | After implementation: Mark task as [-] in tasks.md before starting, log implementation with log-implementation tool documenting monitoring setup and backup strategy, then mark as [x] when complete_

## Phase 16: Documentation & Finalization

- [ ] 16.1. Create comprehensive README and documentation
  - Files: README.md, docs/SETUP.md, docs/API.md, docs/DEPLOYMENT.md, docs/DEVELOPMENT.md
  - Create project README with overview and quick start
  - Document local development setup
  - Document all API endpoints with examples
  - Document deployment process
  - Create developer onboarding guide
  - Purpose: Enable developers to understand and work with the codebase
  - _Leverage: All implemented features, API routes, architecture decisions_
  - _Requirements: All requirements (comprehensive documentation)_
  - _Prompt: Implement the task for spec wedding-mvp, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Technical Writer with expertise in developer documentation | Task: Create comprehensive documentation for the wedding management platform. README.md includes project overview, tech stack, features, quick start. SETUP.md covers local development setup (prerequisites, installation, database setup, environment variables, running locally). API.md documents all API endpoints with request/response examples, authentication, error codes. DEPLOYMENT.md covers Docker deployment, environment configuration, SSL setup, monitoring. DEVELOPMENT.md includes coding standards, testing guidelines, contribution workflow, architecture overview. | Restrictions: Must be clear and concise, include code examples, document all environment variables, explain multi-tenancy architecture, include troubleshooting section, keep documentation up-to-date with code, use proper markdown formatting | Success: README provides clear project overview and quick start, SETUP guide allows new developers to get running, API documentation is comprehensive with examples, DEPLOYMENT guide enables production setup, DEVELOPMENT guide helps contributors, documentation is well-organized and maintainable | After implementation: Mark task as [-] in tasks.md before starting, log implementation with log-implementation tool documenting documentation structure, then mark as [x] when complete_

- [ ] 16.2. Security audit and final review
  - Files: SECURITY.md, audit.log
  - Conduct security audit of authentication flows
  - Review multi-tenancy isolation
  - Verify input validation across all endpoints
  - Test magic link security
  - Review error handling and logging
  - Document security considerations
  - Purpose: Ensure platform security before production launch
  - _Leverage: All implemented features, security requirements from design doc_
  - _Requirements: Security Considerations (Design doc), all security-related requirements_
  - _Prompt: Implement the task for spec wedding-mvp, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Security Engineer with expertise in web application security | Task: Conduct comprehensive security audit. Review OAuth implementation (state parameter, provider verification, session security). Test multi-tenancy isolation (verify no cross-tenant data access). Verify input validation with Zod on all endpoints. Test magic link security (token randomness, validation, no prediction). Review SQL injection prevention (Prisma parameterized queries). Test XSS prevention (React escaping, input sanitization). Verify HTTPS enforcement. Review error handling (no sensitive data in errors). Test rate limiting. Document findings in audit.log and security best practices in SECURITY.md. | Restrictions: Must test all authentication flows, attempt to access other tenants' data, try SQL injection and XSS attacks, verify magic tokens are unpredictable, check error messages don't leak sensitive data, review all user input validation, verify HTTPS enforcement | Success: OAuth flows secure with CSRF protection, multi-tenancy isolation verified (no cross-tenant access possible), all inputs validated, magic tokens cryptographically secure, no SQL injection or XSS vulnerabilities, HTTPS enforced, errors don't leak sensitive data, security documentation complete, audit log documents all findings and remediations | After implementation: Mark task as [-] in tasks.md before starting, log implementation with log-implementation tool documenting security audit findings and remediations, then mark as [x] when complete_

- [ ] 16.3. Performance optimization and final testing
  - Files: performance-report.md
  - Run performance testing on key pages
  - Optimize database queries with indexes
  - Implement caching where appropriate
  - Test page load times on 3G
  - Verify Excel import performance (500 families)
  - Run final E2E test suite
  - Purpose: Ensure platform meets performance requirements before launch
  - _Leverage: Lighthouse, JMeter, database query analysis tools_
  - _Requirements: Performance section (Design doc), non-functional requirements_
  - _Prompt: Implement the task for spec wedding-mvp, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Performance Engineer with expertise in web performance and optimization | Task: Conduct performance testing and optimization. Run Lighthouse on guest RSVP pages, target <2s load on 3G. Analyze database queries with pg_stat_statements, add indexes where needed. Implement Redis caching for translations and themes (1 hour TTL). Test Excel import with 500 families, ensure <10 seconds. Run load testing with 100 concurrent RSVP submissions. Verify pagination works smoothly. Run final E2E test suite to ensure no regressions. Document findings and optimizations in performance-report.md. | Restrictions: Must test on throttled 3G network, measure real user metrics (LCP, FID, CLS), verify Excel performance with large files, test concurrent usage, ensure optimizations don't break functionality, add database indexes carefully, implement caching with appropriate TTLs | Success: Guest RSVP pages load <2s on 3G, database queries optimized with indexes, translations and themes cached effectively, Excel import handles 500 families <10s, site handles 100 concurrent users, pagination performs well, all E2E tests pass, performance report documents all optimizations and metrics | After implementation: Mark task as [-] in tasks.md before starting, log implementation with log-implementation tool documenting performance metrics and optimizations, then mark as [x] when complete_
