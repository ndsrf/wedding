# Project Structure

## Directory Organization

```
wedding/
├── src/                           # Application source code
│   ├── app/                       # Next.js 14+ App Router
│   │   ├── api/                   # API route handlers
│   │   │   ├── auth/              # NextAuth.js authentication handlers
│   │   │   │   └── [...nextauth]/ # Dynamic auth routes
│   │   │   ├── master/            # Master admin API routes
│   │   │   │   ├── planners/      # Planner CRUD operations
│   │   │   │   ├── weddings/      # Read-only wedding overview
│   │   │   │   └── analytics/     # Platform-wide analytics
│   │   │   ├── planner/           # Wedding planner API routes
│   │   │   │   ├── weddings/      # Wedding CRUD operations
│   │   │   │   ├── themes/        # Theme management
│   │   │   │   └── stats/         # Planner dashboard statistics
│   │   │   ├── admin/             # Wedding admin API routes
│   │   │   │   ├── wedding/       # Wedding configuration
│   │   │   │   ├── guests/        # Guest list management
│   │   │   │   ├── notifications/ # Activity notifications
│   │   │   │   ├── reminders/     # Manual reminder system
│   │   │   │   ├── payments/      # Payment tracking
│   │   │   │   └── guest-additions/ # Guest-added member review
│   │   │   └── guest/             # Guest RSVP API routes
│   │   │       └── [token]/       # Magic link token-based routes
│   │   ├── master/                # Master admin UI pages
│   │   │   ├── page.tsx           # Dashboard
│   │   │   ├── planners/          # Planner management pages
│   │   │   └── layout.tsx         # Master admin layout
│   │   ├── planner/               # Planner dashboard UI pages
│   │   │   ├── page.tsx           # Wedding list dashboard
│   │   │   ├── weddings/          # Wedding management pages
│   │   │   ├── themes/            # Theme gallery and editor
│   │   │   └── layout.tsx         # Planner layout
│   │   ├── admin/                 # Wedding admin UI pages
│   │   │   ├── page.tsx           # Guest dashboard
│   │   │   ├── guests/            # Guest management pages
│   │   │   ├── notifications/     # Activity feed
│   │   │   ├── payments/          # Payment tracking pages
│   │   │   └── layout.tsx         # Wedding admin layout
│   │   ├── rsvp/                  # Guest-facing RSVP pages
│   │   │   └── [token]/           # Magic link RSVP page
│   │   │       ├── page.tsx       # Main RSVP form
│   │   │       └── layout.tsx     # Guest layout with theme
│   │   ├── layout.tsx             # Root layout (i18n provider, fonts)
│   │   ├── globals.css            # Global Tailwind styles
│   │   └── not-found.tsx          # 404 page
│   ├── components/                # Reusable React components
│   │   ├── ui/                    # Base UI components (shadcn/ui style)
│   │   │   ├── button.tsx         # Button component
│   │   │   ├── input.tsx          # Input component
│   │   │   ├── card.tsx           # Card component
│   │   │   ├── table.tsx          # Table component
│   │   │   ├── dialog.tsx         # Modal dialog
│   │   │   ├── dropdown.tsx       # Dropdown menu
│   │   │   └── ...                # Other base components
│   │   ├── master/                # Master admin-specific components
│   │   │   ├── planner-list.tsx   # Planner table
│   │   │   ├── planner-form.tsx   # Add/edit planner form
│   │   │   └── wedding-overview.tsx # Read-only wedding list
│   │   ├── planner/               # Planner-specific components
│   │   │   ├── wedding-list.tsx   # Wedding dashboard table
│   │   │   ├── wedding-form.tsx   # Create/edit wedding form
│   │   │   ├── theme-gallery.tsx  # Theme selection gallery
│   │   │   └── theme-editor.tsx   # Custom theme editor
│   │   ├── admin/                 # Wedding admin-specific components
│   │   │   ├── guest-table.tsx    # Guest list with filters
│   │   │   ├── guest-form.tsx     # Add/edit guest
│   │   │   ├── excel-import.tsx   # Excel upload component
│   │   │   ├── notification-feed.tsx # Activity notification feed
│   │   │   ├── reminder-dialog.tsx # Send reminders modal
│   │   │   └── payment-tracker.tsx # Payment tracking table
│   │   └── guest/                 # Guest RSVP components
│   │       ├── rsvp-form.tsx      # Family RSVP form
│   │       ├── member-selector.tsx # Family member checkboxes
│   │       ├── language-switcher.tsx # Language dropdown
│   │       └── payment-info.tsx   # Bank transfer details display
│   ├── lib/                       # Shared utilities and services
│   │   ├── db/                    # Database client and utilities
│   │   │   ├── prisma.ts          # Prisma client singleton
│   │   │   └── middleware.ts      # Multi-tenant filtering middleware
│   │   ├── auth/                  # Authentication utilities
│   │   │   ├── oauth.ts           # NextAuth.js configuration
│   │   │   ├── magic-link.ts      # Magic link generation/validation
│   │   │   ├── middleware.ts      # Auth middleware for route protection
│   │   │   └── session.ts         # Session management helpers
│   │   ├── i18n/                  # Internationalization
│   │   │   ├── config.ts          # i18n configuration (supported languages)
│   │   │   ├── server.ts          # Server-side translation utilities
│   │   │   ├── client.ts          # Client-side translation hooks
│   │   │   └── detect.ts          # Language detection logic
│   │   ├── excel/                 # Excel import/export
│   │   │   ├── import.ts          # Guest list import service
│   │   │   ├── export.ts          # Data export service
│   │   │   ├── validation.ts      # Excel data validation
│   │   │   └── templates.ts       # Template generation
│   │   ├── email/                 # Email service
│   │   │   ├── resend.ts          # Resend API client wrapper
│   │   │   └── templates/         # Email templates
│   │   │       ├── planner-invitation.tsx  # Planner invite email
│   │   │       ├── admin-invitation.tsx    # Admin invite email
│   │   │       ├── rsvp-reminder.tsx       # RSVP reminder email
│   │   │       └── payment-confirmation.tsx # Payment confirmed email
│   │   ├── tracking/              # Event tracking
│   │   │   ├── events.ts          # Tracking event service
│   │   │   └── types.ts           # Event type definitions
│   │   ├── payment/               # Payment integration
│   │   │   ├── gocardless.ts      # GoCardless API client
│   │   │   ├── matching.ts        # Payment matching logic
│   │   │   └── manual.ts          # Manual payment recording
│   │   ├── theme/                 # Theme system
│   │   │   ├── engine.ts          # Theme CSS generation
│   │   │   ├── presets.ts         # Pre-built themes
│   │   │   └── types.ts           # Theme configuration types
│   │   ├── utils/                 # General utilities
│   │   │   ├── date.ts            # Date formatting helpers
│   │   │   ├── validation.ts      # Zod validation schemas
│   │   │   └── format.ts          # String/number formatting
│   │   └── constants.ts           # Application-wide constants
│   ├── types/                     # TypeScript type definitions
│   │   ├── models.ts              # Database model types (generated by Prisma)
│   │   ├── api.ts                 # API request/response types
│   │   ├── theme.ts               # Theme configuration types
│   │   └── index.ts               # Re-export all types
│   └── middleware.ts              # Next.js middleware (auth, i18n routing)
├── prisma/
│   ├── schema.prisma              # Database schema definition
│   ├── migrations/                # Database migration files
│   │   └── [timestamp]_[name]/    # Individual migrations
│   └── seed.ts                    # Database seeding script
├── public/
│   ├── locales/                   # Static translation files
│   │   ├── es/                    # Spanish translations
│   │   │   └── common.json
│   │   ├── en/                    # English translations
│   │   │   └── common.json
│   │   ├── fr/                    # French translations
│   │   │   └── common.json
│   │   ├── it/                    # Italian translations
│   │   │   └── common.json
│   │   └── de/                    # German translations
│   │       └── common.json
│   └── images/                    # Static images (logos, icons)
├── config/
│   ├── master-admin.json          # Master admin email configuration
│   └── themes.json                # System theme definitions
├── tests/
│   ├── unit/                      # Unit tests
│   │   ├── lib/                   # Test lib utilities
│   │   ├── components/            # Test components
│   │   └── utils/                 # Test utilities
│   ├── integration/               # Integration tests
│   │   ├── api/                   # Test API routes
│   │   └── db/                    # Test database operations
│   └── e2e/                       # End-to-end tests (Playwright)
│       ├── master-admin.spec.ts   # Master admin flows
│       ├── planner.spec.ts        # Planner flows
│       ├── wedding-admin.spec.ts  # Wedding admin flows
│       └── guest-rsvp.spec.ts     # Guest RSVP flows
├── .github/
│   └── workflows/                 # GitHub Actions workflows
│       ├── ci.yml                 # Continuous integration
│       ├── release.yml            # Release automation
│       └── deploy.yml             # Deployment automation
├── docker/
│   ├── Dockerfile                 # Multi-stage Docker build
│   ├── docker-compose.yml         # Local development compose
│   └── docker-compose.prod.yml    # Production compose template
├── scripts/
│   ├── setup.sh                   # Initial project setup
│   ├── migrate.sh                 # Run database migrations
│   └── deploy.sh                  # Deployment helper
├── .env.example                   # Environment variables template
├── .eslintrc.json                 # ESLint configuration
├── .prettierrc                    # Prettier configuration
├── commitlint.config.js           # Conventional commits enforcement
├── tsconfig.json                  # TypeScript configuration
├── next.config.js                 # Next.js configuration
├── tailwind.config.ts             # Tailwind CSS configuration
├── package.json                   # Dependencies and scripts
├── package-lock.json              # Dependency lock file
└── README.md                      # Project documentation
```

## Naming Conventions

### Files

- **Pages/Routes**: `kebab-case` for directories, `page.tsx` for route files (Next.js App Router convention)
  - Example: `src/app/planner/weddings/page.tsx`
- **React Components**: `PascalCase.tsx` for component files
  - Example: `WeddingList.tsx`, `GuestTable.tsx`, `RsvpForm.tsx`
- **Services/Utilities**: `kebab-case.ts` for non-component TypeScript files
  - Example: `magic-link.ts`, `tracking-events.ts`, `date-utils.ts`
- **API Routes**: `route.ts` for API route handlers (Next.js App Router convention)
  - Example: `src/app/api/planner/weddings/route.ts`
- **Tests**: `[filename].test.ts` or `[filename].spec.ts`
  - Example: `magic-link.test.ts`, `guest-rsvp.spec.ts`
- **Type Definitions**: `[domain].ts` in `src/types/` directory
  - Example: `models.ts`, `api.ts`, `theme.ts`

### Code

- **React Components**: `PascalCase` for component names
  - Example: `WeddingList`, `GuestTable`, `RsvpForm`
- **Functions/Methods**: `camelCase` for function and method names
  - Example: `generateMagicLink()`, `trackEvent()`, `validateToken()`
- **Constants**: `UPPER_SNAKE_CASE` for global constants
  - Example: `MAX_FAMILIES_PER_IMPORT`, `DEFAULT_LANGUAGE`, `API_VERSION`
- **Variables**: `camelCase` for local variables and parameters
  - Example: `weddingId`, `familyName`, `guestList`
- **Types/Interfaces**: `PascalCase` for TypeScript types and interfaces
  - Example: `Wedding`, `Family`, `TrackingEvent`, `ApiResponse<T>`
- **Enums**: `PascalCase` for enum names, `UPPER_SNAKE_CASE` for enum values
  - Example: `EventType.RSVP_SUBMITTED`, `Language.ES`, `Channel.WHATSAPP`

### Database

- **Table Names**: `snake_case` plural (Prisma convention)
  - Example: `wedding_planners`, `families`, `family_members`, `tracking_events`
- **Column Names**: `snake_case`
  - Example: `wedding_id`, `magic_token`, `preferred_language`, `created_at`
- **Enum Values**: `UPPER_CASE` in Prisma schema
  - Example: `ADULT`, `CHILD`, `INFANT`, `WHATSAPP`, `EMAIL`, `SMS`

## Import Patterns

### Import Order

All files follow this strict import order (enforced by ESLint):

1. **External dependencies** (React, Next.js, third-party libraries)
2. **Internal absolute imports** (from `@/` alias)
3. **Relative imports** (from `./` or `../`)
4. **Type imports** (TypeScript types with `import type`)
5. **Style imports** (CSS/SCSS files)

Example:
```typescript
// 1. External dependencies
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// 2. Internal absolute imports
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/middleware'
import { trackEvent } from '@/lib/tracking/events'

// 3. Relative imports
import { validateGuestData } from './validation'

// 4. Type imports
import type { Wedding, Family } from '@/types/models'
import type { ApiResponse } from '@/types/api'

// 5. Style imports (if needed)
import './styles.css'
```

### Module Organization

- **Absolute imports**: Use `@/` alias for all imports from `src/` directory
  - Example: `import { prisma } from '@/lib/db/prisma'`
- **Relative imports**: Only use for files within the same module/directory
  - Example: `import { helper } from './utils'`
- **No circular dependencies**: Avoid circular imports between modules
- **Barrel exports**: Use `index.ts` files to re-export from directories when appropriate
  - Example: `src/types/index.ts` exports all types from individual files

## Code Structure Patterns

### API Route Organization

All API routes follow this structure:

```typescript
// 1. Imports
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { requireAuth } from '@/lib/auth/middleware'

// 2. Validation schemas (Zod)
const requestSchema = z.object({
  name: z.string().min(1),
  email: z.string().email()
})

// 3. Handler function
export async function POST(request: NextRequest) {
  try {
    // 3a. Authentication
    const user = await requireAuth(request, 'wedding_admin')

    // 3b. Request validation
    const body = await request.json()
    const validated = requestSchema.parse(body)

    // 3c. Authorization (multi-tenancy check)
    const wedding = await prisma.wedding.findFirst({
      where: { id: validated.weddingId, planner_id: user.planner_id }
    })
    if (!wedding) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // 3d. Business logic
    const result = await performOperation(validated)

    // 3e. Response
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    // 3f. Error handling
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// 4. Helper functions (if needed)
async function performOperation(data: any) {
  // Implementation
}
```

### React Component Organization

All React components follow this structure:

```typescript
// 1. Imports
'use client' // Only if client component
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { Wedding } from '@/types/models'

// 2. Props interface
interface WeddingListProps {
  weddings: Wedding[]
  onSelect: (weddingId: string) => void
}

// 3. Component definition
export function WeddingList({ weddings, onSelect }: WeddingListProps) {
  // 3a. State declarations
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // 3b. Event handlers
  const handleClick = (id: string) => {
    setSelectedId(id)
    onSelect(id)
  }

  // 3c. Render
  return (
    <div className="wedding-list">
      {weddings.map(wedding => (
        <div key={wedding.id} onClick={() => handleClick(wedding.id)}>
          {wedding.couple_names}
        </div>
      ))}
    </div>
  )
}

// 4. Helper components (if small and related)
function WeddingCard({ wedding }: { wedding: Wedding }) {
  return <div>{wedding.couple_names}</div>
}
```

### Service/Utility Organization

All service files follow this structure:

```typescript
// 1. Imports
import { prisma } from '@/lib/db/prisma'
import type { Family, TrackingEvent } from '@/types/models'

// 2. Type definitions
interface TrackEventParams {
  family_id: string
  wedding_id: string
  event_type: EventType
  channel?: Channel
}

// 3. Main exported functions (public API)
export async function trackEvent(params: TrackEventParams): Promise<void> {
  // Implementation
}

export async function getEvents(weddingId: string): Promise<TrackingEvent[]> {
  // Implementation
}

// 4. Internal helper functions (not exported)
async function validateEventData(params: TrackEventParams): Promise<boolean> {
  // Implementation
}
```

## Code Organization Principles

### Single Responsibility Principle

- **One purpose per file**: Each file should have a single, well-defined purpose
  - API routes handle one resource type (e.g., `/api/admin/guests/route.ts` only handles guest operations)
  - Components render one UI concept (e.g., `GuestTable` displays guests, `GuestForm` edits guests)
  - Services handle one domain (e.g., `tracking/events.ts` only handles event tracking)

### Modularity

- **Service layer separation**: Business logic lives in `src/lib/`, not in API routes or components
- **Reusable utilities**: Common functions extracted to `src/lib/utils/`
- **Component composition**: Build complex UIs from smaller, focused components
- **Avoid duplication**: Extract shared logic into utilities or hooks

### Testability

- **Pure functions**: Prefer pure functions that are easy to test in isolation
- **Dependency injection**: Pass dependencies as parameters rather than importing globally
- **Mock-friendly**: Design services to be easily mocked in tests
- **Separation of concerns**: Keep business logic separate from framework code

### Consistency

- **Follow established patterns**: New code should match existing code style
- **Use project conventions**: Follow naming, structure, and organization patterns
- **Enforce with tooling**: ESLint, Prettier, TypeScript strict mode

## Module Boundaries

### Core vs. Feature Modules

- **Core modules** (`src/lib/`): Reusable services with no feature-specific logic
  - Authentication, database, i18n, tracking, email, Excel, payment, theme
  - Can be used by any feature
  - Should not import from feature modules

- **Feature modules** (`src/app/`, `src/components/`): Feature-specific implementations
  - Master admin, planner, wedding admin, guest features
  - Can import from core modules
  - Should minimize cross-feature dependencies

### Public API vs. Internal Implementation

- **Public exports**: Functions exported from modules are considered public API
- **Internal helpers**: Non-exported functions are implementation details
- **Barrel exports**: Use `index.ts` to explicitly define public API surface
- **Documentation**: All public functions must have JSDoc comments

### Dependency Direction

The dependency flow must always go in one direction:

```
Pages/Components → Services → Database/External APIs
     ↓                ↓              ↓
   UI Logic     Business Logic   Data Access
```

**Rules:**
- Pages/Components can import Services
- Services can import Database/Utilities
- Database/Utilities cannot import Services or Pages
- No circular dependencies allowed

### Multi-Tenancy Boundaries

All database queries must respect wedding-level isolation:

- **Automatic filtering**: Prisma middleware enforces `wedding_id` filtering
- **Context validation**: API routes verify user has access to requested wedding
- **Row-level security**: Consider PostgreSQL RLS as additional layer
- **Audit logging**: Log all cross-tenant access attempts

## Code Size Guidelines

### File Size

- **Maximum file size**: 300 lines of code (excluding imports, blank lines, comments)
- **Components**: Prefer smaller components (50-150 lines)
- **API routes**: Keep routes focused (100-200 lines max)
- **Services**: Break large services into smaller modules (200-300 lines max)

### Function/Method Size

- **Maximum function size**: 50 lines of code
- **Prefer smaller functions**: 10-20 lines for most functions
- **Extract helpers**: If function exceeds 50 lines, extract helpers
- **Single level of abstraction**: Each function should operate at one level of abstraction

### Complexity Guidelines

- **Cyclomatic complexity**: Maximum 10 per function
- **Nesting depth**: Maximum 3 levels of nesting
- **Function parameters**: Maximum 4 parameters (use objects for more)
- **If/else chains**: Prefer early returns or switch statements over deep if/else chains

## Documentation Standards

### Code Documentation

- **All public APIs**: Must have JSDoc comments with description, params, returns, examples
- **Complex logic**: Inline comments explaining "why" not "what"
- **Type definitions**: Document non-obvious types with JSDoc
- **README files**: Each major module should have a README explaining its purpose

### JSDoc Format

```typescript
/**
 * Generate a magic link for guest family access.
 *
 * Creates a cryptographically secure UUID token that remains valid
 * until the wedding date. Tokens are wedding-scoped for security.
 *
 * @param familyId - The UUID of the family to generate a link for
 * @param weddingId - The UUID of the wedding for multi-tenancy scoping
 * @returns Promise resolving to the generated magic link object
 * @throws {Error} If family or wedding not found
 *
 * @example
 * const link = await generateMagicLink('fam-123', 'wed-456')
 * console.log(link.token) // "a1b2c3d4-..."
 */
export async function generateMagicLink(
  familyId: string,
  weddingId: string
): Promise<MagicLink> {
  // Implementation
}
```

### Component Documentation

```typescript
/**
 * Guest table component with filtering and sorting.
 *
 * Displays a paginated list of guest families with real-time RSVP status,
 * attendance counts, and payment tracking. Supports filtering by status,
 * channel, and search across family names.
 *
 * @component
 * @example
 * <GuestTable
 *   weddingId="wed-123"
 *   onSelectFamily={(id) => console.log(id)}
 * />
 */
export function GuestTable({ weddingId, onSelectFamily }: GuestTableProps) {
  // Implementation
}
```

## Additional Conventions

### Environment Variables

- **Naming**: `UPPER_SNAKE_CASE` for all environment variables
- **Prefix**: Public variables use `NEXT_PUBLIC_` prefix
- **Documentation**: Document all variables in `.env.example`
- **Validation**: Validate required variables at application startup

### Error Handling

- **API errors**: Return consistent JSON error responses
- **Client errors**: Display user-friendly error messages
- **Logging**: Log errors with context (user_id, wedding_id, timestamp)
- **Error boundaries**: Use React error boundaries for component errors

### Performance

- **Code splitting**: Use dynamic imports for large components
- **Lazy loading**: Lazy load images and heavy components
- **Memoization**: Use React.memo, useMemo, useCallback appropriately
- **Database queries**: Always use pagination for list views (50 items per page)

### Security

- **Input validation**: Validate all user input with Zod schemas
- **SQL injection**: Only use Prisma parameterized queries
- **XSS prevention**: Use React's built-in escaping, sanitize user HTML
- **CSRF protection**: NextAuth.js handles CSRF for OAuth flows
- **Rate limiting**: Implement rate limiting on API routes (future enhancement)
