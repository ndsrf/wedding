# Technology Stack

## Project Type
Multi-tenant SaaS web application with mobile-first responsive design, optimized for WhatsApp in-app browsers. The platform serves wedding planners who manage multiple weddings for their clients, with distinct interfaces for platform administration, wedding planners, wedding admins (couples), and guest-facing RSVP pages.

## Core Technologies

### Primary Language(s)
- **Language**: TypeScript
- **Runtime/Compiler**: Node.js (LTS version)
- **Language-specific tools**: npm for package management, TypeScript compiler for type checking

### Key Dependencies/Libraries
- **Next.js 14+**: Full-stack React framework with App Router for API routes and server-side rendering
- **React 18+**: Frontend UI library with hooks and server components
- **Prisma ORM**: Type-safe database access with automatic TypeScript type generation
- **NextAuth.js**: OAuth authentication for Google, Facebook/Instagram, Apple providers
- **next-intl**: Internationalization library for 5 languages (Spanish, English, French, Italian, German)
- **Tailwind CSS**: Utility-first CSS framework for mobile-first responsive design
- **Zod**: TypeScript-first schema validation for API inputs
- **xlsx**: Excel file parsing and generation for guest list import/export
- **Resend**: Transactional email service for invitations and reminders
- **GoCardless SDK**: Bank Account Data API integration for automated payment matching
- **standard-version**: Automated versioning and changelog generation following semantic versioning

### Application Architecture
**Multi-tenant SaaS with data isolation**: The architecture follows a monolithic Next.js application with clear separation between:
- **Client Layer**: Four distinct UIs (Master Admin, Planner Dashboard, Wedding Admin Panel, Guest RSVP Pages)
- **API Layer**: RESTful API routes organized by user role (`/api/master/`, `/api/planner/`, `/api/admin/`, `/api/guest/`)
- **Service Layer**: Modular services for authentication, tracking, email, Excel processing, payment matching, and theme rendering
- **Data Layer**: PostgreSQL with Prisma middleware enforcing `wedding_id` filtering for complete data isolation

The system emphasizes **modular design** with single-responsibility services, **mobile-first responsive interfaces**, and **progressive disclosure** to avoid overwhelming users.

### Data Storage
- **Primary storage**: PostgreSQL 15+ for all structured data (users, weddings, families, RSVPs, tracking events, payments)
- **Caching**: Redis for theme configurations and static translations (optional for MVP, planned for future optimization)
- **Data formats**: JSON for theme configurations (stored in JSONB columns), translation files in JSON format

### External Integrations
- **APIs**:
  - OAuth Providers: Google, Facebook/Instagram, Apple (NextAuth.js integration)
  - Resend API: Transactional emails (invitations, reminders, confirmations)
  - GoCardless Bank Account Data API: Automated bank transaction polling for gift matching (optional automated mode)
- **Protocols**: HTTP/REST for all API communications, HTTPS enforced in production
- **Authentication**:
  - OAuth 2.0 for admin authentication (master admin, planners, wedding admins)
  - Magic links with persistent UUID tokens for guest authentication (no passwords)

### Monitoring & Dashboard Technologies
- **Dashboard Framework**: React 18+ with Next.js App Router for all four user-facing dashboards
- **Real-time Communication**: WebSocket for live notification updates (future enhancement), polling fallback every 30 seconds
- **Visualization Libraries**: Tailwind CSS for responsive layouts, custom charts for analytics dashboards
- **State Management**: React hooks (useState, useContext) with Next.js server state, no global state management library for MVP

## Development Environment

### Build & Development Tools
- **Build System**: Next.js built-in build system (Turbopack for development, Webpack for production)
- **Package Management**: npm with package-lock.json for dependency locking
- **Development workflow**: Hot module replacement via Next.js dev server, TypeScript watch mode

### Code Quality Tools
- **Static Analysis**: TypeScript compiler with strict mode enabled for type safety
- **Formatting**: Prettier for consistent code style enforcement
- **Linting**: ESLint with TypeScript and React rules
- **Testing Framework**:
  - Jest for unit and integration tests (80% minimum coverage target)
  - React Testing Library for component testing
  - Playwright for end-to-end tests across browsers (Chrome, Firefox, Safari, WhatsApp in-app browser)
- **Documentation**: JSDoc comments for complex functions, inline code comments for clarity

### Version Control & Collaboration
- **VCS**: Git with GitHub for repository hosting
- **Commit Convention**: Conventional Commits specification for structured commit messages (feat:, fix:, docs:, chore:, etc.)
- **Versioning**: Semantic Versioning (SemVer) with automated version bumping based on commit types
- **Branching Strategy**: Feature branches merged to `main` via pull requests
- **Code Review Process**: All changes require peer review before merging
- **Release Management**: GitHub Releases with automated changelog generation from conventional commits

### Dashboard Development
- **Live Reload**: Next.js hot module replacement for instant feedback during development
- **Port Management**: Development server runs on port 3000 (configurable)
- **Multi-Instance Support**: Each developer runs local instance with separate database

## Deployment & Distribution

- **Target Platform(s)**: Any VM or server supporting Docker and docker-compose (cloud-agnostic approach)
  - Primary target: Hetzner VPS (CPX41: 8 vCPUs, 16GB RAM, 240GB SSD)
  - Also compatible with: AWS EC2, Google Cloud Compute, DigitalOcean Droplets, Azure VMs
- **Distribution Method**:
  - Docker containers built via GitHub Actions and published to GitHub Container Registry (ghcr.io)
  - Generated docker-compose.yml files included in GitHub Releases for easy deployment
  - Semantic versioning tags on all releases (e.g., v1.2.3)
- **Container Strategy**:
  - Multi-stage Docker builds for optimized image size
  - Separate containers: application (Next.js), database (PostgreSQL), reverse proxy (Nginx)
  - Version-tagged images enable rollback to any previous release
- **Installation Requirements**:
  - Docker 20+ and docker-compose 2+ installed on target server
  - Any Linux distribution with container support (Ubuntu 22.04 LTS recommended)
  - Custom domain with DNS configured (optional for development)
- **Update Mechanism**:
  - **CI/CD Pipeline via GitHub Actions**:
    1. Developer commits with conventional commit messages (feat:, fix:, etc.)
    2. Push to `main` branch triggers GitHub Actions workflow
    3. Automated tests run (unit, integration, E2E)
    4. On success: `standard-version` bumps version based on commit types
    5. Docker images built with version tags (e.g., `v1.2.3`, `latest`)
    6. Images pushed to GitHub Container Registry
    7. GitHub Release created with:
       - Auto-generated changelog from conventional commits
       - Docker images attached
       - Generated docker-compose.yml for deployment
    8. Deployment notification sent
  - **Production Deployment**:
    1. Pull versioned docker-compose.yml from GitHub Release
    2. Pull versioned Docker images from GitHub Container Registry
    3. Run `docker-compose up -d` to deploy new version
    4. Health check verifies application is running
    5. Automatic rollback to previous version on health check failure
  - **Zero-Downtime Strategy**: Blue-green deployment with container orchestration

## Technical Requirements & Constraints

### Performance Requirements
- **Page Load Time**: Guest RSVP pages must load within 2 seconds on 3G mobile connections
- **API Response Time**: < 500ms for 95th percentile of all API requests
- **Database Queries**: < 100ms for typical queries, pagination required (50 items per page)
- **Excel Import Speed**: Must handle up to 500 families in under 10 seconds
- **Theme Rendering**: No visual jank, smooth transitions between theme changes

### Compatibility Requirements
- **Platform Support**:
  - Browsers: Chrome, Firefox, Safari, WhatsApp in-app browser (primary)
  - Devices: Mobile-first (iOS 12+, Android 8+), tablet, desktop
  - Node.js: LTS version (v18+ recommended)
- **Dependency Versions**:
  - Next.js: 14+
  - React: 18+
  - PostgreSQL: 15+
  - TypeScript: 5+
- **Standards Compliance**: WCAG 2.1 AA for accessibility (elderly-friendly interfaces)

### Security & Compliance
- **Security Requirements**:
  - HTTPS enforced in production via Let's Encrypt SSL certificates
  - OAuth 2.0 with state parameters to prevent CSRF attacks
  - Magic tokens use cryptographically secure UUIDs (crypto.randomUUID())
  - HTTP-only, secure session cookies with 7-day expiration
  - Zod schema validation on all API inputs
  - Prisma parameterized queries to prevent SQL injection
  - React's built-in XSS escaping for user input
- **Compliance Standards**:
  - GDPR compliance: data export and deletion capabilities for guests
  - PII minimization: only collect necessary guest information
  - Email verification for master admin access on every login
- **Threat Model**:
  - Multi-tenancy security: Prisma middleware automatically enforces `wedding_id` filtering on all queries
  - Access control: verify user has access to requested wedding before any operation
  - Rate limiting: prevent abuse of magic link generation and API endpoints
  - Audit logging: log all cross-tenant access attempts

### Scalability & Reliability
- **Expected Load**:
  - 50 wedding planners managing 8 weddings each (400 weddings)
  - 100-150 guest families per wedding (40,000-60,000 families)
  - 100 concurrent guests accessing RSVP pages simultaneously
  - 1000 tracking events per minute during peak times
- **Availability Requirements**: 99.5% uptime target with daily database backups
- **Growth Projections**: Designed to scale to 200 planners in Year 2 (1,600 weddings, 160,000 families)

## Technical Decisions & Rationale

### Decision Log

1. **Next.js 14+ with App Router**:
   - **Why**: Unified full-stack framework eliminates need for separate frontend/backend. App Router provides excellent server-side rendering for SEO and mobile performance, with API routes co-located with pages for faster development.
   - **Alternatives considered**: Separate React + Express stack (rejected due to increased complexity), Remix (rejected due to smaller ecosystem)
   - **Trade-offs**: Vendor lock-in to Vercel ecosystem, but benefits outweigh risks for our use case

2. **PostgreSQL + Prisma ORM**:
   - **Why**: PostgreSQL provides JSONB support for theme configurations, excellent performance for relational data, and robust multi-tenancy support via row-level security. Prisma generates type-safe database access with automatic TypeScript types, reducing runtime errors.
   - **Alternatives considered**: MongoDB (rejected due to lack of strong relational constraints), MySQL (rejected due to inferior JSON support)
   - **Trade-offs**: Prisma adds abstraction layer but dramatically improves developer experience and type safety

3. **Magic Links for Guest Authentication**:
   - **Why**: Spanish families include elderly relatives uncomfortable with passwords. Magic links eliminate authentication friction, increasing RSVP completion rates. Persistent UUID tokens valid until wedding date ensure links never expire unexpectedly.
   - **Alternatives considered**: Email/password authentication (rejected due to password fatigue), SMS OTP (rejected due to international SMS costs)
   - **Trade-offs**: Less secure than password authentication, but mitigated by cryptographically secure UUIDs and wedding-scoped access

4. **Multi-Tenancy via Prisma Middleware**:
   - **Why**: Automatic `wedding_id` filtering on all queries prevents data leakage between weddings. Middleware approach is less error-prone than manual filtering in every query.
   - **Alternatives considered**: Separate databases per wedding (rejected due to complexity), row-level security only (rejected as not sufficient alone)
   - **Trade-offs**: Middleware adds minimal overhead but dramatically improves security posture

5. **Mobile-First Design with Tailwind CSS**:
   - **Why**: 95%+ of guest interactions happen on mobile devices, primarily via WhatsApp in-app browser. Tailwind's utility-first approach enables rapid mobile-first development with consistent spacing and touch targets ≥44px.
   - **Alternatives considered**: Styled Components (rejected due to runtime overhead), Bootstrap (rejected as not mobile-first)
   - **Trade-offs**: Tailwind classes can clutter JSX, but benefits to development speed and mobile optimization are critical

6. **Docker Deployment on Self-Hosted VPS**:
   - **Why**: Cost efficiency for early-stage startup, full control over infrastructure, predictable monthly costs. Hetzner provides excellent performance at low cost compared to AWS/GCP.
   - **Alternatives considered**: Vercel hosting (rejected due to unpredictable costs at scale), AWS ECS (rejected due to complexity for small team)
   - **Trade-offs**: Manual infrastructure management vs. managed services, but acceptable for MVP with proper automation

7. **Resend for Transactional Emails**:
   - **Why**: Modern API with excellent developer experience, reliable delivery rates, competitive pricing. Better deliverability than SendGrid/Mailgun for European recipients.
   - **Alternatives considered**: SendGrid (rejected due to complex API), AWS SES (rejected due to setup complexity)
   - **Trade-offs**: Smaller provider with less track record, but API simplicity and deliverability justify choice

8. **next-intl for Internationalization**:
   - **Why**: Native integration with Next.js App Router, supports 5 languages (Spanish, English, French, Italian, German), server and client-side rendering, excellent type safety.
   - **Alternatives considered**: react-i18next (rejected due to less Next.js integration), custom solution (rejected due to time constraints)
   - **Trade-offs**: Adds bundle size but multi-language support is non-negotiable for Spanish market with international guests

9. **GitHub Actions + GitHub Releases for CI/CD**:
   - **Why**: Native integration with GitHub repository, free for public repos and generous limits for private repos. Enables automated Docker image building, versioning, and release management. GitHub Container Registry provides reliable image hosting with direct integration.
   - **Alternatives considered**: Jenkins (rejected due to infrastructure overhead), GitLab CI (rejected due to team familiarity with GitHub), CircleCI (rejected due to additional costs)
   - **Trade-offs**: Vendor lock-in to GitHub, but team already uses GitHub for VCS and benefits outweigh migration risks

10. **Conventional Commits + Semantic Versioning**:
    - **Why**: Structured commit messages enable automated changelog generation and semantic version bumping. Makes release history human-readable and enables automated tooling. Helps team understand impact of changes (breaking vs. feature vs. fix).
    - **Alternatives considered**: Manual versioning (rejected due to human error), Git tags only (rejected due to lack of changelog automation), Keep a Changelog manual process (rejected due to maintenance burden)
    - **Trade-offs**: Requires team discipline to follow commit convention, but commitlint enforcement and clear guidelines mitigate this

11. **Cloud-Agnostic Container Deployment**:
    - **Why**: Docker + docker-compose provides portability across any infrastructure supporting containers. Enables easy migration between cloud providers, prevents vendor lock-in, and allows cost optimization by switching providers. Development and production environments are identical.
    - **Alternatives considered**: Kubernetes (rejected due to complexity for MVP scale), Platform-specific deployments (AWS ECS, Google Cloud Run) rejected due to vendor lock-in, Vercel (rejected due to unpredictable scaling costs)
    - **Trade-offs**: Manual orchestration vs. managed Kubernetes, but acceptable for MVP scale with proper automation scripts

## Known Limitations

- **Redis Caching Not Implemented in MVP**: Theme configurations and translations are fetched from database on each request, adding latency. **Impact**: Slower page loads for guest RSVP pages. **Future solution**: Add Redis caching layer in Phase 2 for 10x performance improvement.

- **WebSocket Real-Time Updates Deferred**: Wedding admin notification updates use 30-second polling instead of real-time WebSocket connections. **Impact**: Admins see delayed notifications. **Future solution**: Implement WebSocket server in Phase 3 for instant updates.

- **GoCardless Integration Optional**: Automated payment matching requires GoCardless API setup, which may not be available for all wedding planners. **Impact**: Manual payment recording required for planners without GoCardless. **Future solution**: Add Plaid or Tink integrations for broader bank coverage.

- **No Offline Support**: Guest RSVP pages require active internet connection. **Impact**: Guests in areas with poor connectivity cannot submit RSVPs. **Future solution**: Implement service workers for offline form caching in Phase 5.

- **Single Database Instance**: PostgreSQL runs on single VPS instance without replication. **Impact**: Database downtime affects entire platform. **Future solution**: Add read replicas and automated failover when revenue justifies cost (Year 2).

- **Excel Import Memory Constraints**: Large Excel files (>1000 families) may cause memory issues during import. **Impact**: Wedding admins with very large guest lists cannot import all at once. **Workaround**: Split large imports into batches. **Future solution**: Implement streaming Excel parser in Phase 4.

- **No Audit Trail for Data Changes**: System tracks events but not historical data changes (e.g., who edited which family's RSVP). **Impact**: Cannot trace data modification history for disputes. **Future solution**: Add comprehensive audit logging in Phase 6 for enterprise tier.

- **Limited Theme Customization**: Theme editor supports colors, fonts, and spacing but not layout changes. **Impact**: Planners cannot create highly custom layouts for weddings with unique branding needs. **Future solution**: Add visual theme builder with drag-and-drop in Phase 7.
