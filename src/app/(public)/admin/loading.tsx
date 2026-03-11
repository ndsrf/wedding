/**
 * Admin Dashboard Loading Skeleton
 *
 * Provides a smooth loading transition for the admin dashboard.
 */

import React from 'react';

export default function AdminDashboardLoading() {
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

      {/* Hero Skeleton */}
      <div className="bg-white shadow-sm border-b border-rose-100 py-8 sm:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="space-y-3">
              <div className="h-10 w-64 bg-gray-200 animate-pulse rounded-lg" />
              <div className="h-4 w-48 bg-gray-100 animate-pulse rounded" />
            </div>
            <div className="h-24 w-24 sm:w-32 bg-rose-100 animate-pulse rounded-2xl hidden sm:block" />
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 h-32">
              <div className="h-8 w-16 bg-gray-200 animate-pulse rounded mb-2" />
              <div className="h-4 w-24 bg-gray-100 animate-pulse rounded" />
            </div>
          ))}
        </div>

        {/* Action Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl border-2 border-gray-100 p-6 h-32 animate-pulse" />
          ))}
        </div>
      </main>
    </div>
  );
}
