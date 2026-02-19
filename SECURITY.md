# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it by emailing the project maintainers. Do not create public GitHub issues for security vulnerabilities.

## Security Audit Status

Last updated: 2026-02-19
Last updated: 2026-02-18

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

##### minimatch - ReDoS via Repeated Wildcards
- **Package**: minimatch < 10.2.1 (via eslint, jest, and related dev dependencies)
- **CVE**: [GHSA-3ppc-4f35-3m26](https://github.com/advisories/GHSA-3ppc-4f35-3m26)
- **Status**: Fix requires breaking changes to eslint ecosystem
- **Usage**: Development dependencies only (linting, testing)
- **Risk Assessment**:
  - Development-only dependency, not included in production builds
  - ReDoS vulnerability only affects pattern matching in dev tools
  - Cannot be exploited in production environment
  - Attack would only affect local development linting/testing
- **Mitigation**:
  - Development-only dependency, not in production bundles
  - No untrusted input to glob patterns in development workflow
  - Developers use trusted source code only
- **Future Plan**: Will be resolved when eslint ecosystem updates to minimatch@10.2.1+

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

##### ajv - ReDoS via $data Option
- **Package**: ajv < 8.18.0 (via eslint@9.x → @eslint/eslintrc)
- **CVE**: [GHSA-2g4f-4pwh-qvx6](https://github.com/advisories/GHSA-2g4f-4pwh-qvx6)
- **Status**: Fix requires downgrading eslint from v9 to v4.1.1 (breaking change)
- **Usage**: Development dependency only (ESLint validation tooling)
- **Risk Assessment**:
  - ReDoS only triggered by ajv's `$data` option, which eslint does not expose to user input
  - Dev-only dependency, not included in production bundles
  - Worst case impact: slow linting in CI, not a production security issue
- **Mitigation**: Development-only dependency, not included in production bundles

##### undici - Unbounded Decompression Chain
- **Package**: undici < 6.23.0 (via @vercel/blob@0.27.3)
- **CVE**: [GHSA-g9mf-h72j-4rw9](https://github.com/advisories/GHSA-g9mf-h72j-4rw9)
- **Status**: Fix requires major version update to @vercel/blob@2.x (breaking changes)
- **Usage**: HTTP client for Vercel Blob Storage (optional file upload feature)
- **Risk Assessment**:
  - Attack requires high complexity (CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:N/I:N/A:H)
  - Only affects applications that process untrusted HTTP responses with Content-Encoding
  - Vercel Blob Storage API is trusted first-party service
  - Limited exposure: only used for file uploads by authenticated admins
  - Severity: Moderate (CVSS 5.9)
- **Mitigation**:
  - Blob storage is optional (can be disabled via BLOB_READ_WRITE_TOKEN)
  - Only used by authenticated admins for trusted file uploads
  - Vercel Blob API is a trusted first-party service
  - Rate limiting and file size restrictions in place
- **Future Plan**: Upgrade to @vercel/blob@2.x when stable and breaking changes are assessed

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
