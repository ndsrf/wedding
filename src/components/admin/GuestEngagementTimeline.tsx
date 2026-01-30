'use client';

import React from 'react';
import type { GuestEngagement, EngagementStep } from '@/lib/tracking/engagement';

interface TimelineStepProps {
  label: string;
  step: EngagementStep;
  order: number;
}

function TimelineStep({ label, step, order }: TimelineStepProps) {
  const isCompleted = step.status === 'completed';
  const statusColor = isCompleted ? 'bg-green-500' : 'bg-gray-300';
  const textColor = isCompleted ? 'text-green-700' : 'text-gray-500';

  return (
    <div className="flex items-start">
      {/* Vertical line (hidden for first item) */}
      {order > 0 && (
        <div className="flex flex-col items-center mr-4 -ml-3">
          <div className={`w-1 h-12 ${isCompleted ? 'bg-green-500' : 'bg-gray-300'}`} />
        </div>
      )}

      {/* Step circle and content */}
      <div className="flex items-start mb-8">
        {/* Circle */}
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm mr-4 flex-shrink-0 ${statusColor}`}
        >
          {isCompleted ? '✓' : '·'}
        </div>

        {/* Content */}
        <div>
          <h3 className={`font-semibold ${textColor}`}>{label}</h3>
          {isCompleted && step.timestamp && (
            <p className="text-sm text-gray-600 mt-1">
              {step.timestamp.toLocaleDateString()} at{' '}
              {step.timestamp.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
          {isCompleted && step.channel && (
            <p className="text-xs text-gray-500 mt-1">via {step.channel}</p>
          )}
        </div>
      </div>
    </div>
  );
}

interface GuestEngagementTimelineProps {
  engagement: GuestEngagement | null;
  isLoading?: boolean;
}

export function GuestEngagementTimeline({
  engagement,
  isLoading = false,
}: GuestEngagementTimelineProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gray-300 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-300 rounded w-1/4" />
                <div className="h-3 bg-gray-200 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!engagement) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-500">No engagement data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-800">
          {engagement.family_name} - Guest Engagement
        </h2>
        <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${engagement.completion_percentage}%` }}
          />
        </div>
        <p className="text-sm text-gray-600 mt-2">
          {engagement.completion_percentage}% complete
        </p>
      </div>

      <div className="mt-8">
        <TimelineStep
          label="Invitation Sent"
          step={engagement.invited}
          order={0}
        />
        <TimelineStep
          label="Message Delivered"
          step={engagement.delivered}
          order={1}
        />
        <TimelineStep
          label="Message Read"
          step={engagement.read}
          order={2}
        />
        <TimelineStep
          label="Link Opened"
          step={engagement.link_opened}
          order={3}
        />
        <TimelineStep
          label="RSVP Confirmed"
          step={engagement.rsvp_confirmed}
          order={4}
        />
      </div>
    </div>
  );
}

interface GuestEngagementListProps {
  engagements: GuestEngagement[];
  isLoading?: boolean;
}

export function GuestEngagementList({
  engagements,
  isLoading = false,
}: GuestEngagementListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-4 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-300 rounded w-1/4" />
                <div className="h-3 bg-gray-200 rounded w-1/3" />
              </div>
              <div className="w-12 h-6 bg-gray-300 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!engagements || engagements.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-500">No families to display</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {engagements.map((engagement) => (
        <div
          key={engagement.family_id}
          className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-800">{engagement.family_name}</h3>
              <div className="flex items-center mt-2 space-x-2">
                {/* Status indicators */}
                {engagement.invited.status === 'completed' && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    📤 Invited
                  </span>
                )}
                {engagement.delivered.status === 'completed' && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    ✓ Delivered
                  </span>
                )}
                {engagement.read.status === 'completed' && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    ✓✓ Read
                  </span>
                )}
                {engagement.link_opened.status === 'completed' && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    🔗 Opened
                  </span>
                )}
                {engagement.rsvp_confirmed.status === 'completed' && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    ✅ Confirmed
                  </span>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="flex items-center space-x-3">
              <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-300"
                  style={{ width: `${engagement.completion_percentage}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-gray-700 w-10 text-right">
                {engagement.completion_percentage}%
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

interface EngagementStatsProps {
  stats: {
    total_families: number;
    invited_count: number;
    delivered_count: number;
    read_count: number;
    link_opened_count: number;
    rsvp_confirmed_count: number;
    average_completion_percentage: number;
  };
}

export function EngagementStats({ stats }: EngagementStatsProps) {
  const metrics = [
    {
      label: 'Total Families',
      value: stats.total_families,
      color: 'bg-blue-50 text-blue-700',
    },
    {
      label: 'Invited',
      value: stats.invited_count,
      percentage: (stats.invited_count / stats.total_families) * 100,
      color: 'bg-green-50 text-green-700',
    },
    {
      label: 'Delivered',
      value: stats.delivered_count,
      percentage: (stats.delivered_count / stats.total_families) * 100,
      color: 'bg-blue-50 text-blue-700',
    },
    {
      label: 'Read',
      value: stats.read_count,
      percentage: (stats.read_count / stats.total_families) * 100,
      color: 'bg-blue-50 text-blue-700',
    },
    {
      label: 'Link Opened',
      value: stats.link_opened_count,
      percentage: (stats.link_opened_count / stats.total_families) * 100,
      color: 'bg-purple-50 text-purple-700',
    },
    {
      label: 'RSVP Confirmed',
      value: stats.rsvp_confirmed_count,
      percentage: (stats.rsvp_confirmed_count / stats.total_families) * 100,
      color: 'bg-green-50 text-green-700',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {metrics.map((metric) => (
        <div key={metric.label} className={`rounded-lg shadow p-6 ${metric.color}`}>
          <p className="text-sm font-medium opacity-75">{metric.label}</p>
          <p className="text-3xl font-bold mt-2">{metric.value}</p>
          {metric.percentage !== undefined && (
            <p className="text-xs opacity-75 mt-2">{Math.round(metric.percentage)}%</p>
          )}
        </div>
      ))}

      {/* Average completion */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 text-green-700 rounded-lg shadow p-6 md:col-span-2 lg:col-span-3">
        <p className="text-sm font-medium opacity-75">Average Engagement</p>
        <p className="text-3xl font-bold mt-2">{stats.average_completion_percentage}%</p>
        <div className="w-full h-2 bg-green-200 rounded-full overflow-hidden mt-3">
          <div
            className="h-full bg-green-600 transition-all duration-300"
            style={{ width: `${stats.average_completion_percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
