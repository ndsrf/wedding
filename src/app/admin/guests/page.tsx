/**
 * Wedding Admin - Guest Management Page
 *
 * Page for managing guests with table, filters, and import/export
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { GuestTable } from '@/src/components/admin/GuestTable';
import { GuestFilters } from '@/src/components/admin/GuestFilters';
import { GuestAdditionsReview } from '@/src/components/admin/GuestAdditionsReview';
import type { FamilyWithMembers, GiftStatus } from '@/src/types/models';

interface GuestWithStatus extends FamilyWithMembers {
  rsvp_status: string;
  attending_count: number;
  total_members: number;
  payment_status: GiftStatus | null;
}

interface GuestAddition {
  id: string;
  family_id: string;
  name: string;
  type: 'ADULT' | 'CHILD' | 'INFANT';
  attending: boolean | null;
  age: number | null;
  dietary_restrictions: string | null;
  accessibility_needs: string | null;
  added_by_guest: boolean;
  created_at: Date;
  family_name: string;
  is_new: boolean;
}

interface Filters {
  rsvp_status?: string;
  attendance?: string;
  channel?: string;
  payment_status?: string;
  search?: string;
}

export default function GuestsPage() {
  const [guests, setGuests] = useState<GuestWithStatus[]>([]);
  const [guestAdditions, setGuestAdditions] = useState<GuestAddition[]>([]);
  const [guestAdditionsEnabled, setGuestAdditionsEnabled] = useState(false);
  const [filters, setFilters] = useState<Filters>({});
  const [loading, setLoading] = useState(true);
  const [additionsLoading, setAdditionsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState<'guests' | 'additions'>('guests');

  const fetchGuests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      if (filters.rsvp_status) params.set('rsvp_status', filters.rsvp_status);
      if (filters.attendance) params.set('attendance', filters.attendance);
      if (filters.channel) params.set('channel', filters.channel);
      if (filters.payment_status) params.set('payment_status', filters.payment_status);
      if (filters.search) params.set('search', filters.search);

      const response = await fetch(`/api/admin/guests?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setGuests(data.data.items);
        setTotalPages(data.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error fetching guests:', error);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  const fetchGuestAdditions = useCallback(async () => {
    setAdditionsLoading(true);
    try {
      const response = await fetch('/api/admin/guest-additions');
      const data = await response.json();

      if (data.success) {
        setGuestAdditions(data.data);
        setGuestAdditionsEnabled(data.meta?.feature_enabled ?? true);
      }
    } catch (error) {
      console.error('Error fetching guest additions:', error);
    } finally {
      setAdditionsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGuests();
  }, [fetchGuests]);

  useEffect(() => {
    fetchGuestAdditions();
  }, [fetchGuestAdditions]);

  const handleExport = async () => {
    try {
      const response = await fetch('/api/admin/guests/export');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `guests-${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting guests:', error);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/admin/guests/template');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'guest-import-template.xlsx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading template:', error);
    }
  };

  const handleMarkAdditionReviewed = async (memberId: string) => {
    try {
      await fetch(`/api/admin/guest-additions/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mark_reviewed: true }),
      });
      fetchGuestAdditions();
    } catch (error) {
      console.error('Error marking addition reviewed:', error);
    }
  };

  const newAdditionsCount = guestAdditions.filter((a) => a.is_new).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link href="/admin" className="text-gray-500 hover:text-gray-700 mr-4">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Guest Management</h1>
                <p className="mt-1 text-sm text-gray-500">
                  {guests.length} guests • Page {page} of {totalPages}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDownloadTemplate}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Template
              </button>
              <button
                onClick={handleExport}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Export
              </button>
              <label className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 cursor-pointer">
                Import
                <input
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    const formData = new FormData();
                    formData.append('file', file);

                    try {
                      const response = await fetch('/api/admin/guests/import', {
                        method: 'POST',
                        body: formData,
                      });
                      const data = await response.json();
                      if (data.success) {
                        alert(`Imported successfully! ${data.data.familiesCreated} families created.`);
                        fetchGuests();
                      } else {
                        alert(`Import failed: ${data.error?.message || 'Unknown error'}`);
                      }
                    } catch (error) {
                      console.error('Import error:', error);
                      alert('Import failed. Please try again.');
                    }
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('guests')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'guests'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Guest List
            </button>
            <button
              onClick={() => setActiveTab('additions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === 'additions'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Guest Additions
              {newAdditionsCount > 0 && (
                <span className="ml-2 bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-xs">
                  {newAdditionsCount}
                </span>
              )}
            </button>
          </nav>
        </div>

        {activeTab === 'guests' ? (
          <>
            {/* Filters */}
            <GuestFilters filters={filters} onFilterChange={setFilters} />

            {/* Guest Table */}
            <GuestTable guests={guests} loading={loading} />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex justify-center">
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            )}
          </>
        ) : (
          <GuestAdditionsReview
            additions={guestAdditions}
            featureEnabled={guestAdditionsEnabled}
            onMarkReviewed={handleMarkAdditionReviewed}
            loading={additionsLoading}
          />
        )}
      </main>
    </div>
  );
}
