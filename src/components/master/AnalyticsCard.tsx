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
      className={`${colorClass} border-2 rounded-2xl p-6 shadow-md hover:shadow-xl transition-all hover:scale-105 transform duration-200`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-base font-semibold text-gray-700 mb-2">{title}</p>
          <p className="text-4xl font-bold text-gray-900">{value.toLocaleString()}</p>
        </div>
        {icon && (
          <div className="ml-4 p-3 bg-white rounded-xl shadow-sm">{icon}</div>
        )}
      </div>
    </div>
  );
}
