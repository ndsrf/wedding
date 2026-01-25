# Wedding Management App - Product Requirements Document

**Target Market:** Wedding planners who serve multiple couples  
**End Users:** Spanish families attending weddings managed by planners  
**Business Model:** SaaS - Wedding planners pay monthly, grant access to their clients (couples)

---

## Product Vision

A multi-tenant wedding management platform where wedding planners can create and manage multiple weddings for their clients. Each wedding operates independently with family-centric RSVP, payment tracking, and guest management. Planners pay a monthly subscription and grant free access to couples getting married.

### User Hierarchy
```
Master Admin (config file)
  └── Wedding Planner (subscribes monthly)
       └── Wedding Admin (couple - free access granted by planner)
            └── Guest Families (magic link access)
```

---

## Access Levels & Features

### 1. Master Admin (Platform Owner)
**Authentication:** Email configured in application config file (signs in with any OAuth provider)  
**Access:** Full platform control

**Capabilities:**
- View all wedding planners on the platform
- Add new wedding planner accounts
  - Name (business name)
  - Logo (uploaded image)
  - Contact email
  - Enable/Disable toggle
- Enable or disable planner access (toggle)
- View all weddings across all planners (read-only)
- Platform-wide analytics
- Cannot manage individual weddings (that's planner/wedding admin responsibility)

**Planner Management Interface:**
- List of all planners with status (Active/Disabled)
- Add planner button → Form with name, logo, email
- Enable/Disable toggle per planner
- See number of weddings per planner
- See last login per planner

---

### 2. Wedding Planner (Paying Customer)
**Authentication:** OAuth (Google, Meta/Facebook, Apple, Microsoft)  
**Subscription:** Monthly fee (payment outside app scope for MVP)  
**Access:** Manage multiple weddings for different clients

**Capabilities:**
- Create new wedding
  - Couple names
  - Wedding date, time, location
  - RSVP cutoff date
  - Initial wedding details
- View all their weddings (list view)
- Select a wedding to manage
- Add wedding admins (couples) to each wedding via email
  - Invite couple with Google sign-in link
  - Grant admin access to specific wedding only
- Remove wedding admins (except cannot remove all admins)
- Archive/close completed weddings
- View high-level stats across all weddings
  - Total active weddings
  - Total RSVPs this month
  - Total guests across all weddings

**Wedding List View:**
- All weddings managed by this planner
- Quick stats per wedding: Date, # guests, # RSVPs, RSVP completion %
- Status indicators: Upcoming, Active, Past
- Search/filter weddings

**Cannot Do:**
- Direct guest management (that's wedding admin role)
- Send invitations (wedding admin role)
- Edit guest RSVPs (wedding admin role)

### Theme Gallery Management
Wedding planners can create and manage themes that their clients (wedding admins) can choose from.

**Theme Creation**
- Create new theme with name and description
- Customize visual elements:
  - Primary color scheme
  - Secondary accent colors
  - Font families (headings and body)
  - Button styles
  - Background patterns or images
  - Card/section layouts
  - Spacing and padding presets
- Upload logo/banner image for theme
- Preview theme in real-time

**Theme Management**
- View all themes created by this planner
- Edit existing themes
- Duplicate themes (create variations)
- Set default theme for new weddings
- Delete themes (only if not used by any wedding)

**Theme Assignment**
- Each wedding can select one theme
- Wedding admins choose from their planner's theme gallery
- Changes to theme affect all pages (RSVP, payment info, confirmation)

**Pre-built Themes**
Platform includes default themes:
- Classic Elegance (neutral, formal)
- Garden Romance (florals, pastels)
- Modern Minimal (clean, contemporary)
- Rustic Charm (warm, earthy)
- Beach Breeze (light, airy)
- Garden Birds (botanical, enchanting)

Planners can customize these defaults or create entirely new themes.

---

### 3. Wedding Admin (Couple - Free Access)
**Authentication:** OAuth (Google, Meta/Facebook, Apple, Microsoft) - invited by planner  
**Access:** Single wedding only (the one they're granted access to)  
**Cost:** Free (granted by wedding planner)

**Capabilities:** All features described in "Wedding Admin Panel" section below.

---

### 4. Guest Families (Magic Link Access)
**Authentication:** Persistent magic link (no login required)  
**Access:** Their family's RSVP page only

**Capabilities:** All features described in "Guest Family User Flows" section below.

---

## Guest Family User Flows

**Context:** These are the user-facing flows for families receiving wedding invitations

### 1. Family Receives Invitation
- Family receives a personalized magic link via their preferred channel (WhatsApp, email, or SMS)
- Link contains unique token + channel parameter for tracking
- Link remains valid until the wedding date (no expiry)
- Same link works across all channels

### 2. RSVP Submission
- Family opens link → sees personalized welcome with their family name
- Selects which family members will attend from pre-populated list
- Can add new members if someone was forgotten (clearly highlighted for couple review)
- Provides dietary restrictions, accessibility needs, children's ages
- Submits RSVP → receives clear confirmation

### 3. Payment Information Access
- After RSVP, family sees bank transfer details:
  - Wedding account IBAN
  - Unique family reference code (for payment matching)
  - Clear instructions for including reference in transfer description
- Payment status updates automatically when gift is received and matched

### 4. Return Visits
- Family can return anytime using same magic link
- **Before cutoff date**:
  - Can view/edit RSVP
  - Check payment status
  - Add additional family members if needed
- **After cutoff date**:
  - Can view their RSVP details (read-only)
  - Cannot edit - see message: "RSVP period has closed. Contact us directly to make changes"
  - Payment information still visible

---

## Multi-Language Support

### Supported Languages
- 🇪🇸 **Spanish (es)** - Primary language for Spanish market
- 🇬🇧 **English (en)** - International standard
- 🇫🇷 **French (fr)** - European guests
- 🇮🇹 **Italian (it)** - European guests  
- 🇩🇪 **German (de)** - European guests

### Language Preferences by User Type

**Master Admin:**
- Sets preferred language in config file or profile
- Admin interface shown in preferred language
- Default: English

**Wedding Planners:**
- Choose language on first login
- Can change in profile settings
- Admin panel shown in their preferred language
- Default: English

**Wedding Admins (Couples):**
- Choose language on first login or inherit from planner invitation
- Can change in profile settings
- Admin panel shown in their preferred language
- Email templates use their language
- Default: Wedding's default language or English

**Guests (Families):**
- Wedding admin sets default language per family in Excel import (column: "Language")
- Guests can switch language using dropdown on RSVP page
- Magic link remembers language choice across sessions
- Email/WhatsApp invitations sent in family's preferred language
- Default: Wedding's default language

**Wedding Configuration:**
- Each wedding has a default language (set by planner when creating wedding)
- This becomes the fallback for all guests unless overridden per family

### Language Detection Flow
```javascript
// For authenticated users (admins/planners)
1. Check user.preferred_language
2. If null, detect browser language
3. If unsupported, use platform default (en)

// For guests (magic link)
1. Check family.preferred_language
2. Check URL parameter ?lang=es
3. Check wedding.default_language  
4. If all null, detect browser language
5. If unsupported, use platform default (en)

// Save choice
- Store in database for future visits
- Cookie/localStorage as backup
```

### Translation Management

**Static UI Translations** (buttons, labels, headers):
- Stored in JSON files: `/locales/{language}/common.json`
- Managed by developers
- Examples: "Submit", "Cancel", "RSVP", "Payment Received"

**Dynamic Content Translations** (email templates, custom messages):
- Stored in `translations` database table
- Wedding admins can customize per language
- Examples: Invitation text, confirmation message, thank you note
- Fallback to default English if translation missing

**Translation Keys Structure:**
```json
{
  "auth": {
    "login": "Sign In",
    "logout": "Sign Out",
    "choose_provider": "Choose login method",
    "last_used": "Last used: {provider}"
  },
  "rsvp": {
    "title": "RSVP for {weddingNames}",
    "submit": "Submit RSVP",
    "family_name": "Family {name}",
    "attending": "Will attend",
    "not_attending": "Cannot attend"
  },
  "payment": {
    "title": "Gift Information",
    "bank_details": "Bank Transfer Details",
    "reference_code": "Reference Code",
    "reference_instructions": "Please include this reference in your transfer"
  }
}
```

### Excel Import Language Support
Wedding admins can specify language per family in Excel:
```
Column: Language
Values: es, en, fr, it, de
Default: Wedding's default language
```

When importing:
1. Validate language codes
2. Store in families.preferred_language
3. Use for all communications with that family

### Email/WhatsApp Templates
All communication templates must be translated:
- Invitation email/WhatsApp message
- RSVP confirmation
- Reminder messages
- Payment confirmation
- Thank you message

Wedding admins see template editor with language tabs:
```
[ES] [EN] [FR] [IT] [DE]

Content in Spanish...
```

---

## Key Features

### Magic Link System
- **Persistent tokens**: Links never expire (valid until wedding day)
- **Channel tracking**: URL includes `?channel=whatsapp|email|sms` parameter
- **Universal access**: Same token works across all channels
- **Security**: Unique UUID per family, no predictable patterns

### Family Management
- **Family-based invitations**: One invitation per family unit, not per person
- **Flexible attendance**: Select who's coming from family members list
- **Guest additions**: Allow families to add forgotten members
  - Clearly flagged in couple's dashboard with "NEW" badge
  - Includes who added them and when
- **Member types**: Adults, children (with ages), infants

### Payment Tracking
- **Zero-fee bank transfers**: Direct to couple's Spanish bank account
- **Two modes** (configured per wedding):
  - **Automated mode**: 
    - Generate unique reference codes per family (e.g., "FAMILIA-GARCIA-2026")
    - GoCardless Bank Account Data API auto-matches transfers
    - Manual override available for unmatched payments
  - **Manual mode**:
    - No reference codes needed
    - Wedding admins manually record all payments
    - Simpler for guests, more work for admins
- **Status visibility**: Families see "Payment received ✓" when confirmed (both modes)

### Engagement Tracking
- **Comprehensive event log**: Track every interaction per family
  - Link opened (with channel source)
  - RSVP started/completed/updated
  - Payment sent/received/confirmed
  - Return visits
  - Reminders sent (admin-triggered)
- **Channel attribution**: Know which channel (email/WhatsApp/SMS) drove each action
- **Dashboard metrics**: Open rates, response rates, pending RSVPs by channel
- **Filterable notifications**: 
  - Date range filtering (e.g., "show updates Jan 1-15")
  - Event type filtering (e.g., "only RSVP changes")
  - Export filtered results to Excel

### Communication Controls
- **Manual reminders**: Admin triggers reminders via button (not automatic)
  - Select which families to remind
  - Choose channel (WhatsApp/Email/SMS)
  - Preview before sending
  - Logged in tracking system

---

## Technical Stack (Minimal Spec)

### Backend
- **Database**: PostgreSQL (self-hosted)
- **Runtime**: Node.js with Express or Next.js API routes
- **Guest Authentication**: Magic token-based (no passwords, no OAuth complexity)
- **Admin Authentication**: Google OAuth 2.0 (master admin in config, planners and wedding admins via OAuth)
- **Architecture**: Multi-tenant (data isolated per wedding)
- **Internationalization**: i18next or next-intl for translations
  - Supported languages: Spanish (es), English (en), French (fr), Italian (it), German (de)
  - Language detection: User preference → Browser language → Wedding default → Platform default (en)
  - Translation storage: Database table for dynamic content, JSON files for static UI

### Core Tables
```
master_admin
├── id (singleton - configured in app config)
├── email (from config file)
├── preferred_language (es/en/fr/it/de - default from config)
└── created_at

wedding_planners
├── id, email, name (business name), google_id
├── auth_provider (google/facebook/instagram/apple/microsoft)
├── last_login_provider (tracks most recent OAuth provider used)
├── preferred_language (es/en/fr/it/de - default: en)
├── logo_url
├── enabled (boolean - toggle by master admin)
├── subscription_status (active/inactive - for future billing)
├── created_at, created_by (master_admin_id)
└── last_login_at

themes
├── id, planner_id (references wedding_planners)
├── name, description
├── is_default (boolean - planner's default)
├── is_system_theme (boolean - pre-built themes available to all)
├── config (JSONB - stores all theme settings)
│   ├── colors: { primary, secondary, accent, background, text }
│   ├── fonts: { heading, body }
│   ├── styles: { buttonRadius, cardShadow, spacing }
│   └── images: { logo, banner, background }
├── preview_image_url
├── created_at, updated_at
└── used_by_weddings_count (computed)

weddings
├── id, planner_id (references wedding_planners)
├── theme_id (references themes)
├── couple_names, wedding_date, wedding_time, location
├── rsvp_cutoff_date (after this, no web edits allowed)
├── dress_code, additional_info
├── payment_tracking_mode (automated/manual)
├── allow_guest_additions (boolean)
├── default_language (es/en/fr/it/de - default for guest invitations)
├── status (active/archived/completed)
├── created_at, created_by (planner_id)
└── updated_at, updated_by

wedding_admins
├── id, email, name, google_id
├── auth_provider (google/facebook/instagram/apple/microsoft)
├── last_login_provider (tracks most recent OAuth provider used)
├── preferred_language (es/en/fr/it/de)
├── wedding_id (references weddings - scoped to one wedding only)
├── invited_by (planner_id or another wedding_admin_id)
├── invited_at, accepted_at
├── last_login_at
└── created_at

families
├── id, wedding_id (references weddings - critical for multi-tenancy)
├── name, email, phone, whatsapp_number
├── magic_token (unique, persistent)
├── reference_code (for payment matching - only if automated mode)
├── channel_preference
├── preferred_language (es/en/fr/it/de - default from wedding)
└── created_at

family_members
├── id, family_id (references families)
├── name, type (adult/child/infant)
├── attending (null/true/false)
├── age, dietary_restrictions, accessibility_needs
├── added_by_guest (boolean - flags if guest added this person)
└── created_at

tracking_events
├── id, family_id (references families)
├── event_type, channel, timestamp
├── metadata (JSONB for flexible data)
├── admin_triggered (boolean - for manual reminders)
└── wedding_id (for easier querying)

gifts
├── id, family_id (references families)
├── wedding_id (for easier querying)
├── amount, reference_code_used (null if manual mode)
├── auto_matched (boolean - false if manual mode)
├── status
├── transaction_date
└── created_at

notifications
├── id, wedding_id (references weddings)
├── family_id (references families)
├── event_type, channel, timestamp
├── details (JSONB)
├── read (boolean), read_at
├── admin_id (wedding_admin who should see this)
└── created_at

translations
├── id
├── key (translation key, e.g., 'rsvp.submit_button')
├── language (es/en/fr/it/de)
├── value (translated text)
├── context (admin/guest/planner - for organizing)
└── updated_at
```

**Multi-Tenancy Notes:**
- Every wedding operates independently
- `wedding_id` on families/events ensures data isolation
- Wedding admins can only access their assigned wedding
- Planners can access all their weddings
- Master admin can see all planners and weddings (read-only)

### Master Admin Configuration
**Config File Example (`config/master-admin.json`):**
```json
{
  "masterAdmin": {
    "email": "admin@yourdomain.com",
    "name": "Platform Administrator"
  },
  "platform": {
    "name": "Wedding Management Platform",
    "domain": "weddingapp.es"
  }
}
```

**Authentication Flow:**
- Master admin navigates to `/admin/master`
- Signs in with Google OAuth
- System checks if Google email matches config file email
- If match → grant master admin access
- If no match → deny access

**First-Time Setup:**
1. Configure master admin email in config file
2. Deploy application
3. Master admin signs in with Google
4. Add first wedding planner
5. Planner creates first wedding
6. Planner invites wedding admins (couple)

### Integrations
- **OAuth Providers**:
  - **Google OAuth 2.0**: Full sign-in support (most popular, reliable)
  - **Meta/Facebook OAuth**: Full sign-in support (large user base in Spain)
  - **Instagram OAuth**: Uses Meta/Facebook OAuth (Instagram is owned by Meta, shares OAuth system)
  - **Apple Sign In**: Full support with privacy relay (iOS users)
  - **Microsoft OAuth**: For Outlook/Office users (less critical for wedding context)
  
**OAuth Provider Notes:**
- Instagram login actually redirects to Facebook OAuth (same system, different branding)
- Apple Sign In is mandatory if app goes to iOS App Store
- Google + Facebook/Instagram + Apple covers ~95% of users
- Microsoft can be added later if business users request it
- **Recommendation**: Start with Google + Meta/Facebook + Apple for MVP

- **GoCardless Bank Account Data API**: Poll transactions, match reference codes (only in automated mode)
- **Email**: Resend or similar (SMTP)
- **WhatsApp**: Cloud API (optional, for sending)
- **SMS**: Backup channel (Plivo/Twilio)

### Hosting
- **Self-hosted**: Hetzner VPS or similar (no Supabase, no Vercel)
- **SSL**: Let's Encrypt (free)
- **Domain**: Custom domain required

---

## User Experience Requirements

### Mobile-First Design
- Works perfectly in WhatsApp in-app browser
- Large touch targets (elderly-friendly)
- Minimal scrolling
- Clear visual feedback for all actions

### Language
- Primary: Spanish
- Optional: English (based on family preference)

### Accessibility
- Large text support
- High contrast mode
- Screen reader compatible
- Simple, linear flow

---

This is the detailed admin panel described in the original requirements.

**Capabilities:**
All features described in "Wedding Admin Panel" section below.

---

### 4. Guest Families (Magic Link Access)
**Authentication:** Persistent magic link (no login required)  
**Access:** Their family's RSVP page only

## Wedding Admin Panel Features

**Context:** These features are for wedding admins (couples) managing their specific wedding

### Authentication & Access Control
- **Login**: OAuth providers (Google, Meta/Facebook, Instagram, Apple, Microsoft)
- **Login provider reminder**: System remembers which provider user last used
  - On login page, highlight last used provider with badge: "Last used ✓"
  - Helps prevent confusion and failed login attempts
  - Stored in `last_login_provider` field, updated on each successful login
  - Example: If user logged in with Google last time, "Sign in with Google ✓" button is highlighted
- **Invited by planner**: Planner sends invitation email with sign-in link
- **Provider choice**: Admin chooses which OAuth provider to use when signing in
- **Email matching**: System matches OAuth email to invited email address
- **Language preference**: User sets preferred language on first login or in profile settings
- **Access scope**: Can only see/manage the wedding they were granted access to
- **Multiple admins per wedding**: Planner can add both partners as separate admins
- **Invite others**: Wedding admin can invite additional admins (e.g., maid of honor, best man)
  - Enter email address
  - Send invitation email with sign-in link
  - Invited person chooses OAuth provider and gets access to this wedding only
- **Admin list**: View all admins for this wedding
  - See who invited whom
  - See which OAuth provider each admin uses (and last used)
  - See preferred language
  - Remove admin access
  - See last login timestamp
  - Cannot remove all admins (must have at least one)

### Wedding Configuration
- **Set wedding details**: Date, time, location, dress code, etc.
- **RSVP cutoff date**: After this date, guests cannot edit RSVP via website
  - Must contact couple directly for changes
  - System shows "RSVP period closed, contact us to update" message
- **Payment tracking mode**: Toggle between automated or manual
  - **Automated**: Generate unique reference codes per family, use GoCardless API to auto-match bank transfers
  - **Manual**: No reference codes, wedding admins manually assign all payments
- **Guest additions**: Toggle whether guests can add forgotten family members
  - **Enabled**: Guests see "¿Falta alguien? Añade aquí" button, can add members (flagged for admin review)
  - **Disabled**: No option to add members, guests can only RSVP for pre-populated family members
- **Theme selection**: Choose from theme gallery (see Theme Gallery section)
- **Template customization**: Edit invitation text, confirmation messages, email templates

### Guest Management

**Import/Export**
- **Excel import**: Upload spreadsheet with initial guest list
  - Provide downloadable Excel template with required columns
  - Columns: Family Name, Contact Person, Email, Phone, WhatsApp, Language, Family Members (names, ages)
  - Import creates families + family_members in database
  - Validation: flag duplicates, missing required fields
- **Edit existing list**: Add, remove, or modify families and members manually
- **Export**: Download current guest list to Excel
  - Include RSVP status, attendance, dietary info, payment status

**Guest Overview Dashboard**
- All families with current status
- Quick filters:
  - RSVP status: Responded / Not responded / Pending
  - Attendance: Coming / Not coming / Unknown
  - Channel used: WhatsApp / Email / SMS
  - Payment status: Paid / Unpaid
  - Guest additions: Show only families who added members
- Summary metrics:
  - Total invited families
  - Total people: adults, children, infants
  - Total attending vs. not attending
  - RSVP completion rate
  - Outstanding responses

### Manual Communication Controls

**RSVP Reminders** (Not Automatic)
- **"Send Reminders" button**: Admin manually triggers reminder
- System identifies families who haven't responded
- Preview: Shows list of families who will receive reminder
- Select channel: WhatsApp, Email, SMS, or All
- Confirm and send
- Log reminder sent in tracking events

**Message History**
- See all sent reminders with timestamps
- Track who received what and when

### Activity Notifications & Filtering

**Notification Feed**
- Real-time activity log of all guest interactions
- Event types:
  - RSVP submitted/updated
  - Guest added by family
  - Payment received
  - Link opened
  - Reminder sent
  
**Advanced Filtering**
- **Date range**: Show events between specific dates
  - Example: "Show RSVP updates from Jan 1-15"
- **Event type**: Filter by specific actions
  - RSVP changes only
  - Payment events only
  - Guest additions only
- **Family**: Filter by specific family
- **Channel**: Filter by communication channel
- **Unread only**: See new notifications since last check

**Export Filtered Results**
- Export any filtered view to Excel/CSV
- Includes: Date, Family, Event Type, Details, Channel
- Use case: "Export all RSVP changes from last week for review"

### Payment Management
- Auto-matched gifts (green checkmark)
- Unmatched payments (require manual review)
- Manual assignment interface
- Total gifts received vs. expected
- Pending thank-you tracking

### Guest Additions Review
- Dedicated section for families who added members
- Shows: Who added whom, when, relationship
- Admin can: Approve, edit details, or contact family for clarification
- Clear "NEW" badges until reviewed

---

## Excel Import Template

### Required Columns
The Excel template for importing guests must include:

| Column Name | Description | Example | Required |
|-------------|-------------|---------|----------|
| Family Name | Name of the family unit | "Familia García" | Yes |
| Contact Person | Primary contact | "Juan García" | Yes |
| Email | Primary email | "juan@example.com" | No |
| Phone | Phone number | "+34612345678" | No |
| WhatsApp | WhatsApp number (may be same as phone) | "+34612345678" | No |
| Language | Preferred language (es/en/fr/it/de) | "es" | No (default: wedding's default language) |
| Member 1 Name | First family member | "Juan García" | Yes |
| Member 1 Type | adult/child/infant | "adult" | Yes |
| Member 1 Age | Age (required for children/infants) | "35" | No |
| Member 2 Name | Second family member | "María García" | No |
| Member 2 Type | adult/child/infant | "adult" | No |
| Member 2 Age | Age (required for children/infants) | "33" | No |
| ... | Up to 10 members per family | | No |

### Import Behavior
- **Create families**: Each row creates one family
- **Generate tokens**: Automatically create magic_token and reference_code (if automated payment mode)
- **Language handling**: Default to wedding's default language if column empty or invalid
- **Validation**: 
  - Flag duplicate emails/phones
  - Require at least one family member
  - Validate member types (adult/child/infant)
  - Require ages for children/infants
  - Validate language codes (must be: es, en, fr, it, or de)
  - Flag invalid language codes but don't fail import (use default instead)
- **Error handling**: Import fails with clear error messages, no partial imports
- **Preview**: Show import summary before confirming (with language distribution stats)

### Example Template Data
```
Family Name: Familia García
Contact: Juan García  
Email: juan@example.com
Phone: +34612345678
Language: es
Member 1: Juan García, adult
Member 2: María García, adult
Member 3: Pablo García, child, age 8
```

**Multi-language example:**
```
Row 1: Familia García, Language: es (Spanish family)
Row 2: The Johnsons, Language: en (English-speaking family)
Row 3: Famille Dubois, Language: fr (French family)
Row 4: Familie Schmidt, Language: de (German family)
Row 5: Famiglia Rossi, Language: it (Italian family)
```

---

## Critical Implementation Details

### Magic Link Format
```
https://yourdomain.com/rsvp/{magic_token}?channel={source}&lang={language}

Example:
https://boda2026.es/rsvp/a1b2c3d4-5678-90ef-ghij-klmnopqrstuv?channel=whatsapp&lang=es
```

Optional `lang` parameter sets initial language (overridden by family preference if exists).

### Login Provider Reminder

**Purpose**: Help users remember which OAuth provider they used last time to avoid failed login attempts.

**Implementation:**
```javascript
// On login page load
const user = await checkUserByEmail(email); // from invitation or cookie

if (user && user.last_login_provider) {
  // Highlight the button for last used provider
  highlightProvider(user.last_login_provider);
  showBadge(user.last_login_provider, "Last used ✓");
}

// On successful login
await updateUser({
  last_login_provider: currentProvider, // 'google', 'facebook', 'apple', etc.
  last_login_at: new Date()
});
```

**UI/UX:**
```html
<!-- Login page -->
<div class="login-providers">
  <button class="provider-btn highlighted">
    <img src="google-icon.png" />
    Sign in with Google
    <span class="badge">Last used ✓</span>
  </button>
  
  <button class="provider-btn">
    <img src="facebook-icon.png" />
    Sign in with Facebook
  </button>
  
  <button class="provider-btn">
    <img src="apple-icon.png" />
    Sign in with Apple
  </button>
</div>

<p class="hint">Tip: We've highlighted the login method you used last time</p>
```

**Storage:**
- Store in `last_login_provider` field in database
- Also store in cookie/localStorage as backup for faster load
- Update on every successful login
- Never expires (always shows last used, even months later)

### Channel Tracking
- Log channel parameter on first access
- Store in `tracking_events` with `event_type='link_opened'`
- Associate all subsequent actions with that channel attribution

### Guest Addition Flow
**Only applies if wedding config has `allow_guest_additions = true`**

When family adds a forgotten member:
1. Check wedding config: if `allow_guest_additions = false`, button is hidden
2. Show form: "¿Falta alguien? Añade aquí"
3. Capture: name, age (if child), relationship
4. Flag with `added_by_guest=true`
5. Create `tracking_event` with `event_type='guest_added'`
6. Highlight in admin dashboard: "⚠️ NEW: Added by family"

If `allow_guest_additions = false`:
- No "add member" button shown on RSVP form
- Guests can only RSVP for pre-populated family members
- Cleaner admin experience if guest list is finalized

### Admin Notification System

**Notification Feed**
- Real-time list of all guest activities
- Each notification shows: timestamp, family name, event type, details
- Mark as read/unread
- Badge counter for unread notifications

**Filter Options**
```
Date Range: [Start Date] to [End Date]
Event Type: All / RSVP Updates / Guest Additions / Payments / Link Opens
Family: [Dropdown of all families]
Channel: All / WhatsApp / Email / SMS
Status: All / Unread Only
```

**Export Functionality**
- Export button on filtered results
- Formats: Excel (.xlsx), CSV
- Exported columns:
  - Date & Time
  - Family Name
  - Event Type
  - Details (e.g., "Changed attendance from 3 to 4 guests")
  - Channel Used
  - Previous Value (for updates)
  - New Value (for updates)
- Use cases:
  - "Export all RSVP changes from last week"
  - "Export all guest additions for review"
  - "Export payment activity for reconciliation"

**Example Filtered Export**
```
Filter: Event Type = "RSVP Updates", Date Range = Jan 1-15, 2026
Results: 12 families made changes
Export → rsvp-updates-jan1-15.xlsx

Contents:
Jan 2, 10:30 | Familia García | RSVP Updated | Changed from 3 attending to 4 attending | WhatsApp
Jan 3, 14:20 | Familia López | RSVP Updated | Changed dietary: Added "vegetarian" | Email
...
```

### RSVP Cutoff Enforcement
```javascript
// On any RSVP edit attempt
if (currentDate > wedding_config.rsvp_cutoff_date) {
  return {
    allowed: false,
    message: "El período de confirmación ha finalizado. Por favor contáctanos directamente para hacer cambios."
  }
}
// Allow view-only access after cutoff
```

### Manual Reminder Flow
```javascript
// Admin clicks "Send Reminders"
1. Query families where last_rsvp_event = null
2. Show preview: "15 families haven't responded"
3. Admin selects channel: WhatsApp / Email / SMS / All
4. Confirm → send personalized reminder with magic link
5. Log event: event_type='reminder_sent', admin_triggered=true
6. Update notification feed
```

### Payment Matching Logic

**Automated Mode** (if `wedding.payment_tracking_mode = 'automated'`):
```javascript
// Generate unique reference_code for each family on creation
family.reference_code = `FAMILIA-${shortHash(family.id)}-${year}`
// Example: "FAMILIA-ABC123-2026"

// Poll GoCardless API every 6 hours
// For each transaction:
1. Extract reference from transaction description
2. Match to family.reference_code
3. If match → auto-assign gift, set auto_matched=true
4. If no match → flag for manual review
5. Update family payment status
6. Create tracking event
```

**Manual Mode** (if `wedding.payment_tracking_mode = 'manual'`):
```javascript
// No reference codes generated
family.reference_code = null

// Wedding admin workflow:
1. Admin views bank account manually
2. Sees incoming transfer: €100 from "Juan García"
3. Opens admin panel → "Add Payment" form
4. Selects family from dropdown
5. Enters: amount, date, sender name
6. Saves → gift recorded with auto_matched=false
7. Family sees payment confirmed
```

**Payment Display to Guests:**
- **Automated mode**: Show IBAN + reference code, explain importance of including reference
- **Manual mode**: Show IBAN only, simple message "we'll confirm when received"

---

## Success Metrics

- **RSVP completion**: >90% within 2 weeks of first reminder
- **Admin efficiency**: <5 minutes to import full guest list via Excel
- **Payment matching**: >70% auto-matched
- **Guest additions**: <5% of total guests (most families remembered correctly)
- **Link functionality**: 100% families can access link until wedding
- **Channel tracking**: 100% accuracy on attribution
- **Notification filtering**: Admin can find specific events in <30 seconds
- **Export reliability**: All filtered exports complete successfully
- **Cutoff enforcement**: 0% unauthorized edits after RSVP cutoff date

---

---

## Development Priority

### Phase 1: Platform Foundation
1. **Master admin setup** (config-based authentication)
2. **Multi-tenant database schema** (planners, weddings, themes, translations, isolation)
3. **OAuth providers setup** (Google, Meta/Facebook, Apple)
4. **Internationalization infrastructure** (i18next, translation tables, language detection)
5. **Master admin interface** (add/manage planners, enable/disable, language preference)

### Phase 2: Wedding Planner Features
6. **Planner authentication** (multi-provider OAuth with last-used provider indicator)
7. **Language preference system** (choose language, store preference, apply to interface)
8. **Planner dashboard** (wedding list, create wedding, stats - all translated)
9. **Theme system** (create/edit themes, theme gallery)
10. **Pre-built themes** (5 default themes: Classic, Garden, Modern, Rustic, Beach)
11. **Wedding creation** (set couple names, date, location, cutoff, payment mode, guest additions, default language)
12. **Invite wedding admins** (email invitation system with language selection)

### Phase 3: Wedding Admin Features
13. **Wedding admin authentication** (multi-provider OAuth with last-used provider indicator, language preference)
14. **Wedding configuration** (edit details, RSVP cutoff, payment mode, guest additions, default language, theme selection)
15. **Excel import/export with language** (guest list template includes language column)
16. **Guest overview dashboard** (filters, metrics, status - translated)
17. **Manual admin invitation** (wedding admins invite additional admins)
18. **Multi-language email templates** (edit templates in all 5 languages)

### Phase 4: Guest Experience  
19. **Theme rendering** (apply selected theme to guest pages)
20. **Multi-language guest pages** (RSVP, payment, confirmation in family's preferred language)
21. **Language switcher** (dropdown on guest pages, saves preference)
22. **Magic link + family RSVP** (core flow with cutoff date enforcement, translated)
23. **Channel tracking** (all link opens and interactions)
24. **Guest addition capability** (with toggle + clear flagging, translated)
25. **Payment information display** (IBAN + optional reference code, translated instructions)

### Phase 5: Admin Operations
26. **Admin notification feed** (filterable, exportable activity log, translated)
27. **Manual reminder system** (button to send to non-responders, multi-language support)
28. **Guest additions review** (approve/edit new members - if toggle enabled)
29. **Export filtered data** (Excel/CSV for any filtered view)

### Phase 6: Payment Integration
30. **Payment mode configuration** (automated vs manual in wedding settings)
31. **Automated mode**: GoCardless integration (Bank Account Data API, reference code generation)
32. **Automated mode**: Payment matching (auto-match via reference codes)
33. **Manual mode**: Payment entry form (admin manually records payments)
34. **Payment status updates** (visible to families in both modes, translated)

### Phase 7: Seating & Logistics
35. **Seating chart management**
    - Create tables (names, capacity, type: adults/children/mixed/VIP)
    - Assign family members to tables
    - Visual seating chart editor (drag & drop)
    - Kids tables logic (separate from family tables)
    - High chair tracking for infants
    - Print-ready seating cards
    - Export seating assignments to PDF/Excel

36. **Dietary restrictions & accessibility**
    - Meal choices (meat/fish/vegetarian/vegan/child menu)
    - Dietary restrictions per guest
    - Accessibility needs tracking
    - Generate catering summary (counts per meal type)
    - Export for venue/caterer

### Phase 8: Task Management
37. **Google Tasks integration**
    - OAuth connection to Google Tasks API
    - Pre-wedding checklist templates (standard wedding timeline)
    - Shared task lists between wedding admins
    - Automatic deadline reminders
    - Integration with calendar for vendor appointments
    - Task status dashboard
    - Custom task creation

### Phase 9: Photo Management
38. **Google Photos integration**
    - OAuth connection to Google Photos API
    - Create shared wedding album
    - Guest upload interface (select photos from device)
    - QR code at wedding for instant album access
    - Live photo slideshow during reception
    - Face detection grouping (Google Photos feature)
    - Download all photos as ZIP post-wedding
    - Guest photo count leaderboard
    - Album sharing settings

### Phase 10: Music & Entertainment
39. **Spotify playlist integration**
    - OAuth connection to Spotify API
    - Guests suggest songs for reception
    - Collaborative playlist creation
    - Song approval queue (wedding admins review)
    - Genre restrictions/guidelines
    - Vote on song suggestions
    - Export playlist to other platforms
    - Share playlist URL with DJ

### Phase 11: Wedding Day Features
40. **QR code check-in system**
    - Generate unique QR codes per family
    - Mobile check-in interface for ushers
    - Real-time attendance tracking
    - Mark no-shows automatically
    - Send check-in notifications to admins
    - Guest count dashboard

41. **Live updates during wedding**
    - Real-time status updates to guests
    - Schedule changes broadcast
    - Photo gallery live display
    - Welcome messages display

### Phase 12: Post-Wedding
42. **Automated thank-you messages**
    - Automatic thank-you emails/WhatsApp after gift received
    - Personalized messages per family
    - Multi-language thank you templates
    - Batch send thank-yous

43. **Memory archival**
    - Photo album finalization
    - Gift acknowledgment tracking
    - Data export for couples (all data as JSON/Excel)
    - Guest data deletion (GDPR compliance)
    - Wedding archive mode (read-only)

---

**This PRD is ready for Claude Code to begin technical implementation.**
