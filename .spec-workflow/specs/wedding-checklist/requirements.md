# Requirements Document

## Introduction

The Wedding Checklist feature provides wedding planners with a task management system to help couples stay organized throughout their wedding planning journey. This feature addresses a critical gap in the current platform—while planners can manage guest lists and RSVPs, there's no systematic way to track the hundreds of tasks required for wedding preparation.

The checklist system uses a template-based approach where planners create reusable task templates that are automatically copied to each new wedding. Both planners and wedding admins (couples) can collaboratively manage these tasks, with clear assignment tracking and deadline management. The system includes dashboard widgets that surface upcoming tasks for both couples and planners, ensuring nothing falls through the cracks.

This feature differentiates the platform from pure RSVP management tools by providing comprehensive wedding planning support, increasing the value proposition for wedding planners and reducing the likelihood of couples seeking additional planning tools.

## Alignment with Product Vision

This feature directly supports the product vision in multiple ways:

1. **Planner Success = Product Success**: By providing task management capabilities, planners can offer more comprehensive services to their clients without additional tools, increasing planner satisfaction and retention.

2. **Progressive Disclosure**: The template system allows planners to start simple (use a basic template) or go deep (create highly customized templates with sections and dynamic dates), following the principle of revealing complexity only when needed.

3. **Mobile-First**: The checklist interface is designed for mobile interaction with large touch targets, easy checkbox toggling, and responsive grid layouts that work on phones.

4. **Multi-Tenancy**: Task templates are planner-scoped, and wedding-specific checklists maintain complete data isolation per wedding, consistent with the platform's data isolation principles.

5. **Cultural Context**: Spanish wedding planning is detail-intensive and family-centric. The collaborative editing and assignment tracking supports planners working with couples who may have multiple family members involved in planning.

6. **Observability Without Surveillance**: Notifications track task assignments and completions for workflow purposes (so couples know when planners assign them tasks), not for surveillance.

This feature enables the future vision of "Task Management Integration" (Phase 8) mentioned in product.md, laying the groundwork for potential integration with external tools like Google Tasks while providing immediate value with a native solution.

## Requirements

### Requirement 1: Template Creation and Management

**User Story:** As a wedding planner, I want to create and edit task templates, so that I can reuse my standard wedding planning workflow across all my client weddings.

#### Acceptance Criteria

1. WHEN a planner accesses the template editor THEN the system SHALL display a grid interface with columns: Checkbox, Title, Description, Assigned To, Status, Due Date
2. WHEN a planner adds a new task to the template THEN the system SHALL allow entering:
   - Title (required, max 200 characters)
   - Description (optional, rich text with URL support)
   - Assigned To dropdown (Wedding Planner, Couple, Other - translated to user language)
   - Due Date with support for relative dates (e.g., "Wedding Date - 3 months", "Wedding Date + 1 week")
   - Default status (defaults to pending)
3. WHEN a planner organizes tasks into sections THEN the system SHALL allow creating named sections (e.g., "Initial Tasks", "Wedding Week Tasks") and dragging tasks between sections
4. WHEN a planner saves template changes THEN the system SHALL persist changes immediately and display confirmation
5. IF a template already exists for a planner THEN the system SHALL load the existing template for editing
6. WHEN a planner deletes a task from the template THEN the system SHALL confirm deletion and remove the task without affecting existing wedding checklists

### Requirement 2: Template to Wedding Copying

**User Story:** As the system, I want to automatically copy the planner's template to each new wedding, so that every wedding starts with a complete task list without manual setup.

#### Acceptance Criteria

1. WHEN a new wedding is created THEN the system SHALL copy the planner's current template to the wedding as an independent checklist
2. WHEN copying the template THEN the system SHALL convert relative due dates to absolute dates based on the wedding date
   - Example: If wedding date is June 15, 2026 and task has "Wedding Date - 3 months", absolute date becomes March 15, 2026
3. WHEN copying the template THEN the system SHALL preserve:
   - All task titles, descriptions, sections
   - Assignment values (Wedding Planner, Couple, Other)
   - Section organization
4. WHEN the template is copied THEN the system SHALL set all task statuses to "Pending" and checkboxes to unchecked
5. IF the planner updates the template after weddings are created THEN the system SHALL NOT modify existing wedding checklists (one-time copy, not linked)
6. WHEN copying the template THEN the system SHALL complete the operation within 2 seconds for templates with up to 100 tasks

### Requirement 3: Wedding Checklist Collaborative Editing

**User Story:** As a wedding admin (couple) or wedding planner, I want to edit the wedding checklist collaboratively, so that we can both manage tasks and track progress together.

#### Acceptance Criteria

1. WHEN a planner or wedding admin accesses the wedding screen THEN the system SHALL display a "Wedding Checklist" section in the navigation
2. WHEN accessing the Wedding Checklist section THEN the system SHALL display a grid interface showing all tasks organized by section
3. WHEN a user edits a task THEN the system SHALL allow modifying:
   - Checkbox (completed/uncompleted)
   - Title
   - Description (rich text editor with URL support)
   - Assigned To
   - Due Date (absolute dates only, not relative)
4. WHEN a user checks the checkbox THEN the system SHALL automatically set the task status to "Completed"
5. WHEN a user unchecks a completed task THEN the system SHALL revert the status to "Pending"
6. WHEN a user adds a new task to the wedding checklist THEN the system SHALL allow adding tasks to existing sections or creating new sections
7. WHEN a user deletes a task THEN the system SHALL prompt for confirmation and remove the task from the wedding checklist
8. WHEN either planner or admin makes changes THEN the system SHALL save changes immediately and display them to both users (eventual consistency acceptable, no real-time WebSocket required for MVP)

### Requirement 4: Rich Text Description Support

**User Story:** As a wedding planner or admin, I want to add formatted descriptions with links to tasks, so that I can provide detailed instructions and reference external resources.

#### Acceptance Criteria

1. WHEN editing a task description THEN the system SHALL provide a rich text editor with formatting options:
   - Bold, italic, underline
   - Bullet lists and numbered lists
   - Hyperlinks with URL validation
2. WHEN entering a URL THEN the system SHALL validate the URL format and create a clickable link
3. WHEN displaying task descriptions THEN the system SHALL render the formatted text with proper styling
4. WHEN displaying links THEN the system SHALL open links in a new browser tab when clicked
5. IF a description exceeds 2000 characters THEN the system SHALL truncate with "Read more" expansion
6. WHEN rendering rich text THEN the system SHALL sanitize HTML to prevent XSS attacks

### Requirement 5: Task Assignment Notifications

**User Story:** As a wedding admin (couple), I want to receive notifications when tasks are assigned to me or when tasks are completed, so that I stay informed about what I need to do.

#### Acceptance Criteria

1. WHEN a task is assigned to "Couple" (by planner or system copy) THEN the system SHALL create a notification for the wedding admin with:
   - Event type: "Task Assigned"
   - Task title
   - Due date
   - Timestamp of assignment
2. WHEN a task assigned to "Couple" is marked as completed THEN the system SHALL create a notification for the wedding planner with:
   - Event type: "Task Completed by Couple"
   - Task title
   - Completion timestamp
   - Who completed it (wedding admin name)
3. WHEN a task assigned to "Wedding Planner" is marked as completed THEN the system SHALL create a notification for the wedding admin with:
   - Event type: "Task Completed by Planner"
   - Task title
   - Completion timestamp
4. WHEN notifications are created THEN the system SHALL add them to the existing notification feed (same infrastructure as RSVP notifications)
5. WHEN notifications are displayed THEN the system SHALL allow filtering by event type (Task Assigned, Task Completed)
6. WHEN a user clicks a task notification THEN the system SHALL navigate to the wedding checklist screen with the relevant task highlighted

### Requirement 6: Upcoming Tasks Widget - Admin Dashboard

**User Story:** As a wedding admin (couple), I want to see my upcoming assigned tasks on my dashboard, so that I can quickly see what I need to do without navigating to the full checklist.

#### Acceptance Criteria

1. WHEN a wedding admin accesses the /admin page THEN the system SHALL display a table titled "Assigned Tasks Coming Up Soon"
2. WHEN displaying the upcoming tasks table THEN the system SHALL show the next 5 tasks assigned to "Couple", sorted by due date (earliest first)
3. WHEN displaying each task THEN the system SHALL show:
   - Task title
   - Due date
   - Section name (if applicable)
   - Color-coded indicator based on due date
4. WHEN a task is past due THEN the system SHALL highlight the row in red (#EF4444)
5. WHEN a task has a due date within 1 month THEN the system SHALL highlight the row in orange (#F59E0B)
6. WHEN a task has a due date more than 1 month away THEN the system SHALL highlight the row in green (#10B981)
7. WHEN a user clicks a task row THEN the system SHALL navigate to the Wedding Checklist screen
8. IF there are fewer than 5 upcoming tasks THEN the system SHALL display all available tasks
9. IF there are no upcoming tasks THEN the system SHALL display a message "No upcoming tasks assigned to you"
10. WHEN calculating upcoming tasks THEN the system SHALL exclude completed tasks

### Requirement 7: Upcoming Tasks Widget - Planner Dashboard

**User Story:** As a wedding planner, I want to see upcoming tasks assigned to me across all my weddings, so that I can prioritize my work and ensure I don't miss critical deadlines.

#### Acceptance Criteria

1. WHEN a planner accesses the /planner page THEN the system SHALL display a table titled "Assigned Tasks Coming Up Soon"
2. WHEN displaying the upcoming tasks table THEN the system SHALL show the next 3 tasks assigned to "Wedding Planner" for EACH wedding, sorted by due date (earliest first)
3. WHEN displaying each task THEN the system SHALL show:
   - Wedding name (couple names)
   - Task title
   - Due date
   - Section name (if applicable)
   - Color-coded indicator based on due date
4. WHEN a task is past due THEN the system SHALL highlight the row in red (#EF4444)
5. WHEN a task has a due date within 1 month THEN the system SHALL highlight the row in orange (#F59E0B)
6. WHEN a task has a due date more than 1 month away THEN the system SHALL highlight the row in green (#10B981)
7. WHEN a user clicks a task row THEN the system SHALL navigate to the Wedding Checklist screen for that specific wedding
8. IF a wedding has fewer than 3 upcoming tasks THEN the system SHALL display all available tasks for that wedding
9. IF a wedding has no upcoming tasks THEN the system SHALL NOT display that wedding in the table
10. WHEN calculating upcoming tasks THEN the system SHALL exclude completed tasks
11. WHEN displaying tasks across multiple weddings THEN the system SHALL group by wedding and show wedding name clearly

### Requirement 8: Grid-Like Editing Experience

**User Story:** As a planner or admin, I want to edit the checklist as easily as a spreadsheet, so that I can quickly make changes without navigating through multiple forms.

#### Acceptance Criteria

1. WHEN viewing the checklist THEN the system SHALL display tasks in a table/grid format with inline editing
2. WHEN a user clicks a cell THEN the system SHALL activate editing mode for that cell without opening a modal
3. WHEN editing a cell THEN the system SHALL show the appropriate input:
   - Text input for title
   - Rich text editor inline for description
   - Dropdown for "Assigned To"
   - Date picker for due date
   - Checkbox for completion status
4. WHEN a user presses Tab THEN the system SHALL move to the next editable cell (keyboard navigation)
5. WHEN a user presses Enter on title field THEN the system SHALL save and move to the next row
6. WHEN a user clicks outside an editing cell THEN the system SHALL save changes automatically
7. WHEN displaying on mobile THEN the system SHALL use a responsive card layout instead of grid (mobile-first principle)
8. WHEN displaying on desktop THEN the system SHALL show full grid with all columns visible
9. WHEN dragging tasks THEN the system SHALL allow reordering tasks within sections and moving between sections

### Requirement 9: Template Excel Export and Import

**User Story:** As a wedding planner, I want to export and import my task template to/from Excel, so that I can edit tasks in bulk, share templates with other planners, or backup my template.

#### Acceptance Criteria

1. WHEN a planner accesses the template editor THEN the system SHALL display an "Export to Excel" button
2. WHEN a planner clicks "Export to Excel" THEN the system SHALL generate an Excel file (.xlsx) with columns:
   - Section (section name)
   - Title (task title)
   - Description (plain text, rich formatting stripped)
   - Assigned To (Wedding Planner, Couple, or Other)
   - Due Date (relative format, e.g., "Wedding Date - 3 months" or absolute dates)
   - Status (Pending, In Progress, Completed)
3. WHEN generating the Excel file THEN the system SHALL preserve the order of sections and tasks within sections
4. WHEN downloading the Excel file THEN the system SHALL name it "Wedding_Checklist_Template_[PlannerName]_[Date].xlsx"
5. WHEN a planner accesses the template editor THEN the system SHALL display an "Import from Excel" button
6. WHEN a planner clicks "Import from Excel" THEN the system SHALL provide a downloadable Excel template with the correct column headers and sample data
7. WHEN a planner uploads an Excel file THEN the system SHALL validate:
   - All required columns present (Section, Title, Assigned To, Due Date)
   - Valid values for "Assigned To" (Wedding Planner, Couple, Other)
   - Valid date formats for "Due Date" (relative or absolute)
   - Title is not empty
8. IF validation fails THEN the system SHALL display specific error messages indicating which rows have issues
9. WHEN validation succeeds THEN the system SHALL preview the import showing how many tasks will be added/updated
10. WHEN a planner confirms the import THEN the system SHALL replace the existing template with the imported tasks
11. WHEN importing tasks THEN the system SHALL preserve section organization and task order from the Excel file
12. WHEN importing descriptions THEN the system SHALL accept plain text (no rich formatting in Excel import)

### Requirement 10: Wedding Checklist Excel Export and Import

**User Story:** As a wedding planner or wedding admin, I want to export and import the wedding checklist to/from Excel, so that I can work offline, share the list with vendors, or bulk-update tasks.

#### Acceptance Criteria

1. WHEN viewing a wedding checklist THEN the system SHALL display an "Export to Excel" button
2. WHEN clicking "Export to Excel" THEN the system SHALL generate an Excel file (.xlsx) with columns:
   - Section (section name)
   - Title (task title)
   - Description (plain text, rich formatting stripped)
   - Assigned To (Wedding Planner, Couple, or Other)
   - Due Date (absolute date in format YYYY-MM-DD)
   - Status (Pending, In Progress, Completed)
   - Completed (Yes/No checkbox indicator)
3. WHEN generating the Excel file THEN the system SHALL include all tasks (completed and pending) with their current status
4. WHEN downloading the Excel file THEN the system SHALL name it "Wedding_Checklist_[CoupleName]_[Date].xlsx"
5. WHEN viewing a wedding checklist THEN the system SHALL display an "Import from Excel" button
6. WHEN clicking "Import from Excel" THEN the system SHALL provide a downloadable Excel template with the correct column headers and sample data
7. WHEN uploading an Excel file THEN the system SHALL validate:
   - All required columns present (Section, Title, Assigned To, Due Date, Status)
   - Valid values for "Assigned To" (Wedding Planner, Couple, Other)
   - Valid values for "Status" (Pending, In Progress, Completed)
   - Valid date formats for "Due Date" (YYYY-MM-DD or MM/DD/YYYY)
   - Title is not empty
8. IF validation fails THEN the system SHALL display specific error messages indicating which rows have issues
9. WHEN validation succeeds THEN the system SHALL preview the import showing:
   - How many new tasks will be added
   - How many existing tasks will be updated
   - Which tasks will be marked as completed
10. WHEN confirming the import THEN the system SHALL merge imported tasks with existing tasks:
    - Match tasks by Section + Title (case-insensitive)
    - Update matched tasks with imported values
    - Add new tasks that don't match existing ones
    - Preserve tasks not in the import file
11. WHEN importing tasks THEN the system SHALL respect absolute due dates (no relative date conversion)
12. WHEN importing descriptions THEN the system SHALL accept plain text (no rich formatting in Excel import)
13. WHEN tasks are updated via import THEN the system SHALL create notifications if assignment or completion status changes

## Non-Functional Requirements

### Code Architecture and Modularity

- **Single Responsibility Principle**: Separate modules for template management, checklist CRUD operations, date conversion logic, notification creation, dashboard widgets, and Excel import/export
- **Modular Design**: Reusable components for task grid, task row, rich text editor, date picker, upcoming tasks widget, and Excel import/export UI
- **Dependency Management**: Checklist functionality should not depend on RSVP or payment modules; use shared notification infrastructure and existing Excel utilities (from guest list import/export)
- **Clear Interfaces**: Define TypeScript interfaces for Task, TaskTemplate, Section, NotificationEvent, ExcelImportResult, ExcelExportOptions

### Performance

- **Template Copying**: Must complete within 2 seconds for templates with up to 100 tasks
- **Checklist Load Time**: Full checklist (up to 200 tasks across 10 sections) must load within 1 second
- **Inline Editing**: Cell edit activation must be instant (<100ms) for responsive feel
- **Dashboard Widgets**: Upcoming tasks widgets must load within 500ms (query optimization required)
- **Rich Text Rendering**: Descriptions with formatted text and links must render without layout jank
- **Excel Export**: Must generate Excel file within 3 seconds for templates/checklists with up to 200 tasks
- **Excel Import**: Must validate and preview imported data within 5 seconds for files with up to 200 tasks
- **Excel File Size**: Exported Excel files must not exceed 5MB for typical checklists (up to 200 tasks with descriptions)

### Security

- **Multi-Tenancy Isolation**: Template access must be scoped to planner_id; checklist access must be scoped to wedding_id
- **Access Control**: Verify user has access to wedding before allowing checklist edits
- **XSS Prevention**: Sanitize all rich text descriptions using DOMPurify or equivalent; strip all formatting from Excel imports
- **SQL Injection Prevention**: Use Prisma parameterized queries for all database operations
- **Authorization**: Wedding admins can only edit checklists for their wedding; planners can edit checklists for weddings they manage
- **Excel Import Validation**: Validate all Excel imports with strict schema validation; reject files with suspicious content or macros
- **File Upload Security**: Limit Excel file uploads to 10MB maximum; validate file type is legitimate .xlsx format
- **Data Sanitization**: Strip all formulas, scripts, and macros from imported Excel files before processing

### Reliability

- **Data Persistence**: All checklist edits must be persisted immediately with optimistic UI updates and rollback on failure
- **Notification Delivery**: Task assignment and completion notifications must be created reliably (99.9% success rate)
- **Template Integrity**: Template edits must not corrupt existing wedding checklists
- **Concurrent Editing**: Handle concurrent edits by planner and admin gracefully (last-write-wins with optimistic locking)

### Usability

- **Mobile-First**: Checklist must be fully functional on mobile devices with touch-friendly controls (≥44px touch targets)
- **Keyboard Navigation**: Full keyboard support for grid navigation (Tab, Enter, Escape, Arrow keys)
- **Visual Feedback**: Clear visual indicators for task status (completed vs. pending), due date urgency, and assignment
- **Language Support**: All interface text and dropdown values must be translated to all 5 supported languages (Spanish, English, French, Italian, German)
- **Accessibility**: WCAG 2.1 AA compliance for grid navigation, rich text editing, and color-coding (don't rely solely on color)
- **Progressive Disclosure**: Collapse sections by default on mobile; expand all on desktop
- **Error Handling**: Clear error messages for validation failures (e.g., invalid date, missing title)
- **Excel Import Feedback**: Provide clear preview of import changes with summary statistics (X tasks added, Y tasks updated)
- **Excel Template Download**: Provide downloadable template with sample data and column descriptions for easy import creation
- **Import Error Messages**: Show specific row numbers and column names in validation error messages for easy correction
