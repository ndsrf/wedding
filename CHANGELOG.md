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
