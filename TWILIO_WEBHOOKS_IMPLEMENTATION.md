# Twilio WhatsApp & SMS Read Receipt Webhook Implementation

## ✅ Completed Implementation

This document describes the fully implemented webhook integration for tracking WhatsApp and SMS message delivery and read receipts.

### Overview
The implementation adds webhook integration to track when WhatsApp and SMS messages are delivered and read by guests, storing these events in the existing TrackingEvent system with visual UI components to display guest engagement.

## Changes Made

### 1. Database Schema Update
**File**: `prisma/schema.prisma`

Added three new EventType enum values:
- `MESSAGE_DELIVERED` - Message delivered to device
- `MESSAGE_READ` - Message read by recipient
- `MESSAGE_FAILED` - Message delivery failed

**Migration**: `prisma/migrations/20260129_add_message_status_events/migration.sql`

### 2. Twilio Service Updates
**File**: `src/lib/sms/twilio.ts`

**Changes**:
- Added `statusCallback?: string` to `TwilioMessageParams` interface
- Updated `sendMessage()` function to include statusCallback URL: `${APP_URL}/api/webhooks/twilio/status`
- Applies to both SMS and WhatsApp messages

**Why**: Tells Twilio where to send delivery/read receipt webhooks

### 3. Message SID Storage
Updated notification services to store message SIDs in TrackingEvent metadata for webhook correlation:

**File**: `src/lib/notifications/invitation.ts` (Line ~190)
- Added `message_sid: messageResult.messageId` to metadata when tracking INVITATION_SENT events

**File**: `src/lib/notifications/confirmation.ts` (Line ~190)
- Added tracking event creation for confirmation messages (was previously missing)
- Stores `message_sid` in metadata
- Uses `REMINDER_SENT` event type for consistency

**File**: `src/app/api/admin/reminders/route.ts` (Line ~195-235)
- Updated to create tracking events after sending (for both EMAIL and SMS/WhatsApp channels)
- Captures `messageId` from send results and stores as `message_sid` in metadata
- Maintains proper metadata structure for all reminder events

### 4. Twilio Signature Validator
**File**: `src/lib/webhooks/twilio-validator.ts` (NEW)

**Features**:
- `validateTwilioSignature()` - HMAC-SHA1 signature validation using TWILIO_AUTH_TOKEN
- `mapTwilioStatusToEventType()` - Maps Twilio status strings to our EventType enum
- Constant-time comparison to prevent timing attacks
- Handles both single values and array parameters from Twilio form data

**Security**: Critical for verifying webhook requests come from Twilio

### 5. Webhook Endpoint
**File**: `src/app/api/webhooks/twilio/status/route.ts` (NEW)

**Endpoint**: `POST /api/webhooks/twilio/status`

**Features**:
- ✅ Validates X-Twilio-Signature header with HMAC-SHA1
- ✅ Extracts MessageSid and MessageStatus from webhook payload
- ✅ Finds original TrackingEvent by message_sid using Prisma JSON queries
- ✅ Creates MESSAGE_DELIVERED, MESSAGE_READ, or MESSAGE_FAILED events
- ✅ Implements idempotency checks (prevents duplicate events)
- ✅ Graceful error handling (returns 200 even on errors to prevent Twilio retries)
- ✅ Validates family/wedding still exist before creating events
- ✅ Stores metadata including error codes and original event references

**Error Handling**:
- Invalid signature → 403 Forbidden
- Missing MessageSid → 400 Bad Request
- Unknown SID → 200 OK (logged as warning)
- Duplicate events → 200 OK (idempotency)
- System errors → 200 OK (logged for monitoring)

### 6. Engagement Analytics Library
**File**: `src/lib/tracking/engagement.ts` (NEW)

**Functions**:

1. `getGuestEngagementStatus(family_id, wedding_id)` - Get full timeline for one family
   - Returns: invited, delivered, read, link_opened, rsvp_confirmed status with timestamps
   - Calculates completion percentage (0-100)

2. `getWeddingEngagementStats(wedding_id)` - Aggregate stats for all families
   - Counts: invited, delivered, read, link_opened, rsvp_confirmed
   - Average completion percentage across all families

3. `getChannelReadRates(wedding_id)` - Channel-specific analytics
   - Delivery rates and read rates by channel (WhatsApp, SMS, Email)
   - Counts: sent, delivered, read, failed

4. `getFamiliesWithUnreadMessages(wedding_id)` - Identify engagement gaps
   - Lists families with invitations sent but not read
   - Includes days since sent
   - Useful for sending follow-up reminders

### 7. Guest Engagement UI Components
**File**: `src/components/admin/GuestEngagementTimeline.tsx` (NEW)

**Components**:

1. **GuestEngagementTimeline** - Full timeline for single family
   - Shows 5-step journey: Invited → Delivered → Read → Opened → Confirmed
   - Completion percentage progress bar
   - Timestamps and channel information for each step
   - Visual indicators (circles with checkmarks)

2. **GuestEngagementList** - Summary list of all families
   - Quick status indicators (badges) for each step
   - Progress bars showing completion percentage
   - Hover effects for interactivity
   - Sortable/filterable (ready for integration)

3. **EngagementStats** - Aggregate statistics dashboard
   - Metrics cards for each engagement step
   - Total counts and percentages
   - Average engagement progress
   - Color-coded by status

**Usage**:
```tsx
// Single family timeline
<GuestEngagementTimeline engagement={engagement} isLoading={isLoading} />

// List of all families
<GuestEngagementList engagements={engagements} isLoading={isLoading} />

// Dashboard stats
<EngagementStats stats={stats} />
```

## How It Works

### Message Sending Flow
```
1. Admin sends invitation/reminder via SMS/WhatsApp
2. sendMessage() adds statusCallback URL to Twilio API request
3. Twilio sends message and stores SID
4. TrackingEvent created with message_sid in metadata
5. Twilio sends webhooks when message is delivered/read
```

### Webhook Processing Flow
```
1. Twilio POST to /api/webhooks/twilio/status with form data + X-Twilio-Signature
2. Endpoint validates signature using TWILIO_AUTH_TOKEN
3. Queries TrackingEvent by message_sid in metadata
4. Checks for duplicates (idempotency)
5. Creates MESSAGE_DELIVERED, MESSAGE_READ, or MESSAGE_FAILED event
6. Responds 200 OK (prevents Twilio retries)
```

### Engagement Tracking
```
Tracked Events (in order):
1. INVITATION_SENT - When admin sends initial invitation
2. MESSAGE_DELIVERED - When Twilio reports message delivered
3. MESSAGE_READ - When recipient reads message (WhatsApp mainly)
4. LINK_OPENED - When guest clicks the RSVP link
5. RSVP_SUBMITTED - When guest completes RSVP form

Each event stored with:
- family_id, wedding_id (for queries)
- event_type (for filtering)
- channel (WHATSAPP, SMS, EMAIL)
- timestamp (when event occurred)
- metadata (message_sid, template_type, errors, etc.)
```

## Configuration

### Environment Variables (Existing)
```
TWILIO_AUTH_TOKEN=        # Used for signature validation
APP_URL=http://localhost:3000  # Used to construct webhook URL
```

### No New Variables Required
The implementation uses existing environment variables.

## Important Notes

### SMS vs WhatsApp
- **WhatsApp**: Read receipts are reliable when users have read receipts enabled
- **SMS**: Read receipts are NOT widely supported by carriers and may not work
- **Both channels**: Delivery receipts work reliably
- **Email**: No automatic delivery/read tracking (browser-based only)

### Message SID Storage
Message SIDs are stored in `metadata.message_sid` field for webhook correlation:
```json
{
  "metadata": {
    "message_sid": "SM1234567890abcdef...",
    "template_type": "INVITATION",
    "language": "ES",
    "channel": "WHATSAPP"
  }
}
```

### Idempotency
The webhook endpoint prevents duplicate events by checking if a status event already exists for a given message_sid. This handles Twilio retries gracefully.

### Error Handling
- Unknown SIDs are logged but don't cause failures
- Invalid signatures are rejected with 403
- System errors return 200 to acknowledge receipt (prevent retry storms)
- All errors are logged for monitoring/debugging

## Testing

### Manual Testing with Real WhatsApp
```bash
# 1. Send test invitation via admin panel
# 2. Check TrackingEvent table for INVITATION_SENT with message_sid
# 3. Open WhatsApp and read the message
# 4. Check webhook logs in console
# 5. Verify MESSAGE_READ event created
```

### Query Tracking Events
```sql
-- Check all events for a family
SELECT event_type, channel, metadata, timestamp
FROM tracking_events
WHERE family_id = 'xxx'
ORDER BY timestamp DESC;

-- Expected sequence:
-- INVITATION_SENT → MESSAGE_DELIVERED → MESSAGE_READ
```

### Monitor Webhook Logs
```bash
# Console logs show:
# [TWILIO_WEBHOOK] Received status callback
# [TWILIO_WEBHOOK] Created status event
# [TWILIO_WEBHOOK] Invalid Twilio signature (if validation fails)
```

## Integration Points

### Ready for Admin Dashboard
The components and functions are designed to be integrated into the admin panel:

**For `/admin/guests` page**:
- Add engagement timeline column to guests table
- Show quick status indicators
- Link to detailed engagement view

**For `/admin/engagement` page** (new):
- Full timeline for each family
- Aggregate statistics dashboard
- Channel-specific read rates
- List of families needing follow-up

**For `/admin/dashboard`**:
- Quick engagement metrics cards
- Trend charts (delivery/read rates over time)
- Alert for unread messages

## Analytics Capabilities

Once integrated, you can query:
- **Read rates**: MESSAGE_READ vs MESSAGE_SENT by channel
- **Delivery issues**: Families with MESSAGE_FAILED events
- **Unread invitations**: INVITATION_SENT but no MESSAGE_READ
- **Drop-off analysis**: Where guests stop in the journey
- **Time to read**: Difference between sent and read timestamps
- **Engagement funnel**: Sent → Delivered → Read → Opened → Confirmed

### Example Query
```typescript
// Get full engagement for a family
const engagement = await getGuestEngagementStatus(family_id, wedding_id);
// Returns: {
//   family_id, family_name,
//   invited: { status, timestamp, channel },
//   delivered: { status, timestamp },
//   read: { status, timestamp },
//   link_opened: { status, timestamp },
//   rsvp_confirmed: { status, timestamp },
//   completion_percentage: 80
// }
```

## Files Modified

### Core Implementation (7 files)
1. ✅ `prisma/schema.prisma` - Added EventType enum values
2. ✅ `src/lib/sms/twilio.ts` - Added statusCallback URL
3. ✅ `src/lib/notifications/invitation.ts` - Store message_sid
4. ✅ `src/lib/notifications/confirmation.ts` - Add tracking + store message_sid
5. ✅ `src/app/api/admin/reminders/route.ts` - Store message_sid in reminder tracking

### New Files (5 files)
6. ✅ `src/lib/webhooks/twilio-validator.ts` - Signature validation
7. ✅ `src/app/api/webhooks/twilio/status/route.ts` - Webhook endpoint
8. ✅ `src/lib/tracking/engagement.ts` - Analytics functions
9. ✅ `src/components/admin/GuestEngagementTimeline.tsx` - UI components
10. ✅ `prisma/migrations/20260129_add_message_status_events/` - Schema migration

## Rollout Checklist

- [x] Database schema updated with new EventType values
- [x] Twilio service configured with statusCallback URL
- [x] Message SIDs stored in TrackingEvent metadata
- [x] Webhook endpoint implemented with signature validation
- [x] Idempotency checks in place
- [x] Analytics functions created
- [x] UI components created
- [ ] Integration into admin dashboard (next phase)
- [ ] Test with Twilio sandbox WhatsApp
- [ ] Monitor webhook logs in production
- [ ] Verify TrackingEvents being created correctly

## Next Steps

1. **Integration**: Add components to admin dashboard pages
2. **Testing**: Test with real WhatsApp/SMS messages
3. **Analytics**: Create dashboard pages using engagement functions
4. **Monitoring**: Set up alerts for delivery failures
5. **Optimization**: Add pagination/filtering to guest lists
6. **Reporting**: Create monthly engagement reports

## Security Notes

- ✅ HMAC-SHA1 signature validation prevents spoofed webhooks
- ✅ Constant-time comparison prevents timing attacks
- ✅ Message SIDs are unique and unguessable
- ✅ Webhook endpoint validates family/wedding existence
- ✅ Errors don't expose sensitive information
- ✅ Graceful handling prevents information leakage

## Support & Debugging

**Issue: Message SIDs not being stored**
- Check that `messageResult.messageId` is present in send results
- Verify metadata is being serialized correctly in Prisma

**Issue: Webhooks not being received**
- Verify APP_URL is correct and accessible from internet
- Check Twilio Console logs for webhook attempts
- Ensure X-Twilio-Signature header is being sent

**Issue: Invalid signature errors**
- Verify TWILIO_AUTH_TOKEN is correct
- Check URL construction matches Twilio expectations
- Ensure form parameters are properly encoded

**Issue: Duplicate events created**
- Idempotency check should prevent this
- Check for concurrent webhook requests
- Review database transaction logs
