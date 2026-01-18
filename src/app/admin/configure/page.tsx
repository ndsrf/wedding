/**
 * Wedding Admin - Configure Wedding Page
 *
 * Allows wedding admins to configure RSVP settings and wedding details
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { WeddingConfigForm } from '@/components/admin/WeddingConfigForm';
import type { Wedding } from '@/types/models';
import type { UpdateWeddingConfigRequest } from '@/types/api';

interface WeddingWithStats extends Wedding {
  guest_count: number;
  rsvp_count: number;
  rsvp_completion_percentage: number;
  attending_count: number;
  payment_received_count: number;
  planner_name: string;
  admin_count: number;
}

export default function ConfigureWeddingPage() {
  const router = useRouter();
  const [wedding, setWedding] = useState<WeddingWithStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetchWedding();
  }, []);

  const fetchWedding = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/wedding');
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to fetch wedding details');
      }

      setWedding(data.data);
    } catch (err) {
      console.error('Error fetching wedding:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch wedding details');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: UpdateWeddingConfigRequest) => {
    try {
      const response = await fetch('/api/admin/wedding', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to save configuration');
      }

      // Update local state with new data
      setWedding((prev) => (prev ? { ...prev, ...result.data } : null));
      setSaveSuccess(true);

      // Hide success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving configuration:', err);
      throw err;
    }
  };

  const handleCancel = () => {
    router.push('/admin');
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-48"></div>
              <div className="mt-2 h-4 bg-gray-200 rounded w-64"></div>
            </div>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !wedding) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900">
            {error || 'Wedding not found'}
          </h1>
          <p className="mt-2 text-gray-500">Please contact your wedding planner.</p>
          <Link
            href="/admin"
            className="mt-4 inline-block px-4 py-2 text-sm font-medium text-purple-600 hover:text-purple-700"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <Link
                  href="/admin"
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">Configure Wedding</h1>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {wedding.couple_names} • {formatDate(wedding.wedding_date)}
              </p>
            </div>
            {saveSuccess && (
              <div className="bg-green-50 text-green-700 px-4 py-2 rounded-md text-sm font-medium">
                Configuration saved successfully!
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <WeddingConfigForm
          wedding={wedding}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </main>
    </div>
  );
}
