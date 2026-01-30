# Guest Engagement Integration Guide

Quick reference for integrating guest engagement features into the admin dashboard.

## Component Usage

### 1. Single Family Timeline

Display the full engagement journey for one family:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { getGuestEngagementStatus } from '@/lib/tracking/engagement';
import { GuestEngagementTimeline } from '@/components/admin/GuestEngagementTimeline';

export default function FamilyEngagementView({ params }: { params: { family_id: string } }) {
  const [engagement, setEngagement] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchEngagement() {
      const data = await getGuestEngagementStatus(
        params.family_id,
        'wedding-id-here'
      );
      setEngagement(data);
      setIsLoading(false);
    }
    fetchEngagement();
  }, [params.family_id]);

  return (
    <div className="p-6">
      <GuestEngagementTimeline
        engagement={engagement}
        isLoading={isLoading}
      />
    </div>
  );
}
```

### 2. All Families List

Display a quick overview of all families with their engagement status:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { getWeddingEngagementStats } from '@/lib/tracking/engagement';
import { GuestEngagementList, EngagementStats } from '@/components/admin/GuestEngagementTimeline';

export default function EngagementDashboard({ params }: { params: { wedding_id: string } }) {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const data = await getWeddingEngagementStats(params.wedding_id);
      setStats(data);
      setIsLoading(false);
    }
    fetchStats();
  }, [params.wedding_id]);

  return (
    <div className="p-6 space-y-8">
      {/* Aggregate Statistics */}
      {stats && (
        <EngagementStats stats={stats} />
      )}

      {/* List of all families */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Guest Engagement</h2>
        {stats && (
          <GuestEngagementList
            engagements={stats.engagements}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
}
```

### 3. Channel Analytics

Show read rates by channel (WhatsApp vs SMS vs Email):

```tsx
'use client';

import { useState, useEffect } from 'react';
import { getChannelReadRates } from '@/lib/tracking/engagement';

export default function ChannelAnalytics({ params }: { params: { wedding_id: string } }) {
  const [rates, setRates] = useState(null);

  useEffect(() => {
    async function fetchRates() {
      const data = await getChannelReadRates(params.wedding_id);
      setRates(data);
    }
    fetchRates();
  }, [params.wedding_id]);

  if (!rates) return <div>Loading...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {rates.map((channel) => (
        <div
          key={channel.channel}
          className="bg-white rounded-lg shadow p-6"
        >
          <h3 className="font-bold text-lg">{channel.channel}</h3>
          <div className="mt-4 space-y-2">
            <p className="text-sm text-gray-600">
              Sent: <span className="font-bold">{channel.sent_count}</span>
            </p>
            <p className="text-sm text-gray-600">
              Delivery Rate: <span className="font-bold">{channel.delivery_rate}%</span>
            </p>
            <p className="text-sm text-gray-600">
              Read Rate: <span className="font-bold">{channel.read_rate}%</span>
            </p>
            {channel.failed_count > 0 && (
              <p className="text-sm text-red-600">
                Failed: <span className="font-bold">{channel.failed_count}</span>
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### 4. Families Needing Follow-up

Identify families that haven't read their invitations:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { getFamiliesWithUnreadMessages } from '@/lib/tracking/engagement';

export default function UnreadMessagesList({ params }: { params: { wedding_id: string } }) {
  const [families, setFamilies] = useState(null);

  useEffect(() => {
    async function fetchUnread() {
      const data = await getFamiliesWithUnreadMessages(params.wedding_id);
      setFamilies(data);
    }
    fetchUnread();
  }, [params.wedding_id]);

  if (!families) return <div>Loading...</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">
        Families Not Yet Read ({families.length})
      </h2>
      <div className="space-y-3">
        {families.map((family) => (
          <div
            key={family.family_id}
            className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold">{family.family_name}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Sent {family.days_since_sent} days ago
                  {family.delivered_at && ' • Delivered'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Preference: {family.channel_preference || 'Not set'}
                </p>
              </div>
              <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm">
                Send Reminder
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Quick Stats for Dashboard Cards

Add to dashboard header with key metrics:

```tsx
export async function EngagementMetrics({ weddingId }: { weddingId: string }) {
  const stats = await getWeddingEngagementStats(weddingId);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <MetricCard
        label="Invited"
        value={stats.invited_count}
        total={stats.total_families}
      />
      <MetricCard
        label="Delivered"
        value={stats.delivered_count}
        total={stats.total_families}
      />
      <MetricCard
        label="Read"
        value={stats.read_count}
        total={stats.total_families}
      />
      <MetricCard
        label="RSVP Confirmed"
        value={stats.rsvp_confirmed_count}
        total={stats.total_families}
      />
    </div>
  );
}

function MetricCard({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const percentage = Math.round((value / total) * 100);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-2xl font-bold mt-2">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{percentage}%</p>
    </div>
  );
}
```

## Adding to Guests Table

Add engagement status column to existing guests table:

```tsx
// In your guests table columns:
{
  id: 'engagement',
  header: 'Engagement',
  cell: ({ row }) => {
    const engagement = row.original.engagement; // Fetched separately
    return (
      <div className="flex items-center space-x-2">
        {engagement.invited.status === 'completed' && (
          <Badge variant="outline">📤</Badge>
        )}
        {engagement.delivered.status === 'completed' && (
          <Badge>✓</Badge>
        )}
        {engagement.read.status === 'completed' && (
          <Badge variant="secondary">✓✓</Badge>
        )}
        {engagement.link_opened.status === 'completed' && (
          <Badge variant="outline">🔗</Badge>
        )}
        {engagement.rsvp_confirmed.status === 'completed' && (
          <Badge>✅</Badge>
        )}
      </div>
    );
  },
}
```

## Common Patterns

### Loading Multiple Engagements

```typescript
// Load engagement for multiple families
const familyIds = ['family-1', 'family-2', 'family-3'];
const engagements = await Promise.all(
  familyIds.map(id => getGuestEngagementStatus(id, weddingId))
);
```

### Sorting by Completion

```typescript
// Sort families by completion percentage
const sorted = engagements.sort(
  (a, b) => b.completion_percentage - a.completion_percentage
);
```

### Filtering by Status

```typescript
// Get all families with incomplete RSVP
const unconfirmed = engagements.filter(
  e => e.rsvp_confirmed.status === 'pending'
);
```

### Time Calculations

```typescript
// Days since invitation sent
const daysSinceSent = Math.floor(
  (Date.now() - event.invited.timestamp.getTime()) / (1000 * 60 * 60 * 24)
);

// Time to read (minutes)
const timeToRead = Math.floor(
  (event.read.timestamp.getTime() - event.invited.timestamp.getTime()) / (1000 * 60)
);
```

## Type Definitions

```typescript
import type { GuestEngagement, EngagementStep } from '@/lib/tracking/engagement';

// GuestEngagement structure
interface GuestEngagement {
  family_id: string;
  family_name: string;
  invited: EngagementStep;
  delivered: EngagementStep;
  read: EngagementStep;
  link_opened: EngagementStep;
  rsvp_confirmed: EngagementStep;
  completion_percentage: number;
}

// EngagementStep structure
interface EngagementStep {
  status: 'pending' | 'completed';
  timestamp?: Date;
  channel?: Channel;
}

// Channel type
type Channel = 'WHATSAPP' | 'SMS' | 'EMAIL';
```

## Styling Tips

### Tailwind Color Scheme

```
Pending: gray-300 / gray-500
In Progress: blue-500 / blue-100
Completed: green-500 / green-100
Errors: red-500 / red-100
```

### Component Classes

```tsx
// Status badge colors
const statusColors = {
  pending: 'bg-gray-100 text-gray-700',
  completed: 'bg-green-100 text-green-700',
  error: 'bg-red-100 text-red-700',
};

// Timeline colors
const timelineColors = {
  pending: 'bg-gray-300',
  completed: 'bg-green-500',
};
```

## Performance Considerations

- Cache engagement stats for 5-10 minutes
- Load engagement on-demand for individual families
- Use pagination for large family lists
- Consider background job for nightly stats aggregation

## Error Handling

```typescript
try {
  const engagement = await getGuestEngagementStatus(familyId, weddingId);
  if (!engagement) {
    return <div>Family not found</div>;
  }
  // Render component
} catch (error) {
  console.error('Failed to load engagement:', error);
  return <div>Error loading engagement data</div>;
}
```

## Next Steps

1. Create `/admin/engagement` page with EngagementStats and GuestEngagementList
2. Add engagement column to `/admin/guests` table
3. Create `/admin/guests/[id]/engagement` detail page
4. Add channel analytics to `/admin/analytics`
5. Set up nightly stats aggregation job
6. Create alerts for delivery failures
