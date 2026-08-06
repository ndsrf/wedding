# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it by emailing the project maintainers. Do not create public GitHub issues for security vulnerabilities.

## Security Audit Status

Last updated: 2026-08-06

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

##### PostCSS - XSS via Unescaped </style>
- **Package**: postcss < 8.5.10 (via next@15.1.6)
- **CVE**: [GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93)
- **Status**: Fix available but requires breaking change (downgrading to next@9.3.3 is not viable)
- **Usage**: CSS processing in Next.js build step
- **Risk Assessment**:
  - Moderate severity, affects CSS stringify output
  - Vulnerability requires malicious CSS content with unescaped `</style>` tags
  - CSS in this application is generated from trusted sources only:
    - Tailwind CSS configuration (not user-controlled)
    - Next.js internal CSS generation
    - No dynamic CSS generation from user input
  - Impact is limited to build-time CSS processing, not runtime application code
- **Mitigation**:
  - All CSS sources are trusted and non-user-controlled
  - Next.js 15.x has many security improvements over older versions
  - Fixing this would require downgrading to Next.js 9.x (introduces many older, more severe vulnerabilities)
- **Future Plan**: Will be resolved when Next.js 16+ provides a fix without breaking changes

##### uuid - Missing Buffer Bounds Check
- **Package**: uuid < 11.1.1 (via exceljs@4.4.0)
- **CVE**: [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq)
- **Status**: Fix available but requires breaking change (downgrading exceljs to 3.4.0)
- **Usage**: Excel import/export for authenticated admins
- **Risk Assessment**:
  - Moderate severity, affects uuid v3/v5/v6 hash functions when `buf` parameter is provided
  - Vulnerability only triggered in specific edge cases (custom buffer usage)
  - Used by exceljs for Excel file generation/parsing:
    - Only accessible to authenticated wedding admins
    - Requires explicit user action (file upload/download)
    - No untrusted input in the Excel processing pipeline
  - Risk of exploitation is very low due to specific conditions and limited exposure
- **Mitigation**:
  - Excel functionality restricted to authenticated administrators
  - File uploads have size restrictions
  - Downgrading exceljs would introduce other compatibility issues
- **Future Plan**: Update to uuid@11.1.1+ when it's stable and all dependents support it

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

#### 2026-05-31
- Ran `npm audit fix` to resolve multiple vulnerabilities across the dependency tree:
  - **@protobufjs/utf8** ≤1.1.0 (MODERATE): Overlong UTF-8 decoding - Fixed
  - **@xmldom/xmldom** ≤0.8.12 (HIGH): Multiple XML injection vulnerabilities - Fixed
  - **axios** 1.0.0-1.15.2 (HIGH): Multiple prototype pollution and SSRF vulnerabilities - Fixed
  - **brace-expansion** 5.0.2-5.0.5 (MODERATE): DoS via numeric range - Fixed
  - **fast-uri** ≤3.1.1 (HIGH): Path traversal and host confusion - Fixed
  - **hono** ≤4.12.17 (MODERATE): Multiple vulnerabilities - Fixed
  - **icu-minify** ≤4.9.1 (MODERATE): DoS via unsanitized select key - Fixed
  - **next** 9.3.4-16.3.0 (HIGH): Multiple vulnerabilities - Fixed
  - **next-intl** ≤4.9.1 (MODERATE): Prototype pollution with precompile - Fixed
  - Two remaining moderate vulnerabilities accepted with documented risk (postcss, uuid)

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

##### brace-expansion - Process Hang & Memory Exhaustion (Additional variants)
- **Package**: brace-expansion 1.1.12 (needs ≥1.1.13) and 2.0.2 (needs ≥2.0.3), and 5.0.x branch
- **CVEs**:
  - [GHSA-3jxr-9vmj-r5cp](https://github.com/advisories/GHSA-3jxr-9vmj-r5cp) - DoS via exponential-time expansion
  - [GHSA-mh99-v99m-4gvg](https://github.com/advisories/GHSA-mh99-v99m-4gvg) - DoS via unbounded expansion length
- **Status**: No fix available for 5.0.x branch; would require breaking change to eslint-config-next
- **Usage**: Dev toolchain only — transitive dependency of jest/glob/readdir-glob
- **Risk Assessment**:
  - Multiple DoS vectors causing process hang and memory exhaustion
  - Only reachable if untrusted input is passed to brace-expansion in build process
  - Jest and related tools never receive untrusted input at runtime or in CI
  - No production bundles include brace-expansion
- **Mitigation**: Dev-only dependency, not present in any production build or server bundle
- **Future Plan**: Will be resolved when eslint ecosystem updates or dependencies upgrade brace-expansion branches

##### PostCSS - XSS & Path Traversal (Additional vulnerabilities)
- **Package**: postcss < 8.5.10 (via next@15.1.6)
- **CVEs**:
  - [GHSA-6g55-p6wh-862q](https://github.com/advisories/GHSA-6g55-p6wh-862q) - Arbitrary file read via sourceMappingURL
  - [GHSA-r28c-9q8g-f849](https://github.com/advisories/GHSA-r28c-9q8g-f849) - Path traversal in source map auto-loading
- **Status**: Fix available but requires breaking change (downgrading to next@9.3.3 is not viable)
- **Usage**: CSS processing in Next.js build step
- **Risk Assessment**:
  - High severity, affects CSS processing with source map handling
  - Vulnerabilities require malicious CSS content with crafted sourceMappingURL
  - CSS in this application is generated from trusted sources only:
    - Tailwind CSS configuration (not user-controlled)
    - Next.js internal CSS generation
    - No dynamic CSS generation from user input
  - Impact is limited to build-time CSS processing, not runtime application code
- **Mitigation**:
  - All CSS sources are trusted and non-user-controlled
  - Next.js 15.x has many security improvements over older versions
  - Fixing these would require downgrading to Next.js 9.x (introduces many older, more severe vulnerabilities)
- **Future Plan**: Will be resolved when Next.js 16+ provides fixes without breaking changes

##### valibot - record() Issue Path Handling
- **Package**: valibot <= 1.4.1 (via @prisma/dev)
- **CVE**: [GHSA-5qjj-4xww-7phc](https://github.com/advisories/GHSA-5qjj-4xww-7phc)
- **Status**: Fix available in valibot >= 1.5.0, but requires @prisma/dev update
- **Usage**: Development dependency only (Prisma Studio in local dev environment)
- **Risk Assessment**:
  - Moderate severity, affects record() validation with inherited Object property names
  - Requires specific conditions in form validation path to trigger
  - Prisma Studio is used only in local development, never exposed to production
  - Impact would be limited to development environment
- **Mitigation**: Development-only dependency, not included in production bundles
- **Future Plan**: Will be resolved when Prisma updates @prisma/dev with valibot >= 1.5.0

##### find-my-way - HTTP/2 DDoS
- **Package**: find-my-way <= 9.6.0 (via @prisma/dev)
- **CVE**: [GHSA-c96f-x56v-gq3h](https://github.com/advisories/GHSA-c96f-x56v-gq3h)
- **Status**: Fix available in find-my-way >= 9.6.1, but requires @prisma/dev version bump
- **Usage**: Development dependency only (Prisma Studio HTTP routing)
- **Risk Assessment**:
  - High severity, DDoS via HTTP/2 stream manipulation
  - Prisma Studio is accessed only locally by developers
  - Not exposed to internet or production traffic
  - Attack requires attacker access to local development server
- **Mitigation**: Development-only dependency, not included in production bundles or exposed to internet
- **Future Plan**: Will be resolved when Prisma updates @prisma/dev with find-my-way >= 9.6.1

##### sharp - libvips Inherited Vulnerabilities
- **Package**: sharp < 0.35.0 (via next@15.1.6)
- **CVE**: [GHSA-f88m-g3jw-g9cj](https://github.com/advisories/GHSA-f88m-g3jw-g9cj)
- **Status**: Fix available (sharp >= 0.35.0 with updated libvips), but requires downgrading Next.js to 9.3.3
- **Usage**: Image optimization in production builds
- **Risk Assessment**:
  - High severity, multiple CVEs in underlying libvips library (CVE-2026-33327/33328/35590/35591)
  - Requires processing of specially crafted image files to trigger
  - Wedding app has limited, known image assets (not a high-volume image service)
  - Image sources are mostly controlled by admins or CDN providers
  - Disk exhaustion or memory issues from malicious images would cause service degradation, not data breach
- **Mitigation**:
  - Limited image variants in use (fixed sizes, controlled sources)
  - Application is not a high-traffic public image service
  - Hosted on Vercel where resources are managed
- **Future Plan**: Upgrade to Next.js 16.x (when available) to get updated sharp with patched libvips

##### brace-expansion - DoS via Unbounded Intermediate Arrays (Additional variant)
- **Package**: brace-expansion (various branches)
- **CVE**: [GHSA-rgw5-rvv9-x895](https://github.com/advisories/GHSA-rgw5-rvv9-x895)
- **Status**: DoS via unbounded intermediate arrays, bypassing the CVE-2026-14257 mitigation; fix not yet available in affected branches
- **Usage**: Dev toolchain only — transitive dependency of jest/glob/readdir-glob
- **Risk Assessment**:
  - High severity DoS vector
  - Attack requires untrusted input to brace-expansion call in build process
  - Jest and readdir-glob never receive untrusted input at runtime or in CI
  - No production bundles include brace-expansion
- **Mitigation**: Dev-only dependency, not present in any production build or server bundle
- **Future Plan**: Will be resolved when brace-expansion releases a patched version

##### fast-uri - Host Confusion via Backslash Authority Introducer
- **Package**: fast-uri 3.0.0 - 3.1.4
- **CVE**: [GHSA-7p8r-x3mc-p8w7](https://github.com/advisories/GHSA-7p8r-x3mc-p8w7)
- **Status**: Host confusion vulnerability; fix requires updating to >= 3.1.5 (when released) or awaiting dependency updates
- **Usage**: URI parsing/validation in HTTP request handling
- **Risk Assessment**:
  - High severity, affects host validation in URI parsing
  - Requires crafted URLs with backslash characters to exploit
  - Next.js and related frameworks have additional URL validation layers
  - Limited exposure: used internally by Next.js HTTP handling, not direct user input
- **Mitigation**:
  - URL validation occurs at multiple layers in Next.js
  - Requests pass through Next.js request pipeline with additional validation
  - Limited attack surface for direct exploitation
- **Future Plan**: Will be resolved when fast-uri releases a patch (>=3.1.5) or dependencies update

##### PostCSS - Incomplete Fix of Source Map Vulnerability
- **Package**: postcss < 8.5.23 (via next@15.1.6)
- **CVE**: [GHSA-fxqj-rqcc-2cmp](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp)
- **Status**: Incomplete fix of GHSA-6g55-p6wh-862q; fix requires breaking change (downgrading to next@9.3.3)
- **Usage**: CSS processing in Next.js build step
- **Risk Assessment**:
  - High severity, affects source map URL handling
  - Attack requires attacker-controlled sourceMappingURL in CSS when `from` option is unset
  - CSS in this application is generated from trusted sources only:
    - Tailwind CSS configuration (not user-controlled)
    - Next.js internal CSS generation
    - No dynamic CSS generation from user input
  - Impact is limited to build-time CSS processing, not runtime application code
- **Mitigation**:
  - All CSS sources are trusted and non-user-controlled
  - Next.js 15.x has many security improvements over older versions
  - Fixing this would require downgrading to Next.js 9.x (introduces many older, more severe vulnerabilities)
- **Future Plan**: Will be resolved when Next.js 16+ provides a fix without breaking changes

##### undici - HTTP Client Vulnerabilities (Additional variants)
- **Package**: undici < 6.28.0 (via @vercel/blob@0.27.3)
- **CVEs**:
  - [GHSA-8xcm-r25x-g524](https://github.com/advisories/GHSA-8xcm-r25x-g524) - Downstream response desynchronization via retry interceptor
  - [GHSA-m8rv-5g2x-5cg5](https://github.com/advisories/GHSA-m8rv-5g2x-5cg5) - CRLF Injection via blob-like body 'type' property
  - [GHSA-v3r7-h72x-cjcm](https://github.com/advisories/GHSA-v3r7-h72x-cjcm) - Cookie attribute injection via unsanitized domain and unparsed setCookie fields
- **Status**: Fixes require major version updates to @vercel/blob@2.x or undici@6.28.0+; major version bumps have breaking changes
- **Usage**: HTTP client for Vercel Blob Storage (optional file upload feature)
- **Risk Assessment**:
  - Moderate severity, multiple HTTP handling issues
  - CRLF injection and cookie attribute injection require specific conditions in HTTP responses
  - Vercel Blob Storage API is trusted first-party service with controlled response format
  - Response desynchronization requires retry interceptor to mishandle responses
  - Limited exposure: only used for file uploads by authenticated admins
  - Blob storage is optional (can be disabled via BLOB_READ_WRITE_TOKEN)
- **Mitigation**:
  - Blob storage interactions limited to authenticated admin operations
  - Vercel Blob API is a trusted first-party service
  - Rate limiting and file size restrictions in place
  - Application does not parse untrusted HTTP headers from blob responses
- **Future Plan**: Upgrade to @vercel/blob@2.x or undici@6.28.0+ when stable and breaking changes are fully assessed

## Updating This Document

This document should be updated:
- After each security audit
- When vulnerabilities are discovered or fixed
- When security-related dependencies are updated
- At least quarterly during active development
