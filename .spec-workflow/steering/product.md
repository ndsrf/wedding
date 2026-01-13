# Product Overview

## Product Purpose

The Wedding Management App is a multi-tenant SaaS platform designed to streamline wedding planning and guest management for professional wedding planners in the Spanish market. It solves the critical problem of managing RSVPs, tracking gifts, and coordinating with guest families across multiple weddings simultaneously, while eliminating authentication barriers for guests through persistent magic links.

**Core Problem Solved**: Traditional wedding RSVP management is fragmented across email, WhatsApp, phone calls, and spreadsheets. Guests struggle with complex login systems, planners lose track of responses, and couples spend countless hours manually tracking who's coming and matching bank transfers to families.

**Our Solution**: A unified platform where planners manage multiple weddings, couples access their specific wedding data, and guests RSVP instantly via magic links without creating accounts—all optimized for mobile and WhatsApp in-app browsers.

## Target Users

### Primary Users

1. **Wedding Planners (Paying Customers)**
   - **Profile**: Professional planners in Spain managing 5-20 weddings simultaneously
   - **Needs**:
     - Centralized dashboard for all client weddings
     - Quick wedding setup and admin delegation
     - White-label branding via custom themes
     - Minimal time investment per wedding
   - **Pain Points**:
     - Managing multiple couples' expectations
     - Switching between different tools for different weddings
     - Teaching couples how to use complex software
     - Tracking progress across all active weddings

2. **Wedding Admins (Couples - Free Access)**
   - **Profile**: Spanish couples (25-40 years old) planning their wedding with a planner's help
   - **Needs**:
     - Simple guest list import (Excel)
     - Real-time RSVP tracking with notifications
     - Payment gift tracking (bank transfers)
     - Easy communication with guests
   - **Pain Points**:
     - Overwhelming number of tasks and details
     - Uncertainty about who confirmed attendance
     - Matching anonymous bank transfers to families
     - Language barriers with international guests
     - Mobile-first requirement (always on the go)

3. **Guest Families (End Users - Free Access)**
   - **Profile**: Spanish families (often multi-generational with elderly members) and international friends
   - **Needs**:
     - Zero-friction RSVP (no account creation)
     - Confirm attendance for entire family at once
     - Access via WhatsApp (primary communication channel in Spain)
     - Multi-language support (Spanish, English, French, Italian, German)
   - **Pain Points**:
     - Password fatigue and forgotten logins
     - Unclear RSVP instructions
     - Difficulty using small forms on mobile
     - Elderly relatives needing simple interfaces
     - Finding bank transfer details when ready to send gift

### Secondary Users

4. **Master Admin (Platform Owner)**
   - **Profile**: Platform operator managing planner accounts
   - **Needs**:
     - Add/remove wedding planner accounts
     - Monitor platform health and usage
     - Enable/disable access for non-paying planners
   - **Pain Points**:
     - Ensuring data isolation between planners
     - Verifying subscription status
     - Platform-wide analytics

## Key Features

### MVP Features (Phases 1-4)

1. **Multi-Tenant Platform Management**
   - Master admin adds wedding planner accounts with business name, logo, contact info
   - Enable/disable planner access with toggle
   - View all planners and weddings (read-only overview)
   - Complete data isolation per wedding

2. **Wedding Planner Dashboard**
   - Multi-provider OAuth (Google, Facebook, Apple) with last-used provider indicator
   - Create unlimited weddings with couple names, date, location, RSVP cutoff
   - Invite wedding admins (couples) via email with OAuth sign-in
   - Theme gallery management: create custom themes or use 5 pre-built options
   - High-level stats: total weddings, RSVPs this month, total guests

3. **Theme System**
   - Custom visual branding per wedding (colors, fonts, spacing, images)
   - Pre-built themes: Classic Elegance, Garden Romance, Modern Minimal, Rustic Charm, Beach Breeze
   - Theme editor with real-time preview
   - Themes apply to all guest-facing pages (RSVP, payment info, confirmation)

4. **Wedding Admin Panel**
   - Excel import with template: Family Name, Contact, Email, Phone, WhatsApp, Language, Members
   - Guest dashboard with filters: RSVP status, attendance, channel, payment status
   - Manual reminder system: send WhatsApp/Email/SMS to non-responders
   - Activity notifications with filtering: date range, event type, family, channel
   - Export filtered data to Excel/CSV for analysis
   - Invite additional admins (e.g., maid of honor, best man)
   - Payment tracking: automated (GoCardless API) or manual recording

5. **Magic Link Guest Experience**
   - Persistent UUID tokens valid until wedding date (never expire)
   - Channel tracking: ?channel=whatsapp|email|sms parameter
   - Personalized RSVP page with family name
   - Select which family members attend from pre-populated list
   - Add dietary restrictions, accessibility needs, children's ages
   - Optional: Add forgotten family members (flagged for couple review)
   - View bank transfer details with unique reference code (if automated mode)
   - Language switcher: 5 languages (Spanish, English, French, Italian, German)
   - RSVP cutoff enforcement: read-only after deadline

6. **Multi-Language Support**
   - 5 languages: Spanish (primary), English, French, Italian, German
   - Language preference per user type: admins choose on first login, guests set per family
   - Dynamic language switching on guest pages with persistence
   - Email/WhatsApp templates in all languages
   - Excel import supports language column per family

7. **Engagement Tracking**
   - Comprehensive event log: link opened, RSVP submitted/updated, payment received, reminders sent
   - Channel attribution: know which channel drove each action
   - Admin notification feed with filtering and export
   - Dashboard metrics: open rates, response rates, pending RSVPs by channel

8. **Payment Integration**
   - Two modes: automated (GoCardless API) or manual entry
   - Automated: generate unique reference codes, auto-match bank transfers
   - Manual: wedding admin records payments manually with date and amount
   - Guest view: "Payment received ✓" confirmation visible after confirmation

### Future Vision Features (Post-MVP)

9. **Seating Chart Management** (Phase 7)
   - Drag-and-drop visual editor for table assignments
   - Kids tables logic and high chair tracking
   - Print-ready seating cards
   - Export to PDF/Excel for venue

10. **Task Management Integration** (Phase 8)
    - Google Tasks API integration
    - Pre-wedding checklist templates
    - Shared task lists between wedding admins
    - Deadline reminders

11. **Photo Sharing** (Phase 9)
    - Google Photos API integration
    - Guest upload interface
    - QR code at wedding for instant album access
    - Live photo slideshow during reception

12. **Music Collaboration** (Phase 10)
    - Spotify playlist integration
    - Guests suggest songs for reception
    - Wedding admin approval queue

13. **Wedding Day Features** (Phase 11)
    - QR code check-in system
    - Real-time attendance tracking
    - Live updates broadcast to guests

14. **Post-Wedding** (Phase 12)
    - Automated thank-you messages
    - Gift acknowledgment tracking
    - Memory archival and data export

## Business Objectives

### Short-Term (MVP - 6 months)

- **Launch in Spanish Market**: Target 50 wedding planners by end of Year 1
- **Prove Value**: Achieve >90% RSVP completion rate within 2 weeks of first reminder
- **Validate Business Model**: Establish monthly subscription pricing (€50-100/month per planner)
- **User Satisfaction**: Achieve NPS score >60 from wedding admins (couples)
- **Mobile Excellence**: Ensure 95%+ of guest interactions happen on mobile devices

### Medium-Term (Year 1-2)

- **Scale to 200 Planners**: Expand through referrals and wedding industry partnerships
- **International Expansion**: Add Portuguese market (similar culture, adjacent geography)
- **Feature Differentiation**: Launch Phase 7-8 features (seating charts, task management)
- **Revenue Growth**: Reach €100K MRR from planner subscriptions
- **Market Leadership**: Become top 3 wedding management platform in Spain

### Long-Term (Year 3+)

- **European Dominance**: Expand to Italy, France, Portugal markets
- **Enterprise Tier**: Offer premium features for high-volume planners (20+ weddings/year)
- **Integration Ecosystem**: Partner with venues, caterers, photographers for referral network
- **Freemium Model**: Consider free tier for couples without planner (future pivot option)

## Success Metrics

### User Acquisition Metrics

- **Planner Sign-ups**: 50 in Year 1 (4-5 per month after initial launch)
- **Wedding Creation Rate**: Average 8 weddings per planner per year
- **Wedding Admin Invitations**: 100% of weddings have at least 1 admin within 48 hours of creation
- **Guest Reach**: 100-150 guest families per wedding average (10,000+ families in Year 1)

### Engagement Metrics

- **RSVP Completion Rate**: >90% within 2 weeks of first reminder
- **Magic Link Reliability**: 100% of families can access link until wedding date (zero expired links)
- **Mobile Usage**: >95% of guest interactions on mobile devices
- **Return Visits**: >30% of families return to view/edit RSVP before cutoff
- **Language Diversity**: Track distribution of 5 languages to validate international need

### Efficiency Metrics

- **Excel Import Speed**: <5 minutes to import full guest list (admin onboarding time)
- **Payment Matching Accuracy**: >70% auto-matched in automated mode
- **Guest Addition Rate**: <5% of total guests (validates pre-populated lists are accurate)
- **Admin Time Savings**: Survey wedding admins on time saved vs. manual tracking (target: 10+ hours saved)

### Quality Metrics

- **Platform Uptime**: 99.5% availability
- **Page Load Speed**: <2 seconds on 3G mobile connections for guest pages
- **Error Rate**: <0.1% of API requests fail
- **Support Tickets**: <5% of weddings require support intervention

### Business Metrics

- **Monthly Recurring Revenue (MRR)**: €50K by end of Year 1
- **Customer Lifetime Value (LTV)**: €800+ (assuming 12-month average planner retention)
- **Churn Rate**: <15% annual planner churn
- **Net Promoter Score (NPS)**: >60 from wedding admins, >50 from planners
- **Customer Acquisition Cost (CAC)**: <€200 per planner (through referrals and content marketing)

## Product Principles

### 1. **Radical Simplicity for Guests**

Guests should never struggle with authentication, complex forms, or technical barriers. Magic links eliminate passwords. Forms are mobile-first with large touch targets. Language switching is obvious and persistent. The RSVP flow should take <2 minutes on a phone.

**Why**: Spanish families include elderly relatives uncomfortable with technology. WhatsApp is the primary communication channel. Any friction = lower RSVP completion = more manual work for couples.

**Example**: A 70-year-old grandmother clicks a WhatsApp link, sees her family name, checks who's coming, submits—done. No account, no password, no email verification.

### 2. **Data Isolation by Default**

Multi-tenancy is non-negotiable. Every database query must filter by `wedding_id`. Wedding admins see only their wedding. Planners see only their weddings. No cross-contamination ever.

**Why**: Trust is paramount. One data leak destroys reputation. GDPR compliance requires clear data boundaries. Planners need confidence their clients' data is protected.

**Example**: Prisma middleware automatically injects `wedding_id` filters. API routes validate access before any operation. Row-level security as additional layer.

### 3. **Mobile-First, Always**

Desktop is a luxury. Mobile is reality. Design for WhatsApp in-app browser first, then expand to other contexts.

**Why**: Spanish users are mobile-dominant. Couples manage weddings on-the-go. Guests respond from their phones. Any desktop-only feature is unusable.

**Example**: All touch targets ≥44px. Forms use native mobile inputs. Navigation fits within thumb reach. No hover-only interactions.

### 4. **Progressive Disclosure**

Don't overwhelm users with every feature upfront. Start simple, reveal complexity only when needed.

**Why**: Wedding planning is already overwhelming. Too many options paralyze decision-making. Advanced users will find advanced features—don't force them on everyone.

**Example**: Wedding creation starts with basics (names, date, location). Payment mode can be toggled later. Theme selection is optional (default provided). Guest additions can be disabled if not needed.

### 5. **Cultural Context Matters**

Spanish weddings are family-centric, multi-generational events. Bank transfers (not credit cards) are the standard gift method. WhatsApp is how families communicate.

**Why**: A product designed for US weddings fails in Spain. Cultural assumptions around gifts, communication channels, and family structures differ.

**Example**: RSVP is family-based (not individual). Payment tracking uses IBAN + reference codes. WhatsApp is the primary invitation channel. Multi-language support is essential for international friends.

### 6. **Planner Success = Product Success**

The product exists to make planners successful and profitable. If planners succeed, they stay subscribed. If couples are happy, planners get referrals.

**Why**: Planners are the paying customers. Their business model depends on efficiency and client satisfaction. Our platform must multiply their capacity.

**Example**: Planner dashboard shows high-level stats across all weddings at a glance. Theme gallery lets them white-label experiences. Minimal training required to onboard couples.

### 7. **Observability Without Surveillance**

Track what matters for functionality (RSVP status, payment confirmation) but respect privacy. Don't track for tracking's sake.

**Why**: GDPR compliance. User trust. Ethical product development. Only collect data that serves a clear purpose.

**Example**: Track "link opened via WhatsApp" for attribution. Track "RSVP submitted" for notifications. Don't track browsing patterns, time on page, or personal device details.

## Monitoring & Visibility

### Dashboard Types

1. **Master Admin Dashboard** (Web-based)
   - List of all wedding planners with status (Active/Disabled)
   - Platform-wide analytics: total weddings, total guests, active vs. completed
   - Add/edit planner interface
   - Read-only view of all weddings

2. **Wedding Planner Dashboard** (Web-based)
   - List of all weddings managed by this planner
   - Quick stats per wedding: Date, guest count, RSVP completion %, status
   - Create wedding button with streamlined form
   - Theme gallery with custom themes and system themes

3. **Wedding Admin Dashboard** (Web-based)
   - Guest overview with filters and search
   - Real-time notification feed with event filtering
   - Excel import/export controls
   - Manual reminder interface with preview
   - Payment tracking (automated or manual)
   - Guest additions review (if enabled)

4. **Guest RSVP Page** (Mobile-first web)
   - Personalized family greeting
   - RSVP form with family members
   - Payment information section
   - Language switcher dropdown
   - Theme-customized styling

### Real-time Updates

- **WebSocket Connection** (optional enhancement): Live notification updates for wedding admins
- **Polling Fallback**: Poll notifications API every 30 seconds when dashboard is open
- **Email/WhatsApp Notifications**: Critical events (new RSVP, guest addition, payment received) sent via email or WhatsApp
- **Push Notifications** (future): Browser push for desktop admin users

### Key Metrics Displayed

**Planner Dashboard:**
- Total active weddings
- Total RSVPs this month (across all weddings)
- Total guests across all weddings
- Last login timestamp

**Wedding Admin Dashboard:**
- Total invited families
- Total people: adults, children, infants
- RSVP completion rate (%)
- Outstanding responses (pending families)
- Payment summary: gifts received vs. expected
- Unread notifications badge counter

**Guest RSVP Page:**
- Family name (personalization)
- RSVP status: pending, submitted, updated
- Payment status: pending, received ✓
- Cutoff date countdown (if approaching)

### Sharing Capabilities

- **Read-Only Magic Links**: Guests share their RSVP link (read-only for security)
- **Excel Exports**: Wedding admins export guest data with all fields
- **Filtered Notification Exports**: Export specific date ranges or event types to CSV/Excel
- **Theme Sharing** (future): Planners share themes with other planners (marketplace?)

## Future Vision

### Remote Access & Collaboration

- **Remote Guest Import**: Wedding admins share import link with planner for bulk setup
- **Multi-Admin Collaboration**: Real-time updates when multiple admins edit guest list simultaneously
- **Planner Collaboration**: Multiple planners co-manage a single wedding (agency use case)

### Analytics & Insights

- **Historical Trends**: Compare RSVP completion rates across weddings to identify best practices
- **Performance Metrics**: Track which communication channels (WhatsApp vs. Email vs. SMS) drive highest response rates
- **Predictive Analytics**: Estimate final guest count based on historical patterns and current RSVP trajectory
- **Seasonal Insights**: Identify peak wedding seasons for planner capacity planning

### Integration Ecosystem

- **Venue Integrations**: Export final guest count and dietary requirements directly to venue systems
- **Catering Integrations**: Auto-generate meal counts and restrictions for caterers
- **Photography Integrations**: Share guest names with photographers for name tags and photo organization
- **Invitation Printing**: Export guest addresses for physical invitation vendors
- **Registry Integrations**: Link gift registry tracking (Amazon, La Redoute, etc.) to payment tracking

### AI-Powered Enhancements

- **Smart Reminders**: AI suggests optimal times to send reminders based on historical response patterns
- **Duplicate Detection**: AI identifies potential duplicate families during Excel import
- **Payment Matching**: ML improves automated matching of bank transfers to families over time
- **Theme Recommendations**: AI suggests themes based on wedding location, season, couple preferences

### Accessibility & Inclusivity

- **Voice Input**: Allow guests to submit RSVP via voice commands (accessibility for visually impaired)
- **High Contrast Mode**: Dedicated accessibility theme for users with vision impairments
- **Screen Reader Optimization**: Full WCAG 2.1 AA compliance for all interfaces
- **Multi-Modal Communication**: Support for sign language video messages for deaf/hard-of-hearing guests

### Monetization Expansion

- **Freemium Tier for Couples**: Allow couples without planners to use platform directly (limited features)
- **Premium Features**: Advanced analytics, integrations, white-label domains for planners (€150/month tier)
- **Per-Wedding Pricing**: Alternative to subscription—pay per wedding created (€50-100 per wedding)
- **Marketplace**: Planners list their services, couples book planners through platform (commission model)

### Geographic & Cultural Expansion

- **Portuguese Market**: Similar culture and geographic proximity to Spain
- **Italian Market**: Strong wedding traditions, similar family structures
- **French Market**: Large Spanish expat community, cultural overlap
- **Latin American Markets**: Spanish language, cultural traditions (Mexico, Argentina, Colombia)
- **Cultural Customizations**: Region-specific features (e.g., Brazilian wedding godparents system)
