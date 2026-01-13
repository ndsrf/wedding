# Tests

This directory contains all test files for the wedding management platform.

## Structure

- `unit/` - Unit tests for utilities and services
- `integration/` - Integration tests for API routes
- `e2e/` - End-to-end tests for critical user journeys

## Testing Strategy

- **Unit Tests** (Jest): Test individual functions and utilities
- **Integration Tests** (Jest): Test API routes with database
- **E2E Tests** (Playwright): Test complete workflows in browser

## Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run tests with coverage
npm run test:coverage
```

## Coverage Target

Aim for 80% code coverage across the application.
