# Screen Consolidation Plan: Admin ↔ Planner

## Problem

The `/admin` and `/planner/weddings/[id]` areas share nearly identical pages (guests, notifications, seating, menu, etc.). Each page is duplicated: one ~1100-line admin version and one ~1100-line planner version with only API path differences. This causes maintenance burden — a bug fix or feature added to the admin side must be manually mirrored to the planner side.

## Guiding Principles

1. **Admin is the source of truth.** The admin side is more tested and up-to-date. When consolidating, use admin as the base.
2. **Keep route files thin.** Each `page.tsx` should do nothing but resolve context (weddingId, isReadOnly, API paths) and render the shared component.
3. **No runtime path-building magic.** All API paths are built at the callsite (in the thin page) and passed explicitly to the shared component. The shared component never knows which role it's running under.
4. **Preserve URLs.** Both `/admin/guests` and `/planner/weddings/:id/guests` continue to work. No redirects.
5. **Middleware handles auth, not components.** Shared UI components are role-agnostic; access control stays in middleware and API routes.

---

## Architecture

### Layer 1 — Shared UI Components (`src/components/shared/`)

For each shared page, create a `<PageNameContent>` component that contains all logic and JSX.

**Props contract (pattern to follow for all screens):**

```typescript
// The API path bag — built by the thin page, consumed by the shared component
interface <Feature>ApiPaths {
  apiBase: string;      // e.g. /api/admin  OR  /api/planner/weddings/:id
  // ... all other specific API paths used by this page
}

interface <Feature>PageContentProps {
  apiPaths: <Feature>ApiPaths;
  isReadOnly: boolean;
  header: React.ReactNode;  // header/nav is role-specific, passed as a slot
}
```

**Rules:**
- All `fetch()` calls use `apiPaths.*` — never hardcode `/api/admin/...` inside shared components.
- Use admin colors (rose/pink palette) as the canonical design tokens.
- The `header` slot lets each role render its own navigation (admin uses `<PrivateHeader>`, planner renders a breadcrumb back to the wedding).

### Layer 2 — Thin Route Pages

```typescript
// Admin thin page  (src/app/(public)/admin/<feature>/page.tsx)
export default function FeaturePage() {
  const { isReadOnly } = useWeddingAccess();
  return (
    <FeaturePageContent
      apiPaths={{
        apiBase: '/api/admin',
        // ...
      }}
      isReadOnly={isReadOnly}
      header={<PrivateHeader title="..." backUrl="/admin" />}
    />
  );
}

// Planner thin page  (src/app/(public)/planner/weddings/[id]/<feature>/page.tsx)
export default function FeaturePage() {
  const { id: weddingId } = useParams() as { id: string };
  return (
    <FeaturePageContent
      apiPaths={{
        apiBase: `/api/planner/weddings/${weddingId}`,
        // ...
      }}
      isReadOnly={false}
      header={<PlannerWeddingHeader weddingId={weddingId} currentPage="feature" />}
    />
  );
}
```

### Layer 3 — Shared API Handlers (`src/lib/<feature>/api-handlers.ts`)

For each shared page, extract the handler business logic into a shared lib function that accepts `weddingId: string`.

```typescript
// src/lib/guests/api-handlers.ts
export async function listGuestsHandler(weddingId: string, searchParams: URLSearchParams) { ... }
export async function createGuestHandler(weddingId: string, body: unknown) { ... }
// ...
```

The route files become thin auth-and-dispatch wrappers:

```typescript
// Admin route
export async function GET(request: NextRequest) {
  const user = await requireRole('wedding_admin');
  return listGuestsHandler(user.wedding_id!, request.nextUrl.searchParams);
}

// Planner route
export async function GET(request: NextRequest, { params }) {
  const user = await requireRole('planner');
  const { id: weddingId } = params;
  await assertPlannerOwns(user.planner_id!, weddingId);
  return listGuestsHandler(weddingId, request.nextUrl.searchParams);
}
```

### Layer 4 — Middleware (`src/middleware.ts`)

The existing `SHARED_ROUTES` mechanism already supports cross-role API access (used for checklist). Extend it as needed when a planner needs to call an admin API endpoint directly.

```typescript
const SHARED_ROUTES = {
  planner_and_admin: [
    '/api/admin/checklist',
    // Add more as needed:
    // '/api/admin/some-shared-endpoint',
  ],
};
```

For **UI pages**, no middleware changes are needed — each role continues to access its own route prefix.

---

## Step-by-Step Process for Each Screen

1. **Identify the canonical version** (usually admin).
2. **Identify all differences** between admin and planner versions:
   - API paths (most common)
   - Header/navigation
   - isReadOnly source
   - Any feature flags or behavior differences
3. **Create `src/components/shared/<FeatureName>PageContent.tsx`** using the admin version as base, replacing hardcoded API strings with `apiPaths.*`.
4. **Replace the admin `page.tsx`** with a thin wrapper (≤30 lines).
5. **Replace the planner `page.tsx`** with a thin wrapper (≤30 lines).
6. **Extract API handler business logic** to `src/lib/<feature>/api-handlers.ts`, following the pattern in `src/lib/guests/api-handlers.ts`. Each handler accepts `weddingId: string` and returns a `NextResponse`. Route files become auth-only wrappers (~30 lines each).
7. **Centralise planner access validation** in `src/lib/<feature>/planner-access.ts` (see `src/lib/guests/planner-access.ts`) to avoid copy-pasting the ownership check across every planner route.
8. **Run the API parity safety check** (see below) before marking the screen as done.

---

## API Parity Safety Check

After consolidating each screen, verify that every API endpoint the shared component calls exists and is fully implemented on **both** sides. This check caught a missing `GET /admins` on the planner side (causing the "invited by" field to be invisible) during the Guests consolidation.

### Checklist

For each `apiPaths.*` entry passed to the shared component:

| Check | How to verify |
|-------|--------------|
| Route file exists on the planner side | `ls src/app/(public)/api/planner/weddings/[id]/<feature>/` |
| All HTTP methods used by the component are implemented | Search the shared component for `fetch(apiPaths.X` and cross-check against `export async function GET/POST/PUT/PATCH/DELETE` in the planner route file |
| Sub-routes called via `${apiPaths.x}/suffix` also exist | List sub-directories: `ls src/app/(public)/api/planner/weddings/[id]/<feature>/` |
| `apiBase`-relative calls (`${apiPaths.apiBase}/something`) resolve to existing planner routes | Grep the shared component and any child components for `apiBase` usage, then verify each path |

### Common failure patterns

- **Missing HTTP verb**: Route file exists but only has `POST`/`DELETE` — no `GET`. The shared component silently gets an empty or error response, hiding UI that depends on the data.
- **Missing sub-route**: The admin side has e.g. `guests/[id]/timeline` but the planner side does not.
- **Child component with a hardcoded default**: A modal or sub-component accepts `apiBase` as an optional prop with a hardcoded `/api/admin` default. Works on admin, silently misfires on planner if the prop is not wired through.

### Quick audit command

```bash
# List all fetch() targets in the shared component, then manually diff against planner routes
grep -o "apiPaths\.[a-zA-Z_]*\|apiBase" src/components/shared/<Feature>PageContent.tsx | sort -u
```

---

## Screens to Consolidate (Inventory)

| Screen | Admin path | Planner path | Status |
|--------|-----------|--------------|--------|
| Guests | `/admin/guests` | `/planner/weddings/[id]/guests` | ✅ Done |
| Notifications | `/admin/notifications` | `/planner/weddings/[id]/notifications` | ✅ Done |
| Menu | `/admin/menu` | `/planner/weddings/[id]/menu` | ✅ Done |
| Tasting | `/admin/tasting` | `/planner/weddings/[id]/tasting` | ✅ Done |
| Seating | `/admin/seating` | `/planner/weddings/[id]/seating` | ✅ Done |
| Checklist | `/admin/checklist` | `/planner/weddings/[id]/checklist` | ⬜ Pending |
| Reports | `/admin/reports` | `/planner/weddings/[id]/reports` | ✅ Done |
| Providers | `/admin/providers` | `/planner/weddings/[id]/providers` | ✅ Done |
| Invitation Builder | `/admin/invitation-builder` | `/planner/weddings/[id]/invitation-builder` | ✅ Done |
| Templates | `/admin/templates` | `/planner/weddings/[id]/templates` | ⬜ Pending |

> Not all screens need consolidation. Evaluate if the planner version has meaningful differences before merging.

---

## Completed: Notifications Page

### UI Consolidation

**Shared component:** `src/components/shared/NotificationsPageContent.tsx`

**Differences resolved:**
| Difference | Resolution |
|-----------|-----------|
| API base paths | `apiPaths` bag passed as prop (notifications, notificationRead, notificationsMarkRead, notificationsExport, remindersPreview, reminders) |
| Header/nav | `header` React slot prop |
| Planner missing export endpoint | Created `POST /api/planner/weddings/:id/notifications/export/route.ts` |
| Planner event_type enum gap | Shared handler includes all event types (`MESSAGE_RECEIVED`, `AI_REPLY_SENT`) |
| `ReminderModal apiBase` | Derived from `apiPaths.reminders` (strips `/reminders` suffix) |
| Inline `validatePlannerAccess` copies | Replaced with shared `validatePlannerAccess` from `src/lib/guests/planner-access.ts` |

### API Consolidation

**Shared handlers:** `src/lib/notifications/api-handlers.ts`

Business logic for 4 operations extracted into shared functions:
`listNotificationsHandler`, `markNotificationReadHandler`, `bulkMarkNotificationsReadHandler`, `exportNotificationsHandler`, `handleNotificationApiError`.

**Shared access guard:** reuses `src/lib/guests/planner-access.ts`

**New planner route:** `src/app/(public)/api/planner/weddings/[id]/notifications/export/route.ts` — previously missing; planners can now export notifications.

**All 8 API route files** (4 admin + 4 planner) reduced to ~30-line auth-and-dispatch wrappers. Three inline copies of `validatePlannerAccess` removed from planner routes.

---

## Completed: Providers Page

### UI Consolidation

**Shared component:** `src/components/shared/ProvidersPageContent.tsx`

The `WeddingProviders` component was already shared for content rendering. `ProvidersPageContent` adds a thin wrapper providing the page shell (`min-h-screen` layout + `<main>` container) with a `header` slot.

**Differences resolved:**
| Difference | Resolution |
|-----------|-----------|
| Page shell duplication | Extracted into `ProvidersPageContent` accepting `weddingId`, `isPlanner`, `header` props |
| Back link href | Admin passes `/admin`, planner passes `/planner/weddings/${id}` in their `header` slot |
| `Promise<params>` pattern in planner page | Replaced with `useParams()` from `next/navigation` |
| Wedding name subtitle in planner header | Planner thin page fetches couple names and injects into its `header` slot |

### API Consolidation

No API consolidation needed — both admin and planner providers pages already share the same API endpoints (`/api/weddings/[id]/providers`, `/api/weddings/[id]/payments`). The `WeddingProviders` component handles all API calls internally.

---

## Completed: Guests Page

### UI Consolidation

**Shared component:** `src/components/shared/GuestsPageContent.tsx`

**Differences resolved:**
| Difference | Resolution |
|-----------|-----------|
| API base paths | `apiPaths.apiBase`, `apiPaths.guests`, etc. passed as props |
| Header/nav | `header` React slot prop |
| `isReadOnly` source | Passed as explicit `isReadOnly` prop |
| Brand colors (rose vs purple) | Standardized on admin rose palette |
| `GuestTimelineModal apiBase` | Uses `apiPaths.apiBase` |
| `ReminderModal apiBase` | Uses `apiPaths.apiBase` |
| Guest additions 404 guard | `guestAdditionsOptional` prop (planner passes `true`) |

### API Consolidation

**Shared handlers:** `src/lib/guests/api-handlers.ts`

All business logic for 14 operations extracted into shared functions:
`listGuestsHandler`, `createGuestHandler`, `getGuestHandler`, `updateGuestHandler`, `deleteGuestHandler`, `bulkDeleteGuestsHandler`, `bulkUpdateGuestsHandler`, `exportGuestsHandler`, `importGuestsHandler`, `importVcfGuestsHandler`, `getGuestTemplateHandler`, `getGuestTimelineHandler`, `getGuestInvLinkHandler`, `handleGuestApiError`.

**Shared access guard:** `src/lib/guests/planner-access.ts`

`validatePlannerAccess(plannerId, weddingId)` returns `null` (access granted) or a ready-to-return `NextResponse` (403/404). Removed 10 copy-pasted copies from individual planner route files.

**All 20 API route files** (10 admin + 10 planner) reduced to ~30-line auth-and-dispatch wrappers. The planner routes now also correctly call `invalidateCache` (previously missing).

---

## Completed: Menu Page

### UI Consolidation

**Shared component:** `src/components/shared/MenuPageContent.tsx`

**Differences resolved:**
| Difference | Resolution |
|-----------|-----------|
| API base paths | `apiPaths.apiBase` passed as prop (e.g. `/api/admin/tasting` vs `/api/planner/weddings/:id/tasting`) |
| Header/nav | `header` React slot prop |
| Wedding name subtitle | Planner thin page fetches couple names and passes them in its `header` slot |
| `WeddingMenuSelector apiBase` | Uses `apiPaths.apiBase` (component already accepted this prop) |

### API Consolidation

**Shared handlers:** `src/lib/menu/api-handlers.ts`

Business logic for 2 operations extracted into shared functions:
`updateMenuSelectionHandler`, `exportMenuHandler`.

**Shared access guard:** reuses `src/lib/guests/planner-access.ts`

`validatePlannerAccess` is generic and shared directly — no separate menu copy needed.

**All 4 API route files** (2 admin + 2 planner) reduced to ~25-line auth-and-dispatch wrappers. The planner routes now correctly call `validatePlannerAccess` (previously missing — any planner could modify any wedding's menu).

---

## Completed: Tasting Page

### UI Consolidation

**Shared component:** `src/components/shared/TastingPageContent.tsx`

**Differences resolved:**
| Difference | Resolution |
|-----------|-----------|
| API base paths | `apiBase` prop (`/api/admin/tasting` vs `/api/planner/weddings/:id/tasting`) |
| Back link href | `backHref` prop (`/admin` vs `/planner/weddings/:id`) |
| Subtitle text | `subtitle` prop (admin: `t('description')`, planner: fetched couple names) |
| `isReadOnly` source | `isReadOnly` prop (admin reads from `useWeddingAccess`, planner defaults to `false`) |
| Planner wedding name fetch | Planner page fetches couple names separately and passes as `subtitle` |

### API Consolidation

**Shared handlers:** `src/lib/tasting/api-handlers.ts`

Business logic for 16 operations extracted into shared functions:
`getTastingMenuHandler`, `upsertTastingMenuHandler`, `createSectionHandler`, `updateSectionHandler`, `deleteSectionHandler`, `createDishHandler`, `updateDishHandler`, `deleteDishHandler`, `uploadDishImageHandler`, `deleteDishImageHandler`, `getParticipantsHandler`, `createParticipantHandler`, `updateParticipantHandler`, `deleteParticipantHandler`, `sendParticipantLinkHandler`, `importTastingMenuHandler`.

**Shared access guard:** reuses `src/lib/guests/planner-access.ts`

Previously the planner routes embedded `{ wedding: { planner_id: user.planner_id } }` deep into every Prisma WHERE clause. Now all 10 planner routes call `validatePlannerAccess` upfront and then delegate to the shared handler using just `weddingId`.

**All 20 API route files** (10 admin + 10 planner) reduced to ~20-line auth-and-dispatch wrappers. Security fix: planner import route previously accepted any `weddingId` without verifying planner ownership — now guarded.

---

## Completed: Invitation Builder Page

### UI Consolidation

**Shared component:** `src/components/shared/InvitationBuilderPageContent.tsx`

**Shared preview component:** `src/components/shared/InvitationBuilderPreviewContent.tsx`

**Differences resolved:**
| Difference | Resolution |
|-----------|-----------|
| API base paths | `apiPaths.apiBase` prop (`/api/admin` vs `/api/planner/weddings/:id`) |
| Wedding data fetch URL | `apiPaths.weddingApi` prop (`/api/admin/wedding` vs `/api/planner/weddings/:id`) |
| Back link href | `backHref` prop (`/admin` vs `/planner/weddings/:id`) |
| Preview window URL | `previewUrl` prop passed through to `InvitationTemplateEditor` |
| Rename/duplicate/preview buttons | Planner was missing these features; now included via shared component |
| Template list not updated on create | Bug in planner page fixed; shared component always updates list |
| Preview page language selector | Planner preview lacked language selector; now uses shared `InvitationBuilderPreviewContent` with selector |

### API Consolidation

**Shared handlers:** `src/lib/invitation-template/api-handlers.ts`

Business logic for 10 operations extracted into shared functions:
`listInvitationTemplatesHandler`, `createInvitationTemplateHandler`, `getInvitationTemplateHandler`, `updateInvitationTemplateHandler`, `deleteInvitationTemplateHandler`, `duplicateInvitationTemplateHandler`, `exportInvitationTemplateHandler`, `importInvitationTemplateHandler`, `listInvitationImagesHandler`, `uploadInvitationImageHandler`.

**Shared access guard:** reuses `src/lib/guests/planner-access.ts`

**New planner route:** `src/app/(public)/api/planner/weddings/[id]/invitation-template/[templateId]/duplicate/route.ts` — this endpoint was previously missing, so planners could not duplicate templates.

**All 12 API route files** (6 admin + 6 planner) reduced to ~25-line auth-and-dispatch wrappers. The planner routes now use `validatePlannerAccess` consistently instead of inline ownership checks.

---

## Completed: Seating Page

### UI Consolidation

**Shared component:** `src/components/shared/SeatingPageContent.tsx`

**Differences resolved:**
| Difference | Resolution |
|-----------|-----------|
| API base paths | `apiBase` prop (`/api/admin/seating` vs `/api/planner/weddings/:id/seating`) |
| Header/nav | `header` React slot prop |
| Admin tab order (config, assignment, layout) vs planner (assignment, config, no layout) | Standardised on admin order; planner now gets layout tab too |
| Planner `SeatingAssignment` was POSTing to a PATCH-only route (broken) | Planner route now exports `POST` instead of `PATCH` |
| Planner tables schema missing type/color/width/height/x/y/rotation fields | Shared handler uses the full admin schema |
| Planner GET response missing `layout_elements` | Shared `getSeatingPlanHandler` always includes `layout_elements` |
| Inline `validatePlannerAccess` copies in planner seating routes | Replaced with shared `validatePlannerAccess` from `src/lib/guests/planner-access.ts` |

### API Consolidation

**Shared handlers:** `src/lib/seating/api-handlers.ts`

Business logic for 6 operations extracted into shared functions:
`getSeatingPlanHandler`, `updateSeatingAssignmentsHandler`, `upsertTablesHandler`, `randomAssignHandler`, `splitFamilyHandler`, `saveLayoutHandler`.

**Shared access guard:** reuses `src/lib/guests/planner-access.ts`

**New planner route:** `src/app/(public)/api/planner/weddings/[id]/seating/layout/route.ts` — previously missing; planners can now save and use the visual seating layout editor.

**All 10 API route files** (5 admin + 5 planner) reduced to ~20-line auth-and-dispatch wrappers. Three inline copies of `validatePlannerAccess` removed from planner routes. Security fix: planner routes now consistently verify planner ownership via `validatePlannerAccess` upfront.

---

## Completed: Reports Page

### UI Consolidation

**Shared component:** `src/components/shared/ReportsPageContent.tsx`

**Differences resolved:**
| Difference | Resolution |
|-----------|-----------|
| Page shell duplication | Extracted into `ReportsPageContent` with `apiBasePath` + `header` slot |
| Planner wedding name subtitle | Planner thin page fetches couple names and injects into its `header` slot |
| Per-wedding vs planner-level reports | Two distinct experiences: shared `ReportsView` for per-wedding, new `PlannerReportsView` for cross-wedding |

### API Consolidation

**Shared handlers:** `src/lib/reports/api-handlers.ts`

Business logic for 5 operations extracted into shared functions:
`attendeesReportHandler`, `guestsPerAdminReportHandler`, `seatingPlanReportHandler`, `ageAverageReportHandler`, `nlQueryReportHandler`.

**Shared access guard:** reuses `src/lib/guests/planner-access.ts`

**New planner per-wedding routes:** all 5 routes under `src/app/(public)/api/planner/weddings/[id]/reports/` were previously missing — planners could not run any per-wedding reports.

**All 10 API route files** (5 admin + 5 planner) reduced to ~15-line auth-and-dispatch wrappers.

### Planner-Level Reports (New — not a consolidation of admin screen)

A new, planner-exclusive reports page at `/planner/reports` provides:
- **4 predefined cross-wedding reports:** Weddings Overview, Guests by Wedding, Provider Payments, Revenue Summary (quotes + invoices)
- **AI natural-language query** scoped by `planner_id`, spanning all managed weddings + financials
- **New API routes:** `src/app/(public)/api/planner/reports/{weddings-summary,guests-summary,provider-payments,revenue,query}/route.ts`
- **New export lib:** `src/lib/reports/planner-export.ts`
- **Planner-scoped NL query:** `executeNaturalLanguagePlannerQuery` + `validatePlannerSQL` added to `src/lib/reports/nl-query.ts`

**Sub-account access:** Sub-accounts receive `planner_id = company_planner_id` in their session token (set in `src/lib/auth/oauth.ts:156`), so they automatically see all company data in both the per-wedding routes (via `validatePlannerAccess`) and the planner-level reports.

**Tables available for planner NL query:**

| Category | Tables |
|----------|--------|
| Wedding data | `weddings`, `families`, `family_members`, `tables`, `wedding_admins`, `gifts` |
| Tasks | `checklist_tasks` |
| Vendors | `wedding_providers`, `provider_categories`, `payments` |
| Tasting | `tasting_menus` |
| Financials | `quotes`, `quote_line_items`, `invoices`, `invoice_line_items`, `invoice_payments` |
