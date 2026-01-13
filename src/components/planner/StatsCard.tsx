/**
 * Stats Card Component
 *
 * Displays a single statistic with title and value
 * Used in the Wedding Planner dashboard to show statistics
 */

'use client';

import React from 'react';

interface StatsCardProps {
  title: string;
  value: number | string;
  icon?: React.ReactNode;
  colorClass?: string;
  suffix?: string;
}

export function StatsCard({
  title,
  value,
  icon,
  colorClass = 'bg-blue-50 border-blue-200',
  suffix = '',
}: StatsCardProps) {
  const displayValue = typeof value === 'number' ? value.toLocaleString() : value;

  return (
    <div
      className={`${colorClass} border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">
            {displayValue}
            {suffix && <span className="text-lg ml-1">{suffix}</span>}
          </p>
        </div>
        {icon && (
          <div className="ml-4 p-3 bg-white rounded-full shadow-sm">{icon}</div>
        )}
      </div>
    </div>
  );
}
