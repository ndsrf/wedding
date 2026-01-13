# Library / Utilities

This directory contains shared utilities, services, and business logic.

## Structure

- `db/` - Database client and Prisma utilities
- `auth/` - Authentication utilities (OAuth, magic links, middleware)
- `i18n/` - Internationalization configuration and utilities
- `excel/` - Excel import/export services
- `email/` - Email service and templates
- `tracking/` - Event tracking service
- `payment/` - Payment integration services
- `theme/` - Theme engine and presets

## Conventions

- All modules export typed interfaces
- Services are stateless where possible
- Use dependency injection for testability
- Document all public functions with JSDoc
