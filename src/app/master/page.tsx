/**
 * Master Admin Dashboard Page
 *
 * Main dashboard for master admin showing platform analytics
 * Displays total planners, active planners, total weddings, and total guests
 */

import { redirect } from 'next/navigation';
import { requireRole } from '@/src/lib/auth/middleware';
import { AnalyticsCard } from '@/src/components/master/AnalyticsCard';
import type { MasterAnalytics } from '@/src/types/api';

/**
 * Fetch platform analytics from API
 */
async function getAnalytics(): Promise<MasterAnalytics> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  const response = await fetch(`${baseUrl}/api/master/analytics`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch analytics');
  }

  const data = await response.json();
  return data.data;
}

export default async function MasterDashboardPage() {
  // Check authentication - redirect if not master admin
  try {
    await requireRole('master_admin');
  } catch {
    redirect('/api/auth/signin');
  }

  // Fetch analytics data
  let analytics: MasterAnalytics | null = null;
  let error: string | null = null;

  try {
    analytics = await getAnalytics();
  } catch (e) {
    error = 'Failed to load analytics';
    console.error('Error loading analytics:', e);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Master Admin Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Platform Overview and Analytics</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Analytics Cards */}
        {analytics && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <AnalyticsCard
              title="Total Planners"
              value={analytics.total_planners}
              colorClass="bg-blue-50 border-blue-200"
            />
            <AnalyticsCard
              title="Active Planners"
              value={analytics.active_planners}
              colorClass="bg-green-50 border-green-200"
            />
            <AnalyticsCard
              title="Total Weddings"
              value={analytics.total_weddings}
              colorClass="bg-purple-50 border-purple-200"
            />
            <AnalyticsCard
              title="Total Guests"
              value={analytics.total_guests}
              colorClass="bg-pink-50 border-pink-200"
            />
          </div>
        )}

        {/* Quick Links */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <a
              href="/master/planners"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900">Manage Planners</h3>
                <p className="mt-1 text-sm text-gray-500">
                  View, create, and manage wedding planners
                </p>
              </div>
            </a>

            <a
              href="/master/weddings"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors"
            >
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-purple-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2h12z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900">View Weddings</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Browse all weddings across the platform
                </p>
              </div>
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
