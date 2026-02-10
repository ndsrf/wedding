/**
 * Admin No Access Page
 *
 * Displayed when an admin user has no access to any active weddings.
 * This occurs when:
 * - The wedding has been deleted by the planner
 * - The admin has no other weddings assigned
 */

'use client';

import { signOut } from 'next-auth/react';
import { ShieldAlert } from 'lucide-react';

export default function NoAccessPage() {
  const handleSignOut = () => {
    signOut({ callbackUrl: '/auth/signin', redirect: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
            <ShieldAlert className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="mt-6 text-3xl font-extrabold text-gray-900">
            No Access
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            You don&apos;t have access to any active weddings.
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-sm text-gray-700">
              Your wedding may have been removed or you may have lost access.
              Please contact your wedding planner for assistance.
            </p>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
          >
            Sign Out
          </button>
        </div>

        <p className="mt-4 text-xs text-gray-500">
          If you believe this is an error, please contact support.
        </p>
      </div>
    </div>
  );
}
