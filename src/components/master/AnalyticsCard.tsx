/**
 * Analytics Card Component
 *
 * Displays a single analytics metric with title and value
 * Used in the Master Admin dashboard to show platform statistics
 */

'use client';

import React from 'react';

interface AnalyticsCardProps {
  title: string;
  value: number;
  icon?: React.ReactNode;
  colorClass?: string;
}

export function AnalyticsCard({
  title,
  value,
  icon,
  colorClass = 'bg-blue-50 border-blue-200',
}: AnalyticsCardProps) {
  return (
    <div
      className={`${colorClass} border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
        </div>
        {icon && (
          <div className="ml-4 p-3 bg-white rounded-full shadow-sm">{icon}</div>
        )}
      </div>
    </div>
  );
}
