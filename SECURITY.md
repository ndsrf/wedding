# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it by emailing the project maintainers. Do not create public GitHub issues for security vulnerabilities.

## Security Audit Status

Last updated: 2026-09-28

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

##### PostCSS - Arbitrary File Read, Path Traversal & Source Map Disclosure
- **Package**: postcss <= 8.5.22 (via next@15.1.6 bundled version)
- **CVEs**:
  - [GHSA-6g55-p6wh-862q](https://github.com/advisories/GHSA-6g55-p6wh-862q) - Arbitrary file read via sourceMappingURL
  - [GHSA-r28c-9q8g-f849](https://github.com/advisories/GHSA-r28c-9q8g-f849) - Path traversal in source map auto-loading
  - [GHSA-fxqj-rqcc-2cmp](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp) - Incomplete fix of source map reading vulnerability
- **Status**: Fix available in upstream PostCSS but bundled with Next.js; requires major version upgrade to Next.js 16.x (breaking change)
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
  - Downgrading Next.js to 9.x would introduce many older, more severe vulnerabilities
- **Future Plan**: Will be resolved when Next.js 16+ is evaluated and adopted

#### MODERATE Severity - Accepted Risks

##### PostCSS - XSS via Unescaped </style>
- **Package**: postcss <= 8.5.22 (via next@15.1.6 bundled version)
- **CVE**: [GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93)
- **Status**: Fix available in upstream PostCSS but bundled with Next.js; requires major version upgrade to Next.js 16.x (breaking change)
- **Usage**: CSS processing in Next.js build step
- **Risk Assessment**:
  - Moderate severity, affects CSS stringify output
  - Vulnerability requires malicious CSS content with unescaped `</style>` tags
  - CSS in this application is generated from trusted sources only (Tailwind CSS config, Next.js internal CSS)
  - Impact is limited to build-time CSS processing, not runtime application code
- **Mitigation**:
  - All CSS sources are trusted and non-user-controlled
  - Next.js 15.x is more secure overall
- **Future Plan**: Will be resolved when Next.js 16+ is evaluated and adopted

##### uuid - Missing Buffer Bounds Check
- **Package**: uuid < 11.1.1 (via exceljs@4.4.0)
- **CVE**: [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq)
- **Status**: Fix available in uuid@11.1.1+, but exceljs has not yet updated its dependency; fix via npm audit would downgrade exceljs to 3.4.0 (breaking change)
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
- **Future Plan**: Update to an updated exceljs release supporting uuid@11.1.1+ when available

##### braces, postcss-selector-parser, sprintf-js - Transitive Dev/Build Dependencies
- **Packages**:
  - braces@3.0.3 (via eslint-config-next → fast-glob → micromatch) - [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) - Stack exhaustion DoS via deeply nested patterns (HIGH)
  - postcss-selector-parser@6.0.10 (via @tailwindcss/typography) - [GHSA-rj75-hqrm-r3gf](https://github.com/advisories/GHSA-rj75-hqrm-r3gf) - Quadratic complexity CPU exhaustion (MODERATE)
  - sprintf-js@1.0.3 (via argparse → js-yaml, mammoth, gray-matter) - [GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c) - DoS via unbounded precision specifiers (MODERATE)
- **Status**: No non-breaking fix. For braces and sprintf-js the advisory lists no patched version. The postcss-selector-parser fix is 7.x, which `@tailwindcss/typography` does not support. npm overrides were tested and do not clear the advisories.
- **Usage**: Build-time tooling (ESLint, Tailwind CSS) and argparse's internal CLI/error formatting. None of these process user-supplied input at runtime.
- **Risk Assessment**:
  - Not shipped to the browser. Exposure is limited to developer machines and CI builds that process trusted repository content.
  - Denial-of-service advisories only; no code execution or data disclosure.
- **Future Plan**: Re-evaluate when eslint-config-next, @tailwindcss/typography or the argparse chain publish fixed releases

### Recently Fixed

#### 2026-09-28
- Ran security audit and remediated 26+ vulnerabilities across dependencies:
  - **sharp** updated to 0.35.5 (along with `@img/sharp-linux-x64@0.35.5` and `@img/sharp-libvips-linux-x64@1.3.4`): resolves [GHSA-rgj7-g3m4-5g8c](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c) and [GHSA-f88m-g3jw-g9cj](https://github.com/advisories/GHSA-f88m-g3jw-g9cj) (libvips and libheif vulnerabilities)
  - **@hyperdx/browser** updated to ^0.26.0: resolves [GHSA-8988-4f7v-96qf](https://github.com/advisories/GHSA-8988-4f7v-96qf) (`@opentelemetry/core` unbounded memory allocation in W3C Baggage propagation)
  - **mysql2** override added (`>=3.24.4`): resolves [GHSA-3f6p-5ww8-9rcr](https://github.com/advisories/GHSA-3f6p-5ww8-9rcr) and [GHSA-rgwj-5xj2-c3m3](https://github.com/advisories/GHSA-rgwj-5xj2-c3m3) in Prisma CLI tooling
  - **fflate** override added for `@hyperdx/otel-web-session-recorder` (`>=0.7.5`): resolves [GHSA-px8p-9vwx-vf98](https://github.com/advisories/GHSA-px8p-9vwx-vf98) (infinite loop in ZIP64 parsing)
  - **next** (CRITICAL & HIGH): resolved [GHSA-p293-qw3h-jr36](https://github.com/advisories/GHSA-p293-qw3h-jr36) (RCE on Windows servers) and [GHSA-2xp9-vwfh-vxw4](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4) (RCE in Image Optimization API with AVIF)
  - **@tiptap/core** (HIGH): resolved [GHSA-cp6q-959q-f8rh](https://github.com/advisories/GHSA-cp6q-959q-f8rh) (mergeAttributes prototype pollution) and [GHSA-j95f-988m-3j2f](https://github.com/advisories/GHSA-j95f-988m-3j2f) (ReDoS in attribute parsing)
  - **@xmldom/xmldom** (HIGH): resolved 10 advisories ([GHSA-6gmq-8vp8-gcm6](https://github.com/advisories/GHSA-6gmq-8vp8-gcm6), [GHSA-w2rr-34g9-rvrj](https://github.com/advisories/GHSA-w2rr-34g9-rvrj), [GHSA-4w3w-2rp5-g8jm](https://github.com/advisories/GHSA-4w3w-2rp5-g8jm), [GHSA-c7q8-3ch8-vqpv](https://github.com/advisories/GHSA-c7q8-3ch8-vqpv), [GHSA-27p8-2357-5qqv](https://github.com/advisories/GHSA-27p8-2357-5qqv), [GHSA-6h8r-xr42-gp59](https://github.com/advisories/GHSA-6h8r-xr42-gp59), [GHSA-8344-3jmq-59r6](https://github.com/advisories/GHSA-8344-3jmq-59r6), [GHSA-x4fp-j954-r2f4](https://github.com/advisories/GHSA-x4fp-j954-r2f4), [GHSA-965w-775f-mr7g](https://github.com/advisories/GHSA-965w-775f-mr7g), [GHSA-93r5-fhx6-vmg9](https://github.com/advisories/GHSA-93r5-fhx6-vmg9))
  - **browserslist** (HIGH): resolved [GHSA-c83g-rgw3-j3cx](https://github.com/advisories/GHSA-c83g-rgw3-j3cx) and [GHSA-73wf-gq98-2v4g](https://github.com/advisories/GHSA-73wf-gq98-2v4g)
  - **fast-uri** (HIGH): resolved [GHSA-5jgf-p345-68v8](https://github.com/advisories/GHSA-5jgf-p345-68v8), [GHSA-f65p-4m7j-42xc](https://github.com/advisories/GHSA-f65p-4m7j-42xc), [GHSA-fph4-wmhf-6fwf](https://github.com/advisories/GHSA-fph4-wmhf-6fwf), [GHSA-jqff-g426-hqxp](https://github.com/advisories/GHSA-jqff-g426-hqxp), [GHSA-7p8r-x3mc-p8w7](https://github.com/advisories/GHSA-7p8r-x3mc-p8w7)
  - **js-yaml** (HIGH & MODERATE): resolved [GHSA-2883-xcg3-v3hh](https://github.com/advisories/GHSA-2883-xcg3-v3hh) and [GHSA-h67p-54hq-rp68](https://github.com/advisories/GHSA-h67p-54hq-rp68)
  - **@humanfs/node** (MODERATE): resolved [GHSA-p498-v437-472g](https://github.com/advisories/GHSA-p498-v437-472g)
  - **baseline-browser-mapping** (MODERATE): resolved [GHSA-w5vr-8v7q-w6rv](https://github.com/advisories/GHSA-w5vr-8v7q-w6rv)
  - **qs** (MODERATE): resolved [GHSA-x5fp-wj9c-mxmx](https://github.com/advisories/GHSA-x5fp-wj9c-mxmx) and [GHSA-4mjr-xmp4-gh2g](https://github.com/advisories/GHSA-4mjr-xmp4-gh2g)
  - **undici** (MODERATE): resolved [GHSA-g9mf-h72j-4rw9](https://github.com/advisories/GHSA-g9mf-h72j-4rw9), [GHSA-8xcm-r25x-g524](https://github.com/advisories/GHSA-8xcm-r25x-g524), [GHSA-m8rv-5g2x-5cg5](https://github.com/advisories/GHSA-m8rv-5g2x-5cg5), [GHSA-v3r7-h72x-cjcm](https://github.com/advisories/GHSA-v3r7-h72x-cjcm)
  - **brace-expansion** (HIGH & MODERATE): resolved [GHSA-f886-m6hf-6m8v](https://github.com/advisories/GHSA-f886-m6hf-6m8v), [GHSA-3jxr-9vmj-r5cp](https://github.com/advisories/GHSA-3jxr-9vmj-r5cp), [GHSA-mh99-v99m-4gvg](https://github.com/advisories/GHSA-mh99-v99m-4gvg), [GHSA-rgw5-rvv9-x895](https://github.com/advisories/GHSA-rgw5-rvv9-x895)
  - **minimatch** (HIGH): resolved [GHSA-3ppc-4f35-3m26](https://github.com/advisories/GHSA-3ppc-4f35-3m26)
  - **ajv** (MODERATE): resolved [GHSA-2g4f-4pwh-qvx6](https://github.com/advisories/GHSA-2g4f-4pwh-qvx6)
  - **handlebars** (MODERATE): resolved [GHSA-2qvq-rjwj-gvw9](https://github.com/advisories/GHSA-2qvq-rjwj-gvw9)
  - **prismjs** (MODERATE): resolved [GHSA-x7hr-w5r2-h6wg](https://github.com/advisories/GHSA-x7hr-w5r2-h6wg)
  - **hono** & **@hono/node-server** (MODERATE & HIGH): resolved [GHSA-9r54-q6cx-xmh5](https://github.com/advisories/GHSA-9r54-q6cx-xmh5), [GHSA-6wqw-2p9w-4vw4](https://github.com/advisories/GHSA-6wqw-2p9w-4vw4), [GHSA-r354-f388-2fhh](https://github.com/advisories/GHSA-r354-f388-2fhh), [GHSA-w332-q679-j88p](https://github.com/advisories/GHSA-w332-q679-j88p), [GHSA-wc8c-qw6v-h7f6](https://github.com/advisories/GHSA-wc8c-qw6v-h7f6)
  - **lodash** (MODERATE): resolved [GHSA-xxjr-mmjv-4gpg](https://github.com/advisories/GHSA-xxjr-mmjv-4gpg)
  - **valibot** (MODERATE): resolved [GHSA-5qjj-4xww-7phc](https://github.com/advisories/GHSA-5qjj-4xww-7phc)
  - **find-my-way** (HIGH): resolved [GHSA-c96f-x56v-gq3h](https://github.com/advisories/GHSA-c96f-x56v-gq3h)

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

## Updating This Document

This document should be updated:
- After each security audit
- When vulnerabilities are discovered or fixed
- When security-related dependencies are updated
- At least quarterly during active development
