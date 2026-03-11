/**
 * Planner Dashboard Loading Skeleton
 *
 * Provides a smooth loading transition for the planner dashboard.
 */

import React from 'react';

export default function PlannerDashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Header Skeleton */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 h-16 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          <div className="h-8 w-32 bg-gray-200 animate-pulse rounded" />
          <div className="flex gap-4">
            <div className="h-8 w-24 bg-gray-200 animate-pulse rounded" />
            <div className="h-8 w-24 bg-gray-200 animate-pulse rounded" />
          </div>
        </div>
      </header>

      {/* Hero/Title Skeleton */}
      <div className="bg-white shadow-sm border-b border-gray-200 py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-8 w-64 bg-gray-200 animate-pulse rounded mb-2" />
          <div className="h-4 w-48 bg-gray-100 animate-pulse rounded" />
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* KPI Stats Strip Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 h-32">
              <div className="flex items-start justify-between">
                <div>
                  <div className="h-8 w-16 bg-gray-200 animate-pulse rounded mb-2" />
                  <div className="h-4 w-24 bg-gray-100 animate-pulse rounded" />
                </div>
                <div className="w-11 h-11 bg-gray-100 animate-pulse rounded-xl" />
              </div>
            </div>
          ))}
        </div>

        {/* Upcoming Weddings Skeleton */}
        <div>
          <div className="h-6 w-48 bg-gray-200 animate-pulse rounded mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 h-24 animate-pulse" />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
