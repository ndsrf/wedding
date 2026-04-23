# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it by emailing the project maintainers. Do not create public GitHub issues for security vulnerabilities.

## Security Audit Status

Last updated: 2026-03-27

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

##### brace-expansion - Process Hang & Memory Exhaustion
- **Package**: brace-expansion 1.1.12 (needs ≥1.1.13) and 2.0.2 (needs ≥2.0.3)
- **CVE**: [GHSA-f886-m6hf-6m8v](https://github.com/advisories/GHSA-f886-m6hf-6m8v)
- **Status**: Fix exists (1.1.13 / 2.0.3) but npm overrides cannot apply both semver branches simultaneously without running `npm install` — 1.x and 2.x have incompatible APIs so a single override value would break one of the two consumers
- **Usage**: Dev toolchain only — transitive dependency of `jest` (reporters, config, runtime) and `readdir-glob`
- **Risk Assessment**:
  - DoS via zero-step sequence (`{0..0}`), causing an infinite loop in the parser
  - Only reachable if untrusted input is passed to a brace-expansion call in the build process
  - Jest and readdir-glob never receive untrusted input at runtime or in CI
  - No production bundles include brace-expansion
- **Mitigation**: Dev-only dependency, not present in any production build or server bundle
- **Future Plan**: Will be resolved automatically when jest or readdir-glob update their minimatch dependency

##### handlebars - Prototype Pollution via Partial Template Injection
- **Package**: handlebars 4.7.8 (last released 4.x version; no patched version available)
- **CVE**: [GHSA-2qvq-rjwj-gvw9](https://github.com/advisories/GHSA-2qvq-rjwj-gvw9)
- **Status**: No patched handlebars@4.x version released by the maintainer
- **Usage**: Dev toolchain only — transitive dependency of `conventional-changelog-cli` (changelog generation) via `conventional-changelog-writer`
- **Risk Assessment**:
  - Attack requires a malicious partial template to be injected during changelog rendering
  - `conventional-changelog-cli` is invoked only in controlled CI/CD pipelines with trusted commit messages and templates
  - handlebars is never loaded in the Next.js application or any production bundle
  - XSS impact would be limited to the CI log output, not the running application
- **Mitigation**: Dev-only dependency, not present in any production build or server bundle
- **Future Plan**: Will be resolved when conventional-changelog-writer migrates away from handlebars or a patched handlebars@4.x is released

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

##### next.js - Unbounded next/image Disk Cache Growth
- **Package**: next 10.0.0 - 16.1.6 (current: ^15.1.6)
- **CVE**: [GHSA-3x4c-7xq6-9pq8](https://github.com/advisories/GHSA-3x4c-7xq6-9pq8)
- **Status**: Fix requires major version upgrade to next@16.1.7+ (breaking change from 15.x)
- **Usage**: Core application framework
- **Risk Assessment**:
  - Moderate severity, CWE-400 (Uncontrolled Resource Consumption)
  - Affects `next/image` disk cache only — attacker must trigger many distinct image requests
  - Wedding app has limited, known image assets; not a high-volume image service
  - Disk exhaustion would cause service degradation, not data breach or code execution
  - Deployed on Vercel where ephemeral file system resets mitigate persistent cache growth
- **Mitigation**:
  - Hosted on Vercel (ephemeral filesystem limits persistent cache accumulation)
  - Limited image variants in use (fixed sizes, controlled sources)
  - Application is not a high-traffic public image service
- **Future Plan**: Upgrade to Next.js 16.x after evaluating breaking changes and compatibility with next-auth, next-intl, and other dependencies

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

##### uuid - Missing Buffer Bounds Check
- **Package**: uuid < 14.0.0 (via exceljs@4.4.0, svix@^1.6.0 via resend@6.0.0)
- **CVE**: [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq)
- **Status**: Fix requires upstream transitive dependencies to update to uuid@14.0.0+
- **Usage**: Guest list Excel import/export (exceljs), webhook signatures (svix/resend for email sending)
- **Risk Assessment**:
  - Buffer bounds check issue when custom buffer is provided
  - exceljs usage: Only triggered when parsing Excel files; wedding admins only upload trusted guest list files
  - svix/resend usage: Only triggered when processing webhook signatures; Resend is first-party infrastructure
  - Low risk: Both dependencies use uuid internally with controlled inputs, not accessible to end users
  - Severity: Moderate (CVSS 4.3)
- **Mitigation**:
  - File upload restrictions (size, type validation)
  - Only authenticated admins can upload Excel files
  - No custom buffer provided by untrusted user input
  - First-party webhook processing via Resend infrastructure
- **Future Plan**: Update when exceljs and resend release versions with uuid@14.0.0+

### Recently Fixed

#### 2026-03-13
- **flatted < 3.4.0** (HIGH): Unbounded recursion DoS in parse() revive phase
  - Fixed by `npm audit fix`: lock file updated from `flatted@3.3.4` → `3.4.1`
  - [GHSA-25h7-pfq9-p65f](https://github.com/advisories/GHSA-25h7-pfq9-p65f)

#### 2026-03-11
- **@babel/runtime < 7.26.10** (MODERATE): Inefficient RegExp complexity
  - Fixed by adding override to package.json: `"@babel/runtime": ">=7.26.10"`
  - [GHSA-968p-4wvh-cqc8](https://github.com/advisories/GHSA-968p-4wvh-cqc8)

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
