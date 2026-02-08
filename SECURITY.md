# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it by emailing the project maintainers. Do not create public GitHub issues for security vulnerabilities.

## Security Audit Status

Last updated: 2026-02-06

### Current Vulnerabilities

This document tracks known security vulnerabilities that have been assessed and accepted with mitigation strategies.

#### HIGH Severity - Accepted Risks

##### xlsx (SheetJS) - Prototype Pollution & ReDoS
- **Package**: xlsx@0.18.5
- **CVEs**:
  - [GHSA-4r6h-8v6p-xvw6](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6) - Prototype Pollution
  - [GHSA-5pgg-2g8v-p4x9](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9) - Regular Expression Denial of Service
- **Status**: No patched version available
- **Usage**: Excel import/export for guest list management
- **Risk Assessment**:
  - Only accessible to authenticated wedding administrators
  - Used in controlled admin environment, not exposed to untrusted user input
  - Excel files are uploaded by trusted administrators only
- **Mitigation**:
  - Access restricted to authenticated admins via NextAuth
  - Input validation on uploaded files
  - File size limits enforced
- **Future Plan**: Consider migrating to `exceljs` or similar maintained alternative in a future release

#### MODERATE Severity - Accepted Risks

##### prismjs - DOM Clobbering
- **Package**: prismjs < 1.30.0 (via @react-email/components@0.0.29)
- **CVE**: [GHSA-x7hr-w5r2-h6wg](https://github.com/advisories/GHSA-x7hr-w5r2-h6wg)
- **Status**: Fix requires breaking change to @react-email/components@1.0.7
- **Usage**: Code syntax highlighting in email templates
- **Risk Assessment**:
  - Limited to email template generation (server-side only)
  - No user-controlled code rendering
  - Low attack surface
- **Mitigation**:
  - Server-side rendering only
  - No user-generated content in code blocks
- **Future Plan**: Update @react-email/components during next major version bump

##### hono - Multiple Vulnerabilities
- **Package**: hono <=4.11.6 (via @prisma/dev → prisma@7.3.0)
- **CVEs**:
  - [GHSA-9r54-q6cx-xmh5](https://github.com/advisories/GHSA-9r54-q6cx-xmh5) - XSS through ErrorBoundary
  - [GHSA-6wqw-2p9w-4vw4](https://github.com/advisories/GHSA-6wqw-2p9w-4vw4) - Cache middleware issues
  - [GHSA-r354-f388-2fhh](https://github.com/advisories/GHSA-r354-f388-2fhh) - IPv4 validation bypass
  - [GHSA-w332-q679-j88p](https://github.com/advisories/GHSA-w332-q679-j88p) - Arbitrary key read
- **Status**: Fix requires downgrading Prisma to 6.x (breaking change)
- **Usage**: Development dependency only (Prisma Studio)
- **Risk Assessment**:
  - Not used in production builds
  - Only affects local development environment
  - Low risk as it's not exposed in the running application
- **Mitigation**: Development-only dependency, not included in production bundles

##### lodash - Prototype Pollution
- **Package**: lodash 4.0.0 - 4.17.21 (via @prisma/dev)
- **CVE**: [GHSA-xxjr-mmjv-4gpg](https://github.com/advisories/GHSA-xxjr-mmjv-4gpg)
- **Status**: Fix requires downgrading Prisma to 6.x (breaking change)
- **Usage**: Development dependency (Prisma tooling)
- **Risk Assessment**:
  - Development-only dependency
  - Not included in production builds
  - Low risk
- **Mitigation**: Development-only dependency, not included in production bundles

### Recently Fixed

#### 2026-02-06
- **next.js 10.0.0 - 15.5.9** (HIGH): DoS vulnerabilities
  - Fixed by updating to next@15.5.12
  - [GHSA-9g9p-9gw9-jx7f](https://github.com/advisories/GHSA-9g9p-9gw9-jx7f) - Image Optimizer DoS
  - [GHSA-h25m-26qc-wcjf](https://github.com/advisories/GHSA-h25m-26qc-wcjf) - HTTP request deserialization DoS

## Security Best Practices

### Dependency Updates
- Run `npm audit` regularly to check for new vulnerabilities
- Update dependencies monthly or when critical vulnerabilities are discovered
- Review breaking changes before major version upgrades

### Authentication & Authorization
- All admin functions protected by NextAuth v5
- OAuth providers: Google, Facebook, Instagram, Microsoft
- Role-based access control (Master Admin, Planner, Wedding Admin)

### Data Protection
- Database credentials stored in environment variables
- Sensitive data (tokens, API keys) never committed to repository
- HTTPS enforced in production

### Input Validation
- Server-side validation using Zod schemas
- DOMPurify for HTML sanitization
- File upload restrictions (size, type)

## Updating This Document

This document should be updated:
- After each security audit
- When vulnerabilities are discovered or fixed
- When security-related dependencies are updated
- At least quarterly during active development
