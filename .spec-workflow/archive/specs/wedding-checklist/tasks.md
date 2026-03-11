# Tasks Document

## Phase 1: Data Layer - Database Schema & Models

- [x] 1. Create Prisma schema models for checklist system
  - File: prisma/schema.prisma
  - Add ChecklistTemplate, ChecklistSection, and ChecklistTask models
  - Define enums for TaskAssignment and TaskStatus
  - Add proper relations, indexes, and constraints
  - Extend EventType enum to include TASK_ASSIGNED and TASK_COMPLETED
  - Purpose: Establish database foundation for checklist system
  - _Leverage: existing prisma/schema.prisma structure, Wedding and WeddingPlanner models_
  - _Requirements: All (foundation for entire feature)_
  - _Prompt: Role: Database Architect with expertise in PostgreSQL and Prisma ORM | Task: Create comprehensive Prisma schema models for the checklist system including ChecklistTemplate, ChecklistSection, and ChecklistTask with proper relations, indexes (wedding_id, planner_id, due_date, assigned_to, status, completed, order), and enums (TaskAssignment, TaskStatus), extending existing schema structure | Restrictions: Maintain existing model compatibility, follow multi-tenant isolation patterns, ensure proper cascading deletes, do not modify existing core models | Success: Schema compiles without errors, all relationships are properly defined with correct cardinality, indexes support query patterns from design document, migration generates without conflicts_

- [x] 2. Run database migration and generate Prisma client
  - Command: `npx prisma migrate dev --name add_checklist_models && npx prisma generate`
  - Generate TypeScript types from new schema
  - Purpose: Apply schema changes to database and generate type-safe client
  - _Leverage: existing Prisma migration workflow_
  - _Requirements: All (enables implementation)_
  - _Prompt: Role: DevOps Engineer with expertise in database migrations and Prisma | Task: Execute Prisma migration to add checklist models and regenerate Prisma client, ensuring migration applies cleanly to development database | Restrictions: Verify migration is reversible, do not modify existing tables, ensure no data loss | Success: Migration completes successfully, Prisma client regenerated with new types, database schema reflects all checklist models and relations_

- [x] 3. Extend Prisma middleware for multi-tenant filtering
  - File: src/lib/db/middleware.ts
  - Add automatic filtering for ChecklistTask by wedding_id
  - Add filtering for ChecklistTemplate by planner_id
  - Purpose: Ensure multi-tenant data isolation at database query level
  - _Leverage: existing middleware patterns in src/lib/db/middleware.ts_
  - _Requirements: Non-functional (Multi-Tenancy Isolation)_
  - _Prompt: Role: Backend Security Engineer with expertise in multi-tenant architecture and Prisma middleware | Task: Extend existing Prisma middleware to automatically filter ChecklistTask queries by wedding_id and ChecklistTemplate queries by planner_id, following existing middleware patterns | Restrictions: Must maintain existing middleware functionality, do not bypass authorization checks, ensure filtering applies to all query types (findMany, findFirst, count, etc.) | Success: All checklist queries automatically filtered by tenant context, no cross-tenant data leakage possible, existing functionality unaffected_

## Phase 2: Service Layer - Core Business Logic

- [x] 4. Create TypeScript interfaces and types
  - File: src/types/checklist.ts
  - Define interfaces for CreateTemplateData, ChecklistTaskData, ChecklistImportRow, ImportPreview, ImportResult, ExportOptions, ExportResult, TaskNotificationData
  - Define type guards and utility types
  - Purpose: Establish type safety for checklist operations
  - _Leverage: existing type patterns from src/types/_
  - _Requirements: All (type foundation)_
  - _Prompt: Role: TypeScript Developer specializing in type systems and domain modeling | Task: Create comprehensive TypeScript interfaces and types for checklist system covering template data, task data, Excel import/export structures, and notification data, following requirements and design document interfaces | Restrictions: Must extend existing base types where appropriate, maintain strict type safety, do not use 'any' types, ensure types match Prisma generated types | Success: All interfaces compile without errors, proper type safety for all service operations, types align with Prisma schema and design document specifications_

- [x] 5. Implement date converter service
  - File: src/lib/checklist/date-converter.ts
  - Implement parseRelativeDate() to parse "WEDDING_DATE±N" format
  - Implement convertRelativeDateToAbsolute() to convert relative dates to absolute dates
  - Implement convertAbsoluteDateToRelative() for reverse conversion
  - Implement isValidRelativeDateFormat() validator
  - Purpose: Handle conversion between relative and absolute date formats
  - _Leverage: date utility patterns from existing codebase_
  - _Requirements: Requirement 2 (Template to Wedding Copying, date conversion)_
  - _Prompt: Role: Utility Developer with expertise in date/time manipulation and TypeScript | Task: Implement pure utility functions for parsing and converting relative date formats (e.g., "WEDDING_DATE-90", "WEDDING_DATE+7") to absolute dates based on wedding date, following design document interface specifications | Restrictions: Must be pure functions with no side effects, handle edge cases (leap years, month boundaries), validate input formats, return null for invalid inputs | Success: All date conversion functions work correctly for positive and negative offsets, handle edge cases properly, functions are thoroughly unit tested with 100% coverage_

- [x] 6. Implement template management service
  - File: src/lib/checklist/template.ts
  - Implement getTemplate(planner_id) to fetch planner's template
  - Implement saveTemplate(planner_id, data) to create/update template
  - Implement copyTemplateToWedding(planner_id, wedding_id) to copy template and convert dates
  - Implement deleteTemplate(planner_id) to remove template
  - Purpose: Manage checklist templates for wedding planners
  - _Leverage: Prisma client, date converter service, transaction patterns from src/lib/excel/import.ts_
  - _Requirements: Requirement 1 (Template Creation), Requirement 2 (Template Copying)_
  - _Prompt: Role: Backend Developer with expertise in ORM operations and transactional data management | Task: Implement template management service with CRUD operations and template-to-wedding copying logic, ensuring atomic transactions and proper date conversion using the date-converter service | Restrictions: Must use Prisma transactions for multi-table operations, validate template structure before saving, ensure copyTemplateToWedding is idempotent, do not copy if template doesn't exist | Success: All template operations work correctly with proper error handling, template copying preserves structure and converts dates accurately within 2 seconds for 100 tasks, transactions maintain data integrity_

- [x] 7. Implement checklist CRUD service
  - File: src/lib/checklist/crud.ts
  - Implement getChecklist(wedding_id) to fetch wedding checklist with sections
  - Implement createTask(data) to add task to checklist
  - Implement updateTask(task_id, wedding_id, data) to modify task
  - Implement deleteTask(task_id, wedding_id) to remove task
  - Implement reorderTasks(wedding_id, taskOrders) to handle drag-and-drop
  - Implement getUpcomingTasks(wedding_id, assigned_to, limit) for dashboard widget
  - Purpose: Manage wedding-specific checklist operations
  - _Leverage: Prisma client, CRUD patterns from existing services_
  - _Requirements: Requirement 3 (Wedding Checklist Editing), Requirement 6 & 7 (Upcoming Tasks Widgets)_
  - _Prompt: Role: Backend Developer with expertise in CRUD operations and database query optimization | Task: Implement comprehensive checklist CRUD service with methods for fetching, creating, updating, deleting, and reordering tasks, including upcoming tasks query with proper filtering and sorting | Restrictions: Must enforce wedding_id scoping on all operations, validate task data before persistence, optimize queries with proper includes and indexing, handle concurrent edits gracefully | Success: All CRUD operations work correctly with multi-tenant isolation, checklist loads within 1 second for 200 tasks, upcoming tasks query completes within 500ms, reordering maintains consistency_

- [x] 8. Implement notification service for tasks
  - File: src/lib/checklist/notifications.ts
  - Implement createTaskAssignedNotification() for task assignments
  - Implement createTaskCompletedNotification() for task completions
  - Purpose: Generate notifications for task events
  - _Leverage: existing notification patterns from src/lib/notifications/invitation.ts, Notification model_
  - _Requirements: Requirement 5 (Task Assignment Notifications)_
  - _Prompt: Role: Backend Developer with expertise in event-driven systems and notifications | Task: Implement notification creation functions for task assignment and completion events, following existing notification patterns and storing in Notification table with proper event types | Restrictions: Must follow existing notification schema and patterns, do not block main operations if notification fails, log errors for monitoring, ensure notifications include all required context (task title, due date, assignee) | Success: Notifications are created reliably for task events (99.9% success rate), notification creation doesn't slow down task operations, proper error handling and logging implemented_

- [x] 9. Implement Excel export service for checklists
  - File: src/lib/checklist/excel-export.ts
  - Implement exportChecklistTemplate(planner_id, options) for template export
  - Implement exportWeddingChecklist(wedding_id, options) for checklist export
  - Implement generateChecklistExcelTemplate() for download template
  - Purpose: Generate Excel files from templates and checklists
  - _Leverage: Excel generation patterns from src/lib/excel/export.ts, xlsx library_
  - _Requirements: Requirement 9 & 10 (Excel Export)_
  - _Prompt: Role: Full-stack Developer with expertise in Excel file generation and data serialization | Task: Implement Excel export functions for templates and wedding checklists, generating properly formatted .xlsx files with correct columns (Section, Title, Description, Assigned To, Due Date, Status, Completed), following existing Excel export patterns | Restrictions: Must strip rich text formatting from descriptions, handle large datasets efficiently (up to 200 tasks), limit file size to 5MB, properly format dates and enums, follow existing workbook creation patterns | Success: Excel files generate within 3 seconds for 200 tasks, files are under 5MB, all data exports correctly with proper formatting, files open correctly in Excel/LibreOffice_

- [x] 10. Implement Excel import service for checklists
  - File: src/lib/checklist/excel-import.ts
  - Implement parseChecklistExcel(buffer) to parse uploaded Excel files
  - Implement validateImportData(rows, weddingDate) with Zod schemas
  - Implement previewImport(wedding_id, rows) to show import changes
  - Implement importChecklist(wedding_id, rows, weddingDate) to merge data
  - Purpose: Import and validate checklist tasks from Excel files
  - _Leverage: Excel parsing from src/lib/excel/import.ts, Zod validation, checklist CRUD service, date converter_
  - _Requirements: Requirement 9 & 10 (Excel Import)_
  - _Prompt: Role: Backend Developer with expertise in file parsing, validation, and data merging | Task: Implement Excel import functions with comprehensive validation, preview generation, and merge logic (matching by Section+Title), following existing Excel import patterns and using Zod for validation | Restrictions: Must validate all columns and data formats, provide specific error messages with row numbers, handle large files efficiently (up to 200 rows), use transactions for imports, strip all formulas and macros for security | Success: Excel files parse within 5 seconds for 200 rows, validation catches all errors with clear messages, preview accurately shows changes (new/updated tasks), merge logic correctly matches and updates existing tasks_

## Phase 3: API Layer - Routes and Endpoints

- [x] 11. Create template API routes
  - Files:
    - src/app/api/planner/checklist-template/route.ts (GET, POST, DELETE)
    - src/app/api/planner/checklist-template/export/route.ts (GET)
    - src/app/api/planner/checklist-template/import/route.ts (POST)
  - Implement authentication and authorization middleware
  - Add Zod request validation schemas
  - Connect to template management service
  - Purpose: Expose template management via REST API
  - _Leverage: existing API route patterns from src/app/api/, authentication middleware_
  - _Requirements: Requirement 1 (Template Creation), Requirement 9 (Template Export/Import)_
  - _Prompt: Role: API Developer with expertise in Next.js API routes and REST conventions | Task: Create template management API routes with GET (fetch template), POST (save template), DELETE (remove template), plus export/import endpoints, following existing API patterns with proper authentication, authorization, and validation | Restrictions: Must verify planner authentication, validate all inputs with Zod, return appropriate HTTP status codes, handle errors gracefully, follow existing route organization | Success: All template API endpoints work correctly with proper auth, validation catches invalid requests, error responses are consistent, API response times under 500ms for 95th percentile_

- [x] 12. Create wedding checklist API routes
  - Files:
    - src/app/api/admin/checklist/route.ts (GET for fetching, POST for create, PATCH for update, DELETE)
    - src/app/api/admin/checklist/export/route.ts (GET)
    - src/app/api/admin/checklist/import/route.ts (POST)
  - Implement authorization for both planner and admin roles
  - Add request validation and sanitization
  - Connect to checklist CRUD service and notification service
  - Purpose: Expose checklist management via REST API
  - _Leverage: existing API route patterns, auth middleware, checklist CRUD service_
  - _Requirements: Requirement 3 (Checklist Editing), Requirement 10 (Checklist Export/Import)_
  - _Prompt: Role: API Developer with expertise in authorization and RESTful design | Task: Create wedding checklist API routes with GET, POST, PATCH, DELETE operations plus export/import endpoints, ensuring both planners and wedding admins can access their authorized weddings | Restrictions: Must verify user has access to wedding_id before operations, sanitize rich text descriptions to prevent XSS, validate all inputs, trigger notifications on assignment/completion changes, follow existing patterns | Success: All checklist endpoints work with proper multi-role authorization, XSS prevention via sanitization, notifications triggered correctly, API responses within 500ms, all CRUD operations tested_

- [x] 13. Create upcoming tasks widget API routes
  - Files:
    - src/app/api/admin/upcoming-tasks/route.ts (GET)
    - src/app/api/planner/upcoming-tasks/route.ts (GET)
  - Implement efficient queries for upcoming tasks
  - Add response caching where appropriate
  - Purpose: Provide data for dashboard widgets
  - _Leverage: checklist CRUD service getUpcomingTasks(), existing API patterns_
  - _Requirements: Requirement 6 (Admin Widget), Requirement 7 (Planner Widget)_
  - _Prompt: Role: Backend Developer with expertise in query optimization and API design | Task: Create optimized API endpoints for fetching upcoming tasks, with admin endpoint returning 5 tasks for one wedding and planner endpoint returning 3 tasks per wedding across all weddings, sorted by due date with color coding based on urgency | Restrictions: Must complete queries within 500ms, exclude completed tasks, return proper data structure for frontend (wedding name, task title, due date, section, urgency color), optimize with proper indexes and includes | Success: Endpoints return within 500ms even with multiple weddings, correct filtering and sorting applied, color coding logic matches requirements (red <0 days, orange <30 days, green ≥30 days), responses cached appropriately_

## Phase 4: Presentation Layer - UI Components

- [x] 14. Create shared UI components
  - Files:
    - src/components/ui/RichTextEditor.tsx
    - src/components/ui/DatePicker.tsx
    - src/components/ui/TaskRow.tsx
  - Implement RichTextEditor with DOMPurify sanitization
  - Create DatePicker with relative date support for templates
  - Build reusable TaskRow component for grid display
  - Purpose: Provide reusable UI primitives for checklist interfaces
  - _Leverage: existing UI component patterns from src/components/ui/, Tailwind CSS, DOMPurify_
  - _Requirements: Requirement 4 (Rich Text), Requirement 8 (Grid Editing)_
  - _Prompt: Role: Frontend Developer specializing in React components and accessibility | Task: Create three reusable UI components: RichTextEditor (with formatting buttons, URL support, XSS prevention via DOMPurify), DatePicker (with relative date input for templates like "WEDDING_DATE-90"), and TaskRow (inline editable cells for checkbox, title, description, assigned to, due date), following existing UI patterns | Restrictions: Must use Tailwind CSS for styling, ensure WCAG 2.1 AA compliance, sanitize all rich text with DOMPurify, provide keyboard navigation (Tab, Enter, Escape), make touch-friendly (≥44px targets), support mobile responsive design | Success: All components render correctly and are accessible, rich text editor prevents XSS, date picker validates formats, TaskRow supports inline editing with proper UX, components are responsive and work on mobile_

- [x] 15. Create checklist template editor component
  - File: src/components/planner/ChecklistTemplateEditor.tsx
  - Implement grid interface for template editing
  - Add section management (create, rename, delete, drag-drop)
  - Connect to template API routes
  - Add Excel import/export buttons
  - Purpose: Provide planner interface for managing task templates
  - _Leverage: TaskRow, RichTextEditor, DatePicker components, existing form patterns_
  - _Requirements: Requirement 1 (Template Creation), Requirement 9 (Template Export/Import)_
  - _Prompt: Role: React Developer with expertise in complex forms and drag-and-drop interfaces | Task: Implement template editor component with grid layout for task editing, section management with drag-and-drop reordering, Excel import/export functionality, and integration with template API endpoints, using shared UI components | Restrictions: Must handle inline editing with debounced saves, provide optimistic UI updates with rollback on error, support keyboard navigation, implement drag-and-drop for sections and tasks, validate relative date formats, ensure mobile responsive (card layout on small screens) | Success: Template editor allows full CRUD on templates and tasks, drag-and-drop works smoothly, Excel import/export integrated, changes save automatically, responsive design works on mobile, keyboard navigation fully functional_

- [x] 16. Create wedding checklist editor component
  - File: src/components/admin/ChecklistEditor.tsx
  - Implement similar grid interface as template editor but with absolute dates
  - Add task completion tracking (checkbox triggers status change)
  - Connect to wedding checklist API routes
  - Add Excel import/export for wedding checklists
  - Purpose: Provide collaborative interface for managing wedding checklists
  - _Leverage: ChecklistTemplateEditor.tsx (similar structure), shared UI components_
  - _Requirements: Requirement 3 (Checklist Editing), Requirement 10 (Checklist Export/Import)_
  - _Prompt: Role: React Developer with expertise in state management and collaborative UIs | Task: Implement wedding checklist editor component reusing template editor structure but adapted for absolute dates, checkbox completion handling, and multi-user access (planner + admin), with Excel import/export for wedding checklists | Restrictions: Must reuse ChecklistTemplateEditor patterns where possible, handle concurrent edits gracefully (optimistic updates), automatically update status when checkbox toggled, support both planner and admin roles, validate absolute date formats, use responsive card layout on mobile | Success: Checklist editor provides smooth editing experience, checkbox completion works instantly, concurrent edits don't cause conflicts, Excel operations work correctly, component handles both user roles appropriately, fully responsive_

- [x] 17. Create upcoming tasks dashboard widgets
  - Files:
    - src/components/admin/UpcomingTasksWidget.tsx
    - src/components/planner/UpcomingTasksWidget.tsx
  - Implement table display with color-coded due dates
  - Connect to upcoming tasks API routes
  - Add click-to-navigate functionality
  - Purpose: Display upcoming tasks on dashboards
  - _Leverage: existing dashboard widget patterns, upcoming tasks API_
  - _Requirements: Requirement 6 (Admin Widget), Requirement 7 (Planner Widget)_
  - _Prompt: Role: Frontend Developer with expertise in dashboard widgets and data visualization | Task: Create two upcoming tasks widgets (admin shows 5 tasks for one wedding, planner shows 3 tasks per wedding across all weddings) with color-coded rows based on due date urgency (red for past due, orange for within 30 days, green for >30 days), sortable by due date, clickable to navigate to checklist | Restrictions: Must use Tailwind CSS for color coding (#EF4444 red, #F59E0B orange, #10B981 green), ensure colors have sufficient contrast (don't rely solely on color), fetch data from API efficiently, handle loading and empty states, make responsive for mobile dashboards | Success: Widgets load within 500ms, color coding is accurate and accessible, clicking row navigates correctly, handles empty state gracefully, displays properly on mobile, loading states provide good UX_

- [x] 18. Integrate wedding creation with template copying
  - File: src/app/api/planner/weddings/route.ts (or wherever wedding creation occurs)
  - Add hook to call copyTemplateToWedding() after wedding creation
  - Handle cases where planner has no template (skip gracefully)
  - Purpose: Automatically populate new weddings with checklist from template
  - _Leverage: existing wedding creation flow, template service_
  - _Requirements: Requirement 2 (Template Copying on Wedding Creation)_
  - _Prompt: Role: Backend Integration Developer with expertise in workflow automation | Task: Integrate template copying into wedding creation workflow so that when a new wedding is created, the planner's template is automatically copied to the wedding checklist with date conversion, handling cases where no template exists gracefully | Restrictions: Must not fail wedding creation if template copy fails, log errors for monitoring, ensure operation completes within 2 seconds for 100 tasks, only copy if wedding has a valid wedding_date, wrap in try-catch for resilience | Success: New weddings automatically receive checklist from template, dates are correctly converted, wedding creation doesn't fail if template is missing, operation completes quickly, errors are logged for debugging_

- [x] 19. Add checklist section to wedding navigation
  - Files:
    - src/app/admin/checklist/page.tsx
    - src/app/admin/page.tsx (navigation component)
  - Create dedicated checklist page for wedding admins
  - Add "Wedding Checklist" navigation item
  - Purpose: Provide access point for admins to reach their checklist
  - _Leverage: existing wedding admin navigation patterns, ChecklistEditor component_
  - _Requirements: Requirement 3 (Checklist Access)_
  - _Prompt: Role: Frontend Developer with expertise in Next.js App Router and navigation patterns | Task: Create wedding checklist page for admins at /admin/checklist using ChecklistEditor component and add "Wedding Checklist" navigation item to wedding admin navigation menu | Restrictions: Must follow existing navigation structure and styling, ensure proper wedding_id routing, verify admin access, handle loading states, maintain responsive navigation on mobile | Success: Checklist page accessible from wedding admin navigation, component renders correctly with wedding context, navigation item styled consistently, proper authorization enforced_

- [x] 20. Integrate widgets into dashboards
  - Files:
    - src/app/admin/page.tsx (admin dashboard)
    - src/app/planner/page.tsx (planner dashboard)
  - Add UpcomingTasksWidget to both dashboards
  - Position widgets appropriately in dashboard layout
  - Purpose: Surface upcoming tasks on main dashboards
  - _Leverage: UpcomingTasksWidget components, existing dashboard layouts_
  - _Requirements: Requirement 6 (Admin Widget), Requirement 7 (Planner Widget)_
  - _Prompt: Role: Frontend Developer with expertise in dashboard layouts and component integration | Task: Integrate UpcomingTasksWidget components into admin and planner dashboard pages, positioning them appropriately within existing dashboard layouts | Restrictions: Must maintain existing dashboard structure, ensure widgets fit naturally in layout, provide proper spacing, maintain responsive behavior on mobile dashboards | Success: Widgets appear on dashboards in logical positions, integrate smoothly with existing dashboard content, responsive layout maintained, widgets load without blocking other dashboard content_

## Phase 5: Internationalization & Accessibility

- [x] 21. Add translations for checklist feature
  - Files: src/lib/i18n/* (translation files for all 5 languages)
  - Add translations for all UI text (Spanish, English, French, Italian, German)
  - Translate dropdown values (Wedding Planner, Couple, Other)
  - Translate notification messages
  - Purpose: Provide full language support for checklist feature
  - _Leverage: existing i18n infrastructure and translation patterns_
  - _Requirements: Non-functional (Language Support)_
  - _Prompt: Role: Localization Engineer with expertise in i18n and translation management | Task: Add comprehensive translations for all checklist UI text, dropdown values, notification messages, error messages, and widget headings in all 5 supported languages (Spanish, English, French, Italian, German), following existing translation file structure | Restrictions: Must use existing translation keys format, ensure consistency with existing translations, provide culturally appropriate translations (especially for Spanish wedding context), validate all translation files compile | Success: All checklist UI text is fully translated in all 5 languages, no hardcoded English strings remain, translations are culturally appropriate, language switching works seamlessly_

- [x] 22. Ensure accessibility compliance
  - Files: All checklist UI components
  - Add ARIA labels, roles, and descriptions
  - Ensure keyboard navigation works throughout
  - Test with screen readers
  - Verify color contrast ratios
  - Purpose: Ensure WCAG 2.1 AA compliance for checklist feature
  - _Leverage: existing accessibility patterns, WCAG guidelines_
  - _Requirements: Non-functional (Accessibility)_
  - _Prompt: Role: Accessibility Specialist with expertise in WCAG 2.1 AA compliance and screen reader testing | Task: Audit and enhance all checklist components for accessibility including proper ARIA labels, keyboard navigation, screen reader compatibility, color contrast (4.5:1 for text, don't rely solely on color), focus indicators, and semantic HTML | Restrictions: Must meet WCAG 2.1 AA standards, test with NVDA/JAWS screen readers, ensure keyboard-only operation is possible, provide alternatives to color-coded information, use semantic HTML elements | Success: All checklist features are fully accessible via keyboard, screen readers can navigate and operate all functions, color contrast meets standards, focus indicators are visible, WCAG 2.1 AA compliance verified_

## Phase 6: Testing & Quality Assurance

- [ ] 23. Write unit tests for services
  - Files:
    - tests/lib/checklist/date-converter.test.ts
    - tests/lib/checklist/template.test.ts
    - tests/lib/checklist/crud.test.ts
    - tests/lib/checklist/excel-import.test.ts
    - tests/lib/checklist/excel-export.test.ts
    - tests/lib/checklist/notifications.test.ts
  - Test all service functions in isolation with mocked dependencies
  - Cover success cases, error cases, and edge cases
  - Purpose: Ensure service layer reliability and catch regressions
  - _Leverage: existing test patterns, Jest, testing utilities_
  - _Requirements: All (quality assurance)_
  - _Prompt: Role: QA Engineer with expertise in unit testing, Jest, and TDD practices | Task: Create comprehensive unit tests for all checklist service modules covering success scenarios, error handling, edge cases, and boundary conditions, using mocked dependencies where appropriate, aiming for >90% code coverage | Restrictions: Must test business logic in isolation, mock all external dependencies (Prisma, file system), ensure tests are fast and deterministic, follow existing test file organization, use descriptive test names | Success: All service functions have unit tests with >90% coverage, edge cases covered (date boundaries, empty data, invalid inputs), tests run quickly (<5 seconds total), all tests pass consistently_

- [ ] 24. Write integration tests for API routes
  - Files:
    - tests/api/planner/checklist-template.test.ts
    - tests/api/admin/checklist.test.ts
    - tests/api/upcoming-tasks.test.ts
  - Test API endpoints end-to-end with test database
  - Test authentication, authorization, validation, and error handling
  - Purpose: Ensure API layer works correctly with database
  - _Leverage: existing API test patterns, supertest or similar, test database_
  - _Requirements: All (quality assurance)_
  - _Prompt: Role: Integration Test Engineer with expertise in API testing and test database management | Task: Create comprehensive integration tests for all checklist API routes testing authentication, authorization, request validation, success responses, error responses, and database interactions using test database, following existing test patterns | Restrictions: Must use isolated test database, clean up test data after each test, test both success and failure scenarios, verify HTTP status codes and response structures, test multi-tenant isolation | Success: All API endpoints thoroughly tested with test database, authentication and authorization verified, validation tested, error cases covered, tests clean up properly, all integration tests pass reliably_

- [ ] 25. Write component tests for UI
  - Files:
    - tests/components/planner/ChecklistTemplateEditor.test.tsx
    - tests/components/admin/ChecklistEditor.test.tsx
    - tests/components/admin/UpcomingTasksWidget.test.tsx
    - tests/components/ui/RichTextEditor.test.tsx
  - Test component rendering, user interactions, and API integration
  - Mock API calls and test loading/error states
  - Purpose: Ensure UI components work correctly and handle all states
  - _Leverage: React Testing Library, existing component test patterns_
  - _Requirements: All (quality assurance)_
  - _Prompt: Role: Frontend QA Engineer with expertise in React Testing Library and component testing | Task: Create comprehensive component tests for all checklist UI components testing rendering, user interactions (clicks, typing, drag-drop), form submission, loading states, error states, and API integration with mocked fetch calls | Restrictions: Must use React Testing Library best practices (test user behavior not implementation), mock all API calls, test accessibility (roles, labels), verify proper error handling, follow existing test structure | Success: All UI components have thorough tests covering user interactions, loading/error states handled correctly, accessibility tested, mocked API integration works, tests are maintainable and readable_

- [ ] 26. Write end-to-end tests for user journeys
  - Files:
    - tests/e2e/checklist/planner-template-workflow.spec.ts
    - tests/e2e/checklist/admin-checklist-workflow.spec.ts
    - tests/e2e/checklist/excel-import-export.spec.ts
    - tests/e2e/checklist/dashboard-widgets.spec.ts
  - Test complete user workflows from login to task completion
  - Test across different browsers and viewport sizes
  - Purpose: Verify entire feature works end-to-end in real browser
  - _Leverage: Playwright or Cypress, existing e2e test setup_
  - _Requirements: All (validation)_
  - _Prompt: Role: QA Automation Engineer with expertise in end-to-end testing and Playwright/Cypress | Task: Create comprehensive e2e tests covering complete user journeys for checklist feature including planner template creation/editing/export/import, admin checklist editing/completion, Excel workflows, dashboard widget interaction, and mobile responsive behavior, testing across Chrome, Firefox, and Safari | Restrictions: Must test real user workflows not individual features, ensure tests are reliable and not flaky, test mobile responsive behavior (375px width), use proper selectors (data-testid), clean up test data, follow existing e2e patterns | Success: All critical user journeys covered by e2e tests, tests pass consistently across browsers, mobile behavior validated, tests run in CI/CD pipeline, realistic user scenarios verified_

## Phase 7: Security & Performance

- [ ] 27. Security audit and hardening
  - Files: All checklist API routes and services
  - Audit for XSS, SQL injection, CSRF, authorization bypass vulnerabilities
  - Implement rate limiting for API routes
  - Add input sanitization and output encoding
  - Purpose: Ensure checklist feature meets security standards
  - _Leverage: existing security middleware, DOMPurify, Prisma protection_
  - _Requirements: Non-functional (Security)_
  - _Prompt: Role: Security Engineer with expertise in web application security and OWASP Top 10 | Task: Conduct comprehensive security audit of checklist feature covering XSS prevention (rich text sanitization), SQL injection (Prisma parameterization), authorization (multi-tenant isolation), CSRF (token validation), file upload security (Excel imports), and implement rate limiting for API endpoints | Restrictions: Must verify all user inputs are validated, rich text sanitized with DOMPurify, authorization checked on every operation, Excel uploads validated and size-limited, no raw SQL queries, follow existing security patterns | Success: No XSS vulnerabilities in rich text editor, multi-tenant isolation verified, authorization enforced consistently, Excel uploads secured (no macros, size limits), rate limiting prevents abuse, security audit passes_

- [ ] 28. Performance optimization and monitoring
  - Files: All checklist components and API routes
  - Optimize database queries with proper indexes
  - Add query result caching where appropriate
  - Implement code splitting and lazy loading for UI
  - Add performance monitoring for API routes
  - Purpose: Ensure checklist feature meets performance requirements
  - _Leverage: existing performance monitoring setup, React.lazy, Redis (if available)_
  - _Requirements: Non-functional (Performance)_
  - _Prompt: Role: Performance Engineer with expertise in database optimization and React performance | Task: Optimize checklist feature performance including database query optimization (indexes, query planning), API response caching (Redis or in-memory), frontend code splitting (React.lazy for editor components), virtualization for large task lists (react-window), debounced saves, and performance monitoring setup | Restrictions: Must meet performance targets (checklist load <1s for 200 tasks, upcoming tasks <500ms, template copy <2s for 100 tasks), verify indexes are used in queries, implement caching without stale data issues, lazy load heavy components | Success: All performance targets met consistently, database queries use indexes efficiently, API response times meet 95th percentile <500ms, large checklists render smoothly, performance monitoring tracks key metrics_

## Phase 8: Documentation & Deployment

- [ ] 29. Write technical documentation
  - Files:
    - docs/features/checklist/README.md
    - docs/features/checklist/api-reference.md
    - docs/features/checklist/data-model.md
  - Document checklist architecture, API endpoints, data models
  - Add code comments for complex logic
  - Create developer guide for extending checklist feature
  - Purpose: Ensure feature is maintainable and understandable
  - _Leverage: existing documentation structure and templates_
  - _Requirements: All (maintainability)_
  - _Prompt: Role: Technical Writer with software development background | Task: Create comprehensive technical documentation for checklist feature including architecture overview, API reference (endpoints, request/response formats, authentication), data model documentation (ERD, relationships), component documentation, and developer guide for extending the feature | Restrictions: Must follow existing documentation structure and format, include code examples, document all public APIs, provide clear diagrams (architecture, data model), keep documentation in sync with implementation | Success: Documentation is complete and accurate, developers can understand and extend feature using docs, API reference covers all endpoints, data model clearly explained with diagrams, code examples are correct_

- [ ] 30. Create user documentation and help content
  - Files:
    - docs/user-guides/planner/checklist-templates.md
    - docs/user-guides/admin/wedding-checklist.md
  - Write user guides for planners and wedding admins
  - Create in-app help tooltips and onboarding
  - Prepare FAQ and troubleshooting guide
  - Purpose: Help users understand and use checklist feature effectively
  - _Leverage: existing user documentation patterns_
  - _Requirements: All (usability)_
  - _Prompt: Role: User Documentation Specialist with UX writing expertise | Task: Create user-friendly documentation and in-app help content for checklist feature including step-by-step guides for planners (creating templates, importing from Excel) and admins (managing checklists, completing tasks), FAQ section, troubleshooting guide, and in-app tooltips for key features | Restrictions: Must write for non-technical audience, use clear screenshots and examples, translate key content to all supported languages, follow existing user doc structure, keep concise and scannable | Success: User guides are clear and helpful, planners and admins can self-serve for common tasks, FAQ covers typical questions, in-app help accessible at point of need, documentation translated to primary languages_

- [ ] 31. Prepare deployment and rollout plan
  - Files: Deployment checklist, migration scripts, rollback plan
  - Create migration scripts for existing weddings (optional)
  - Prepare feature flag configuration
  - Document rollout phases (internal testing, beta, full rollout)
  - Create rollback procedures
  - Purpose: Ensure smooth deployment with minimal risk
  - _Leverage: existing deployment processes and infrastructure_
  - _Requirements: All (deployment)_
  - _Prompt: Role: DevOps Engineer with expertise in zero-downtime deployments and rollback strategies | Task: Create comprehensive deployment plan for checklist feature including database migration execution, optional backfill script for existing weddings, feature flag setup for gradual rollout, deployment verification checklist, monitoring setup, and rollback procedures | Restrictions: Must ensure zero downtime during deployment, database migrations are reversible, feature can be disabled via flag if issues found, monitor key metrics post-deployment, have clear rollback criteria | Success: Deployment plan is detailed and executable, database migration runs cleanly in production, feature flag enables gradual rollout, monitoring alerts on performance/error issues, rollback procedure tested and documented_

- [ ] 32. Final integration testing and bug fixes
  - Task: Perform final integration testing across all components
  - Run full regression test suite
  - Fix any bugs discovered during final testing
  - Verify all requirements met
  - Purpose: Ensure feature is production-ready
  - _Leverage: all test suites created in phase 6_
  - _Requirements: All_
  - _Prompt: Role: QA Lead with expertise in integration testing and release readiness | Task: Conduct final comprehensive integration testing of complete checklist feature across all user roles, browsers, devices, and scenarios, run full automated test suite, manually verify critical workflows, identify and fix any remaining bugs, create final release checklist | Restrictions: Must test all requirements systematically, verify cross-browser compatibility, test mobile devices, check language translations, validate performance targets, ensure security requirements met | Success: All automated tests pass, critical user workflows verified manually, no high-priority bugs remain, all requirements met and documented, feature approved for production deployment_
