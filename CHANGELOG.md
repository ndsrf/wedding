# [0.4.0](https://github.com/ndsrf/wedding/compare/v0.3.0...v0.4.0) (2026-01-26)


### Features

* add API endpoint for manual database seeding ([6620ebc](https://github.com/ndsrf/wedding/commit/6620ebc5f8538d2ae18992f70439ba35f545ccf7))
* add empty confirmation message for RSVP form in multiple languages ([9cd7be3](https://github.com/ndsrf/wedding/commit/9cd7be3394383718a7d222e971379f72ef0169bd))
* add Garden Birds RSVP template with envelope reveal animation ([e871ac9](https://github.com/ndsrf/wedding/commit/e871ac900b992b65150f6ad612cdc5a5efe847b7))
* add instrumentation hook and update theme presets ([a6f4899](https://github.com/ndsrf/wedding/commit/a6f48999a15c69c24c900ed57057a2318a6720d7))
* add multi-language support to Garden Birds template ([39228d9](https://github.com/ndsrf/wedding/commit/39228d9bd0ccf42d2499575fb92b554280810e47))
* add scrollable sections to Garden Birds template ([973dc2c](https://github.com/ndsrf/wedding/commit/973dc2c4128363cfe8c3c6ee01262467c6e8a04c)), closes [#FAF9F5](https://github.com/ndsrf/wedding/issues/FAF9F5) [#8B9B7](https://github.com/ndsrf/wedding/issues/8B9B7) [#7A8B6](https://github.com/ndsrf/wedding/issues/7A8B6) [#F5F1E8](https://github.com/ndsrf/wedding/issues/F5F1E8) [#FAF9F5](https://github.com/ndsrf/wedding/issues/FAF9F5)
* add theme selection and gift IBAN input to wedding configuration ([43ad2c9](https://github.com/ndsrf/wedding/commit/43ad2c96304fe26f76bca9ce5b80b0171e56dfd4))
* enhance EnvelopeReveal component with improved date handling and Google Maps integration ([86c70d8](https://github.com/ndsrf/wedding/commit/86c70d8eec44eb452a6288df9d289f92d0d9ece3))
* enhance Garden Birds template with elegant hero section ([18658ac](https://github.com/ndsrf/wedding/commit/18658ac1d9c7693b1fe828c3dcd768624d3ddc5b))
* update Docker configuration and enhance deployment documentation ([81e1741](https://github.com/ndsrf/wedding/commit/81e1741e72f9bffd1f51b12f05726cc8fd0cce1b))



# [0.3.0](https://github.com/ndsrf/wedding/compare/v0.2.0...v0.3.0) (2026-01-23)


### Bug Fixes

* solve merge issues with migrations ([6ccf770](https://github.com/ndsrf/wedding/commit/6ccf77053775add02cb3eb8efce9f7ee3d966e4b))


### Features

* add gift IBAN feature for wedding gifts ([4960ef6](https://github.com/ndsrf/wedding/commit/4960ef6d843cccfbae473e80cfe083b454de0a50))
* add message templates and wedding status management features ([8e9bc35](https://github.com/ndsrf/wedding/commit/8e9bc35c4de446b823120fab82b17a7386e32eab))
* add upcoming tasks localization and widget integration ([4cdce97](https://github.com/ndsrf/wedding/commit/4cdce9773f6aab6e5600bdf8c545dc645a574650))
* implement checklist management features ([492a983](https://github.com/ndsrf/wedding/commit/492a9833770399030dbad4a2a6606cf94cb39abc))
* implement seating plan management features ([0cd29b9](https://github.com/ndsrf/wedding/commit/0cd29b980a7843fbe9619da9549efe35cd4e5d42))
* providers and payments ([b684db0](https://github.com/ndsrf/wedding/commit/b684db0cd8f4ae0745a2045586af3eb694466fd2))



# 0.2.0 (2026-01-20)


### Bug Fixes

* **i18n:** add missing auth translation keys to all locales ([3563be8](https://github.com/ndsrf/wedding/commit/3563be8f97280dddfe77f1436fec38ff1de88879))


### Features

* extra fields for RVSP & edit guests ([24a7906](https://github.com/ndsrf/wedding/commit/24a7906c83bcdd67e66ea7e883b66bf390328a55))



# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project setup with Next.js 14+ and TypeScript
- Multi-tenant wedding management platform
- OAuth authentication (Google, Facebook, Apple)
- Magic link authentication for guests
- Multi-language support (ES, EN, FR, IT, DE)
- Theme system with 5 pre-built themes
- Excel import/export for guest management
- CI/CD pipelines with GitHub Actions
- Docker deployment configuration

### Security
- Multi-tenancy isolation
- CSRF protection with OAuth state parameter
- Secure magic link tokens using crypto.randomUUID()
