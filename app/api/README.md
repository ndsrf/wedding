# API Routes

This directory contains all API routes for the wedding management platform.

## Structure

- `auth/` - NextAuth.js authentication handlers
- `master/` - Master admin APIs for platform management
- `planner/` - Wedding planner APIs for managing multiple weddings
- `admin/` - Wedding admin APIs for managing specific weddings
- `guest/` - Guest-facing APIs for RSVP submission

## Conventions

- All routes follow RESTful conventions
- Responses use consistent `APIResponse<T>` format
- Authentication middleware protects all routes except guest APIs (magic link auth)
- Multi-tenancy isolation enforced via middleware
