# Requirements Document: Wedding Management App MVP

## Introduction

The Wedding Management App is a multi-tenant SaaS platform where wedding planners manage multiple weddings for their clients. The platform provides family-centric RSVP management, payment tracking, and guest communication through magic links. This MVP focuses on core functionality: platform administration, wedding planner features, wedding admin capabilities, and the guest RSVP experience.

**Target Users:**
- **Master Admin**: Platform owner managing wedding planners
- **Wedding Planners**: Paying customers who manage multiple weddings (Spanish market)
- **Wedding Admins**: Couples granted free access by planners to manage their wedding
- **Guest Families**: Spanish families attending weddings (no login required)

**Business Model**: Wedding planners subscribe monthly and grant free access to couples. Guests access via persistent magic links.

## Alignment with Product Vision

This MVP establishes the foundation for a wedding management platform that:
- Eliminates authentication friction for guests (magic links instead of passwords)
- Supports multi-tenancy with clear data isolation
- Enables wedding planners to scale their business across multiple clients
- Provides a mobile-first, elderly-friendly experience optimized for WhatsApp in-app browsers
- Supports international families with 5 languages (Spanish, English, French, Italian, German)

## Requirements

### Requirement 1: Master Admin Platform Management

**User Story:** As a master admin, I want to manage wedding planner accounts from a central dashboard, so that I can control who has access to the platform.

#### Acceptance Criteria

1. WHEN the master admin signs in with OAuth (Google) THEN the system SHALL verify their email matches the config file and grant access
2. WHEN the master admin views the planner list THEN the system SHALL display all planners with status (Active/Disabled), wedding count, and last login timestamp
3. WHEN the master admin adds a new planner THEN the system SHALL require name, logo, and contact email
4. WHEN the master admin toggles a planner's enabled status THEN the system SHALL immediately update access for that planner
5. IF a planner is disabled THEN they SHALL NOT be able to access the platform or create new weddings
6. WHEN the master admin views weddings THEN the system SHALL display all weddings across all planners in read-only mode

### Requirement 2: Wedding Planner Multi-Wedding Management

**User Story:** As a wedding planner, I want to create and manage multiple weddings for different clients, so that I can serve multiple couples simultaneously.

#### Acceptance Criteria

1. WHEN a planner signs in with OAuth (Google, Facebook/Instagram, or Apple) THEN the system SHALL authenticate and remember their last login provider
2. WHEN a planner first logs in THEN the system SHALL prompt them to choose their preferred language (es/en/fr/it/de)
3. WHEN a planner views their dashboard THEN the system SHALL display all weddings with date, guest count, RSVP completion %, and status
4. WHEN a planner creates a new wedding THEN the system SHALL require couple names, wedding date/time, location, RSVP cutoff date, and default language
5. WHEN a planner creates a wedding THEN the system SHALL allow configuration of payment tracking mode (automated/manual) and guest addition permissions
6. WHEN a planner selects a wedding THEN the system SHALL scope all subsequent actions to that wedding only
7. WHEN a planner invites a wedding admin THEN the system SHALL send an email with OAuth sign-in link granting access to that specific wedding only
8. IF a planner is disabled by master admin THEN all their wedding admins SHALL lose access immediately

### Requirement 3: Wedding Admin Guest Management

**User Story:** As a wedding admin (couple), I want to import my guest list and manage RSVPs, so that I can track who is attending without manual data entry.

#### Acceptance Criteria

1. WHEN a wedding admin signs in with OAuth THEN the system SHALL verify they have access to the invited wedding only
2. WHEN a wedding admin first logs in THEN the system SHALL remember which OAuth provider they used for future logins
3. WHEN a wedding admin uploads an Excel file THEN the system SHALL validate required columns (Family Name, Contact Person, Member names/types) and import families
4. IF the Excel includes a Language column THEN the system SHALL assign that language preference to each family (default to wedding's default language)
5. WHEN importing families THEN the system SHALL generate unique magic tokens and reference codes (if automated payment mode)
6. WHEN a wedding admin views the guest dashboard THEN the system SHALL display all families with RSVP status, attendance, payment status, and channel used
7. WHEN a wedding admin filters guests THEN the system SHALL support filtering by RSVP status, attendance, channel, and payment status
8. WHEN a wedding admin exports guest data THEN the system SHALL generate an Excel file with all current data including RSVP and payment status
9. WHEN a wedding admin adds additional admins THEN the system SHALL send invitation emails and grant them access to this wedding only
10. WHEN a wedding admin sets an RSVP cutoff date THEN the system SHALL enforce read-only access for guests after that date

### Requirement 13: Manual Guest Family Management

**User Story:** As a wedding admin, I want to manually add, edit, and delete guest families from the admin interface, so that I can manage my guest list without requiring Excel imports.

#### Acceptance Criteria

1. WHEN a wedding admin clicks "Add Guest" THEN the system SHALL display a form to create a new guest family
2. WHEN creating a new family THEN the system SHALL require family name and allow optional contact information (email, phone, WhatsApp)
3. WHEN creating a new family THEN the system SHALL allow adding multiple family members with name, type (adult/child/infant), and optional age
4. WHEN a new family is created THEN the system SHALL generate a unique magic token and reference code (if automated payment mode)
5. WHEN a wedding admin clicks "Edit" on a guest family THEN the system SHALL display a form with current family and member information
6. WHEN editing a family THEN the system SHALL allow updating family contact information, language preference, and channel preference
7. WHEN editing a family THEN the system SHALL allow adding, editing, or removing family members
8. WHEN editing family members THEN the system SHALL allow updating name, type, age, dietary restrictions, and accessibility needs
9. WHEN a wedding admin clicks "Delete" on a guest family THEN the system SHALL display a confirmation dialog
10. WHEN a family deletion is confirmed THEN the system SHALL remove the family and all associated members, tracking events, and gifts
11. IF a family has submitted an RSVP THEN the system SHALL warn the admin before deletion
12. WHEN a family is deleted THEN the system SHALL create an audit log entry for tracking purposes

### Requirement 4: Magic Link Guest Authentication

**User Story:** As a guest family, I want to access my RSVP page without creating an account, so that I can respond quickly without authentication barriers.

#### Acceptance Criteria

1. WHEN a family's magic token is generated THEN the system SHALL create a unique UUID that remains valid until the wedding date
2. WHEN a family receives a magic link with channel parameter THEN the system SHALL track which channel (whatsapp/email/sms) was used
3. WHEN a family clicks their magic link THEN the system SHALL log the event with channel attribution and grant immediate access
4. WHEN a family accesses their RSVP page THEN the system SHALL display content in their preferred language (from database or URL parameter)
5. WHEN a family changes language via dropdown THEN the system SHALL persist the choice for future visits
6. IF a family loses their link THEN the system SHALL allow wedding admin to resend the same persistent token
7. WHEN a family returns via the same magic link THEN the system SHALL maintain their session without re-authentication

### Requirement 5: Family-Based RSVP Submission

**User Story:** As a guest family, I want to select which family members will attend from a pre-populated list, so that I can accurately confirm attendance for my entire family unit.

#### Acceptance Criteria

1. WHEN a family opens their RSVP page THEN the system SHALL display a personalized welcome with their family name
2. WHEN viewing family members THEN the system SHALL show pre-populated members with types (adult/child/infant) and ages
3. WHEN a family member is selected as attending THEN the system SHALL enable fields for dietary restrictions and accessibility needs
4. IF the wedding allows guest additions AND a family adds a new member THEN the system SHALL flag it with added_by_guest=true and create a tracking event
5. IF the wedding does not allow guest additions THEN the system SHALL hide the "add member" button
6. WHEN a family submits their RSVP THEN the system SHALL save selections and display a clear confirmation message
7. WHEN a family submits their RSVP THEN the system SHALL create a tracking event with event_type='rsvp_submitted' and channel attribution
8. IF the current date is before the RSVP cutoff THEN the system SHALL allow the family to edit their RSVP
9. IF the current date is after the RSVP cutoff THEN the system SHALL display read-only RSVP details with a message to contact the couple directly

### Requirement 6: Payment Information Display

**User Story:** As a guest family, I want to see bank transfer details after submitting my RSVP, so that I can send a gift with proper reference information.

#### Acceptance Criteria

1. WHEN a family completes their RSVP THEN the system SHALL immediately display payment information section
2. IF payment tracking mode is automated THEN the system SHALL display IBAN and unique family reference code with clear instructions
3. IF payment tracking mode is manual THEN the system SHALL display IBAN only with a simple confirmation message
4. WHEN a family returns to their magic link THEN the system SHALL always display payment information below RSVP details
5. WHEN a payment is confirmed (either mode) THEN the system SHALL display "Payment received ✓" status to the family

### Requirement 7: Wedding Admin Activity Tracking

**User Story:** As a wedding admin, I want to see real-time notifications of all guest activities, so that I can monitor RSVP progress and respond promptly.

#### Acceptance Criteria

1. WHEN a guest interacts with the system THEN the system SHALL create a tracking event with type, timestamp, family_id, and wedding_id
2. WHEN a wedding admin views notifications THEN the system SHALL display all events in reverse chronological order with unread badges
3. WHEN a wedding admin filters notifications THEN the system SHALL support date range, event type, family, channel, and read/unread filters
4. WHEN a wedding admin exports filtered notifications THEN the system SHALL generate Excel/CSV with all filtered event details
5. WHEN a tracking event is created THEN the system SHALL store channel attribution for link opens, RSVPs, and payments
6. WHEN a wedding admin marks a notification as read THEN the system SHALL update the read status and timestamp

### Requirement 8: Manual Reminder System

**User Story:** As a wedding admin, I want to manually send reminders to families who haven't responded, so that I can increase RSVP completion rates.

#### Acceptance Criteria

1. WHEN a wedding admin clicks "Send Reminders" THEN the system SHALL identify families with no RSVP response
2. WHEN the reminder preview is shown THEN the system SHALL display the count and list of families who will receive reminders
3. WHEN a wedding admin selects a channel (WhatsApp/Email/SMS) THEN the system SHALL prepare personalized messages with magic links in each family's preferred language
4. WHEN reminders are sent THEN the system SHALL create tracking events with event_type='reminder_sent' and admin_triggered=true
5. WHEN a wedding admin views message history THEN the system SHALL display all sent reminders with timestamps and recipients

### Requirement 9: Multi-Language Support

**User Story:** As a user (admin or guest), I want to use the platform in my preferred language, so that I can understand all content and instructions clearly.

#### Acceptance Criteria

1. WHEN the platform loads for authenticated users THEN the system SHALL check user.preferred_language, fallback to browser language, then platform default (en)
2. WHEN the platform loads for guests THEN the system SHALL check family.preferred_language, URL parameter, wedding.default_language, browser language, then platform default (en)
3. WHEN a user changes their language preference THEN the system SHALL persist it in the database and apply immediately
4. WHEN a wedding admin imports families with language codes THEN the system SHALL validate codes (es/en/fr/it/de) and store preferences
5. WHEN sending communications THEN the system SHALL use each family's preferred language for emails, WhatsApp messages, and SMS
6. IF a translation is missing for a specific language THEN the system SHALL fallback to English
7. WHEN a wedding is created THEN the system SHALL set a default language that becomes the fallback for all guests

### Requirement 10: Theme System

**User Story:** As a wedding planner, I want to create custom themes with colors, fonts, and styles, so that each wedding can have a unique visual identity.

#### Acceptance Criteria

1. WHEN a planner creates a theme THEN the system SHALL require name, description, and allow customization of colors, fonts, button styles, and spacing
2. WHEN a planner saves a theme THEN the system SHALL store configuration in JSONB format in the themes table
3. WHEN the platform initializes THEN the system SHALL provide 5 pre-built system themes available to all planners (Classic Elegance, Garden Romance, Modern Minimal, Rustic Charm, Beach Breeze)
4. WHEN a planner views their theme gallery THEN the system SHALL display all system themes plus themes they created
5. WHEN a planner sets a default theme THEN the system SHALL apply it automatically to new weddings
6. WHEN a wedding admin selects a theme THEN the system SHALL apply it to all guest-facing pages (RSVP, payment, confirmation)
7. IF a planner attempts to delete a theme THEN the system SHALL prevent deletion if any wedding is using it

### Requirement 11: Excel Import/Export with Language Support

**User Story:** As a wedding admin, I want to import my guest list from Excel with language preferences per family, so that I can quickly set up my wedding with proper language support.

#### Acceptance Criteria

1. WHEN a wedding admin downloads the template THEN the system SHALL provide an Excel file with columns: Family Name, Contact Person, Email, Phone, WhatsApp, Language, Member 1-10 Name/Type/Age
2. WHEN a wedding admin uploads an Excel file THEN the system SHALL validate all required fields and flag errors before import
3. WHEN importing families THEN the system SHALL validate language codes (es/en/fr/it/de) and use wedding default for invalid/empty values
4. WHEN import preview is shown THEN the system SHALL display summary statistics including language distribution
5. IF there are duplicate emails or phones THEN the system SHALL flag them but allow the admin to proceed or cancel
6. WHEN import succeeds THEN the system SHALL create families, family_members, and generate magic tokens and reference codes (if automated mode)
7. WHEN a wedding admin exports guest data THEN the system SHALL include all current RSVP details, attendance, dietary info, and payment status

### Requirement 12: Guest Addition Review (Conditional)

**User Story:** As a wedding admin, I want to review and approve family members added by guests, so that I can verify unexpected additions before finalizing counts.

#### Acceptance Criteria

1. IF allow_guest_additions is enabled for the wedding THEN guests SHALL see an "add member" button on RSVP forms
2. WHEN a guest adds a family member THEN the system SHALL set added_by_guest=true and create event_type='guest_added'
3. WHEN a wedding admin views the guest additions section THEN the system SHALL display all flagged members with "NEW" badges
4. WHEN a wedding admin views a guest addition THEN the system SHALL show who added them, when, and relationship
5. WHEN a wedding admin reviews additions THEN the system SHALL allow editing member details or contacting the family
6. IF allow_guest_additions is disabled THEN the system SHALL hide all guest addition UI and functionality

## Non-Functional Requirements

### Code Architecture and Modularity

- **Multi-Tenancy**: All database queries must filter by wedding_id to ensure complete data isolation between weddings
- **Single Responsibility Principle**: Each route handler, component, and service function should have a single, well-defined purpose
- **Modular Design**: Authentication, database, email, and tracking should be separate, reusable modules
- **Clear Interfaces**: Define TypeScript interfaces for all entities (User, Wedding, Family, TrackingEvent, etc.)
- **Dependency Management**: Minimize interdependencies; use dependency injection where appropriate

### Performance

- **Page Load Time**: Guest RSVP pages must load within 2 seconds on 3G mobile connections
- **Database Queries**: All list views must use pagination (50 items per page)
- **Caching**: Static translations and theme configurations should be cached in-memory
- **Excel Import**: Must handle up to 500 families in under 10 seconds

### Security

- **Magic Token Security**: Tokens must be cryptographically secure UUIDs (v4) with no predictable patterns
- **OAuth Security**: All OAuth implementations must use state parameters to prevent CSRF attacks
- **Multi-Tenancy Security**: Database middleware must enforce wedding_id filtering on all queries
- **Master Admin Access**: Email verification against config file must happen on every login (no session caching)
- **HTTPS Only**: All production traffic must use SSL/TLS (Let's Encrypt)

### Reliability

- **Token Persistence**: Magic links must remain valid until the wedding date (no expiration)
- **Data Integrity**: Excel imports must be atomic (all-or-nothing transactions)
- **Error Logging**: All critical errors must be logged with context (user_id, wedding_id, timestamp)
- **Database Backups**: Daily automated backups with 30-day retention

### Usability

- **Mobile-First Design**: All interfaces must be optimized for mobile devices (touch targets ≥44px)
- **WhatsApp In-App Browser**: Guest pages must work perfectly in WhatsApp's embedded browser
- **Elderly-Friendly**: Large text (minimum 16px), high contrast, clear visual feedback for all actions
- **Language Support**: All UI elements and communications must support Spanish, English, French, Italian, and German
- **Minimal Scrolling**: Key actions should be visible without scrolling on mobile devices
- **Clear Feedback**: All form submissions must show immediate confirmation or error messages

### Internationalization (i18n)

- **Static UI Translations**: Stored in JSON files at /locales/{language}/common.json
- **Dynamic Content**: Email templates and custom messages stored in translations database table
- **Language Detection**: User preference → URL parameter → Browser language → Wedding default → Platform default (en)
- **Translation Fallback**: Missing translations must fallback to English gracefully
- **RTL Support**: Not required for MVP (all target languages are LTR)
