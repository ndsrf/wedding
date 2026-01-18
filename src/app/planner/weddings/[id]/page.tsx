/**
 * Wedding Planner - Wedding Detail Page
 *
 * Page for viewing a specific wedding's details and managing admins
 * Shows guest count, RSVP status, and wedding admin list
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AdminInviteForm } from '@/components/planner/AdminInviteForm';
import type { WeddingWithStats } from '@/types/models';
import type { WeddingAdmin } from '@prisma/client';

interface WeddingDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function WeddingDetailPage({ params }: WeddingDetailPageProps) {
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [wedding, setWedding] = useState<(WeddingWithStats & { wedding_admins?: WeddingAdmin[] }) | null>(null);
  const [admins, setAdmins] = useState<WeddingAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);

  useEffect(() => {
    params.then(({ id }) => {
      setWeddingId(id);
    });
  }, [params]);

  const fetchWeddingDetails = useCallback(async () => {
    if (!weddingId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/planner/weddings/${weddingId}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError('Wedding not found');
        } else {
          throw new Error('Failed to fetch wedding details');
        }
        return;
      }

      const data = await response.json();
      setWedding(data.data);

      // Fetch admins separately (if wedding has wedding_admins relation)
      // For now, we'll set it to empty array as the API might not return it
      setAdmins([]);
    } catch (err) {
      setError('Failed to load wedding details');
      console.error('Error fetching wedding:', err);
    } finally {
      setLoading(false);
    }
  }, [weddingId]);

  useEffect(() => {
    if (weddingId) {
      fetchWeddingDetails();
    }
  }, [weddingId, fetchWeddingDetails]);

  const handleInviteAdmin = async (formData: { name: string; email: string }) => {
    if (!weddingId) return;

    try {
      const response = await fetch(`/api/planner/weddings/${weddingId}/admins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to invite admin');
      }

      const data = await response.json();
      setAdmins([...admins, data.data]);
      setShowInviteForm(false);
    } catch (err) {
      console.error('Error inviting admin:', err);
      throw err;
    }
  };

  const handleRemoveAdmin = async (adminId: string) => {
    if (!weddingId) return;

    if (!confirm('Are you sure you want to remove this admin?')) {
      return;
    }

    try {
      const response = await fetch(`/api/planner/weddings/${weddingId}/admins?admin_id=${adminId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to remove admin');
      }

      setAdmins(admins.filter((admin) => admin.id !== adminId));
    } catch (err) {
      console.error('Error removing admin:', err);
      alert('Failed to remove admin');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-sm text-gray-500">Loading wedding details...</p>
        </div>
      </div>
    );
  }

  if (error || !wedding) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">{error || 'Wedding not found'}</h2>
          <Link
            href="/planner/weddings"
            className="mt-4 inline-block text-blue-600 hover:text-blue-700"
          >
            Back to weddings
          </Link>
        </div>
      </div>
    );
  }

  const weddingDate = new Date(wedding.wedding_date);
  const formattedDate = weddingDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 text-sm text-gray-500 mb-1">
                <Link href="/planner" className="hover:text-gray-700">
                  Dashboard
                </Link>
                <span>/</span>
                <Link href="/planner/weddings" className="hover:text-gray-700">
                  Weddings
                </Link>
                <span>/</span>
                <span>{wedding.couple_names}</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{wedding.couple_names}</h1>
              <p className="mt-1 text-sm text-gray-500">
                {formattedDate} at {wedding.wedding_time} • {wedding.location}
              </p>
            </div>
            <Link
              href={`/planner/weddings/${weddingId}/edit`}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Edit Wedding
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-sm text-gray-500 mb-1">Total Guests</p>
            <p className="text-3xl font-bold text-gray-900">{wedding.guest_count}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-sm text-gray-500 mb-1">RSVP Completion</p>
            <p className="text-3xl font-bold text-gray-900">{wedding.rsvp_completion_percentage}%</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-sm text-gray-500 mb-1">Attending</p>
            <p className="text-3xl font-bold text-gray-900">{wedding.attending_count}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <p className="text-sm text-gray-500 mb-1">Payments Received</p>
            <p className="text-3xl font-bold text-gray-900">{wedding.payment_received_count}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Wedding Information */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Wedding Information</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1 text-sm text-gray-900">{wedding.status}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Default Language</dt>
                <dd className="mt-1 text-sm text-gray-900">{wedding.default_language}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Payment Mode</dt>
                <dd className="mt-1 text-sm text-gray-900">{wedding.payment_tracking_mode}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">RSVP Cutoff Date</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(wedding.rsvp_cutoff_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Guest Additions</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {wedding.allow_guest_additions ? 'Allowed' : 'Not allowed'}
                </dd>
              </div>
              {wedding.dress_code && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Dress Code</dt>
                  <dd className="mt-1 text-sm text-gray-900">{wedding.dress_code}</dd>
                </div>
              )}
              {wedding.additional_info && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Additional Information</dt>
                  <dd className="mt-1 text-sm text-gray-900">{wedding.additional_info}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Wedding Admins */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Wedding Admins</h2>
              <button
                onClick={() => setShowInviteForm(true)}
                className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Invite Admin
              </button>
            </div>

            {admins.length === 0 ? (
              <p className="text-sm text-gray-500">No admins invited yet</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {admins.map((admin) => (
                  <li key={admin.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{admin.name}</p>
                      <p className="text-sm text-gray-500">{admin.email}</p>
                      {admin.accepted_at ? (
                        <p className="text-xs text-green-600 mt-1">Accepted</p>
                      ) : (
                        <p className="text-xs text-gray-500 mt-1">Invitation pending</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveAdmin(admin.id)}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>

      {/* Invite Admin Modal */}
      {showInviteForm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Invite Wedding Admin</h2>
            <AdminInviteForm
              onSubmit={handleInviteAdmin}
              onCancel={() => setShowInviteForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
